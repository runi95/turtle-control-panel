import {upsertBlocks} from '../../db';
import {Block} from '../../db/block.type';
import {Direction, Location} from '../../db/turtle.type';
import {Node} from '../../dlite/Node';
import globalEventEmitter from '../../globalEventEmitter';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface ExtractionStateData {
    readonly id: TURTLE_STATES;
    readonly area: Omit<Location, 'y'>[];
    readonly fromYLevel: number;
    readonly toYLevel: number;
    readonly isExcludeMode: boolean;
    readonly includeOrExcludeList: string[];
}

export class TurtleExtractionState extends TurtleBaseState<ExtractionStateData> {
    public readonly name = 'mining (extract all ores)';
    public data: ExtractionStateData;
    public warning: string | null = null;

    private readonly mineableBlockMap = new Map<string, boolean>();
    private readonly mineableBlockIncludeOrExcludeMap = new Map<string, boolean>();
    private readonly hasExclusions: boolean;
    private readonly isInExcludeMode: boolean;
    private isInOrAdjacentToMiningArea: boolean = false;
    private area: Location[];
    private remainingAreaIndexes: number[] = [];
    private chunkAnalysis = new Map<string, {[key: string]: number}>();
    private scanIndexes: number[] = [];

    constructor(turtle: Turtle, data: Omit<ExtractionStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.EXTRACTION,
        };

        const area: Location[] = [];
        const {fromYLevel, toYLevel, isExcludeMode, includeOrExcludeList} = this.data;
        const from = Math.min(fromYLevel, toYLevel);
        const to = Math.max(fromYLevel, toYLevel);
        for (const loc of this.data.area) {
            for (let i = from; i <= to; i++) {
                area.push({
                    x: loc.x,
                    y: i,
                    z: loc.z,
                });
            }
        }
        this.area = area;
        this.remainingAreaIndexes = [];

        for (const loc of this.area) {
            this.mineableBlockMap.set(`${loc.x},${loc.y},${loc.z}`, true);
        }

        this.isInExcludeMode = isExcludeMode;
        this.hasExclusions = this.isInExcludeMode && includeOrExcludeList.length > 0;
        for (const includeOrExclude of includeOrExcludeList) {
            this.mineableBlockIncludeOrExcludeMap.set(includeOrExclude, true);
        }

        const locationsToScan = Array.from(this.data.area.keys());
        while (locationsToScan.length > 0) {
            const minX = locationsToScan.reduce(
                (acc, curr) => (this.data.area[curr].x < acc.x ? this.data.area[curr] : acc),
                this.data.area[locationsToScan[0]]
            );
            const locationIndexToCount = new Map<number, number[]>();
            let bestLocationIndex: number = 0;
            for (let i = 0; i < locationsToScan.length; i++) {
                const loc = this.data.area[locationsToScan[i]];
                const dist = Math.sqrt(Math.pow(loc.x - minX.x, 2) + Math.pow(loc.z - minX.z, 2));
                const locationsWithinRange: number[] = [];
                if (!(dist > 15)) {
                    for (let j = i + locationsToScan.length - 1; j > i; j--) {
                        const loc2 = this.data.area[locationsToScan[j % locationsToScan.length]];
                        const dist2 = Math.sqrt(Math.pow(loc2.x - minX.x, 2) + Math.pow(loc2.z - minX.z, 2));
                        if (!(dist2 > 15)) {
                            locationsWithinRange.push(j);
                        }
                    }
                }

                const prevCount = locationIndexToCount.get(bestLocationIndex);
                locationsWithinRange.push(i);
                if (!prevCount || locationsWithinRange.length > prevCount.length) {
                    bestLocationIndex = i;
                }
                locationIndexToCount.set(i, locationsWithinRange);
            }

            const yDiff = to - from;
            if (yDiff < 16) {
                this.scanIndexes.push(locationsToScan[bestLocationIndex]);
            } else if (yDiff < 30) {
                this.scanIndexes.push(16 + locationsToScan[bestLocationIndex] * yDiff);
            } else {
                for (let i = yDiff - 15; i > 0; i -= 30) {
                    this.scanIndexes.push(i + 1 + locationsToScan[bestLocationIndex] * yDiff);
                }
            }

            const locationsToRemove = locationIndexToCount.get(bestLocationIndex) as number[];
            for (const locationToRemove of locationsToRemove) {
                locationsToScan.splice(locationToRemove, 1);
            }
        }
    }

    private checkIfTurtleIsInOrAdjacentToArea(): boolean {
        const {x, y, z} = this.turtle.location as Location;
        return this.area.some(({x: areaX, y: areaY, z: areaZ}) => {
            if (areaX === x && areaY === y && areaZ === z) return true;
            if ((areaX === x + 1 || areaX === x - 1) && areaY === y && areaZ === z) return true;
            if (areaX === x && (areaY === y + 1 || areaY === y - 1) && areaZ === z) return true;
            if (areaX === x && areaY === y && (areaZ === z + 1 || areaZ === z - 1)) return true;
            return false;
        });
    }

    public async *act() {
        while (true) {
            if (this.scanIndexes.length === 0 && this.remainingAreaIndexes.length === 0) return; // Done!

            if (this.turtle.location === null) {
                throw new Error('Unable to mine without knowing turtle location');
            }

            if (this.turtle.selectedSlot !== 1) {
                await this.turtle.select(1); // Ensures proper item stacking
                yield;
            }

            // Get to the extraction area!
            if (!this.isInOrAdjacentToMiningArea) {
                if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                    this.isInOrAdjacentToMiningArea = true;
                    continue;
                }

                try {
                    for await (const _ of this.goToDestinations(this.area)) {
                        yield;

                        if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                            this.isInOrAdjacentToMiningArea = true;
                            break;
                        }
                    }
                } catch (err) {
                    if ((err as Error).message === 'Movement obstructed') {
                        yield;
                        continue;
                    }

                    if (typeof err === 'string') {
                        throw new Error(err);
                    } else {
                        throw err;
                    }
                }
            }

            // Extract scanned ores
            if (this.remainingAreaIndexes.length > 0) {
                const {x, y, z} = this.turtle.location;
                const areaIndexOfTurtle = this.remainingAreaIndexes.findIndex(
                    (i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z
                );
                if (areaIndexOfTurtle > -1) {
                    this.remainingAreaIndexes.splice(areaIndexOfTurtle, 1);
                }

                try {
                    for await (const _ of this.goToDestinations(
                        this.remainingAreaIndexes.map((i) => this.area[i]),
                        (x, y, z, _block) => !!this.mineableBlockMap.get(`${x},${y},${z}`)
                    )) {
                        yield;

                        if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                            this.isInOrAdjacentToMiningArea = true;
                            break;
                        }
                    }
                } catch (err) {
                    if ((err as Error).message === 'Movement obstructed') {
                        yield;
                        continue;
                    } else if (err === 'Cannot break unbreakable block') {
                        const {x, y, z} = this.turtle.location;
                        let dx = 0;
                        let dz = 0;
                        switch (this.turtle.direction) {
                            case Direction.West:
                                dx--
                                break;
                            case Direction.North:
                                dz--;
                                break;
                            case Direction.East:
                                dx++;
                                break;
                            case Direction.South:
                                dz++;
                                break;
                        }

                        const areaIndexOfNode = this.remainingAreaIndexes.findIndex(
                            (i) =>
                                this.area[i].x === (x + dx) &&
                                this.area[i].y === y &&
                                this.area[i].z === (z + dz)
                        );
                        if (areaIndexOfNode > -1) {
                            this.remainingAreaIndexes.splice(areaIndexOfNode, 1);
                        }

                        break;
                    }

                    if (typeof err === 'string') {
                        throw new Error(err);
                    } else {
                        throw err;
                    }
                }

                continue;
            }

            // Scan unscanned blocks within the extraction area
            if (this.scanIndexes.length > 0) {
                const [hasGeoScanner] = await this.turtle.hasPeripheralWithName('geoScanner');
                if (!hasGeoScanner) {
                    throw new Error('No Geo Scanner to scan with (requires Advanced Peripherals mod)');
                }

                yield;

                try {
                    for await (const _ of this.goToDestinations(
                        this.scanIndexes.map((scanIndex) => this.area[scanIndex]),
                        (x, y, z, _block) => !!this.mineableBlockMap.get(`${x},${y},${z}`)
                    )) {
                        yield;

                        const {x, y, z} = this.turtle.location;
                        const matchingScanIndex = this.scanIndexes.findIndex((scanIndex) => {
                            const area = this.area[scanIndex];
                            return area.x === x && area.y === y && area.z === z;
                        });
                        if (matchingScanIndex > -1) {
                            this.scanIndexes.splice(matchingScanIndex, 1);
                        }
                    }
                } catch (err) {
                    if ((err as Error).message === 'Movement obstructed') {
                        yield;
                        continue;
                    }

                    if (typeof err === 'string') {
                        throw new Error(err);
                    } else {
                        throw err;
                    }
                }

                const [scannedBlocks, scanMessage] = await this.turtle.usePeripheralWithName<
                    [(Block & {x: number; y: number; z: number})[], string]
                >('geoScanner', 'scan', '16');
                if (scannedBlocks === null) {
                    throw new Error(scanMessage);
                }

                const {x, y, z} = this.turtle.location;
                const blocks = scannedBlocks
                    .filter((scannedBlock) => scannedBlock.x !== 0 || scannedBlock.y !== 0 || scannedBlock.z !== 0)
                    .map((scannedBlock) => ({
                        ...scannedBlock,
                        x: scannedBlock.x + x,
                        y: scannedBlock.y + y,
                        z: scannedBlock.z + z,
                    }));
                upsertBlocks(this.turtle.serverId, blocks);
                globalEventEmitter.emit('wupdate', {
                    serverId: this.turtle.serverId,
                    blocks,
                });

                yield;

                const [analysis, analysisFailMessage] = await this.turtle.usePeripheralWithName<
                    [{[key: string]: number}, undefined] | [null, string]
                >('geoScanner', 'chunkAnalyze');
                if (analysis === null) {
                    throw new Error(analysisFailMessage);
                }

                const {chunk} = this.turtle;
                if (chunk === null) throw new Error('Unknown turtle location');

                const [chunkX, chunkY] = chunk;
                this.chunkAnalysis.set(`${chunkX},${chunkY}`, analysis);

                yield;

                const allAnalysisValues = new Set<string>();
                Array.from(this.chunkAnalysis.values()).forEach((v) => {
                    Object.keys(v).forEach((key) => {
                        allAnalysisValues.add(key);
                    });
                });

                this.remainingAreaIndexes = blocks.reduce((acc, curr) => {
                    if (!allAnalysisValues.has(curr.name)) return acc;
                    if (this.isInExcludeMode) {
                        if (this.hasExclusions && !!this.mineableBlockIncludeOrExcludeMap.get(curr.name)) return acc;
                    } else if (!this.mineableBlockIncludeOrExcludeMap.get(curr.name)) return acc;

                    const areaIndex = this.area.findIndex(({x, y, z}) => curr.x === x && curr.y === y && curr.z === z);
                    if (areaIndex > -1) {
                        acc.push(areaIndex);
                    }

                    return acc;
                }, [] as number[]);

                continue;
            }
        }
    }
}
