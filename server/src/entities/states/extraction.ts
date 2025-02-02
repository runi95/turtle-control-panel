import {getBlocksWithNameLike} from '../../db';
import {Block} from '../../db/block.type';
import {Location} from '../../db/turtle.type';
import {DestinationError} from '../../dlite/index';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';
import {
    geoScannerCooldown,
    universalScannerCooldown,
    useBlockScanner,
    useGeoScanner,
    useUniversalScanner,
} from './scan';

export interface ExtractionStateData {
    readonly id: TURTLE_STATES;
    readonly area: Location[];
    readonly isExcludeMode: boolean;
    readonly includeOrExcludeList: string[];
}

export class TurtleExtractionState extends TurtleBaseState<ExtractionStateData> {
    public readonly name = 'mining (extract all ores)';
    public data: ExtractionStateData;

    private readonly mineableBlockMap = new Map<string, boolean>();
    private readonly mineableBlockIncludeOrExcludeMap = new Map<string, boolean>();
    private readonly hasExclusions: boolean;
    private readonly isInExcludeMode: boolean;
    private hasGeoScanner: boolean = false;
    private hasUniversalScanner: boolean = false;
    private hasBlockScanner: boolean = false;
    private area: Location[];
    private remainingAreaIndexes: number[] = [];
    private scanIndexes: number[] | null = null;

    constructor(turtle: Turtle, data: Omit<ExtractionStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.EXTRACTION,
        };

        const {isExcludeMode, includeOrExcludeList, area} = this.data;
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
    }

    private getBoundingBox(areaIndexes: number[]) {
        return areaIndexes.reduce(
            (acc, i) => {
                const {x, y, z} = this.area[i];
                if (x < acc.minX) {
                    acc.minX = x;
                }
                if (x > acc.maxX) {
                    acc.maxX = x;
                }

                if (y < acc.minY) {
                    acc.minY = y;
                }
                if (y > acc.maxY) {
                    acc.maxY = y;
                }

                if (z < acc.minZ) {
                    acc.minZ = z;
                }
                if (z > acc.maxZ) {
                    acc.maxZ = z;
                }

                return acc;
            },
            {
                minX: Number.MAX_SAFE_INTEGER,
                minY: Number.MAX_SAFE_INTEGER,
                minZ: Number.MAX_SAFE_INTEGER,
                maxX: Number.MIN_SAFE_INTEGER,
                maxY: Number.MIN_SAFE_INTEGER,
                maxZ: Number.MIN_SAFE_INTEGER,
            }
        );
    }

    private findBestScanIndex(remainingScanAreaIndexes: number[], scanRadius: number = 16) {
        const {minX, minY, minZ, maxX, maxY, maxZ} = this.getBoundingBox(remainingScanAreaIndexes);
        const borderLocationIndexes = remainingScanAreaIndexes.filter((i) => {
            const {x, y, z} = this.area[i];
            return x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ;
        });

        let bestIndex: number | null = null;
        let bestBorderCount: number | null = null;
        for (const i of remainingScanAreaIndexes) {
            const {x, y, z} = this.area[i];
            const borderCount = borderLocationIndexes.reduce((acc, borderIndex) => {
                const {x: borderX, y: borderY, z: borderZ} = this.area[borderIndex];
                if (Math.abs(x - borderX) > scanRadius) return acc;
                if (Math.abs(y - borderY) > scanRadius) return acc;
                if (Math.abs(z - borderZ) > scanRadius) return acc;
                return acc + 1;
            });

            if (bestBorderCount == null || bestBorderCount < borderCount) {
                bestIndex = i;
                bestBorderCount = borderCount;
            }
        }

        return bestIndex;
    }

    private async initializeScanIndexes() {
        this.scanIndexes = [];

        let remainingScanAreaIndexes = this.area.map((_, i) => i);
        const {minX, minY, minZ, maxX, maxY, maxZ} = this.getBoundingBox(remainingScanAreaIndexes);
        const blocks = getBlocksWithNameLike(this.turtle.serverId, {
            fromX: minX,
            fromY: minY,
            fromZ: minZ,
            toX: maxX,
            toY: maxY,
            toZ: maxZ,
            name: '%_ore',
        });

        const areaMap = new Map<string, number>();
        for (let i = 0; i < this.area.length; i++) {
            const {x, y, z} = this.area[i];
            areaMap.set(`${x},${y},${z}`, i);
        }

        for (const {x, y, z} of blocks) {
            const areaIndex = areaMap.get(`${x},${y},${z}`);
            if (areaIndex != null) {
                this.remainingAreaIndexes.push(areaIndex);
            }
        }

        const hasScanner = await this.getScanners();
        if (!hasScanner) return;

        let scanRadius = 16;
        if (this.hasBlockScanner) {
            scanRadius = 8;
        }

        while (remainingScanAreaIndexes.length > 0) {
            const scanIndex = this.findBestScanIndex(remainingScanAreaIndexes, scanRadius);
            if (scanIndex == null) break;

            this.scanIndexes.push(scanIndex);
            const {x: borderX, y: borderY, z: borderZ} = this.area[scanIndex];
            remainingScanAreaIndexes = remainingScanAreaIndexes.filter((i) => {
                const {x, y, z} = this.area[i];
                return (
                    Math.abs(x - borderX) > scanRadius ||
                    Math.abs(y - borderY) > scanRadius ||
                    Math.abs(z - borderZ) > scanRadius
                );
            });
        }
    }

    private async getScanners(): Promise<boolean> {
        const [hasGeoScanner] = await this.turtle.hasPeripheralWithName('geoScanner');
        if (hasGeoScanner) {
            this.hasGeoScanner = true;
            return true;
        }

        const [hasUniversalScanner] = await this.turtle.hasPeripheralWithName('universal_scanner');
        if (hasUniversalScanner) {
            this.hasUniversalScanner = true;
            return true;
        }

        const [hasBlockScanner] = await this.turtle.hasPeripheralWithName('plethora:scanner');
        if (hasBlockScanner) {
            this.hasBlockScanner = true;
            return true;
        }

        return false;
    }

    private async scan(): Promise<(Block & Location)[]> {
        if (this.hasGeoScanner) {
            return await useGeoScanner(this.turtle);
        }

        if (this.hasUniversalScanner) {
            return await useUniversalScanner(this.turtle);
        }

        if (this.hasBlockScanner) {
            return await useBlockScanner(this.turtle);
        }

        return [];
    }

    public async *act() {
        while (true) {
            if (this.scanIndexes == null) {
                await this.initializeScanIndexes();
                continue;
            }

            if (this.scanIndexes.length === 0 && this.remainingAreaIndexes.length === 0) return; // Done!

            if (this.turtle.location === null) {
                throw new Error('Unable to mine without knowing turtle location');
            }

            if (this.turtle.selectedSlot !== 1) {
                await this.turtle.select(1); // Ensures proper item stacking
                yield;
            }

            const {x, y, z} = this.turtle.location;
            const matchingScanIndex = this.scanIndexes.findIndex((scanIndex) => {
                const area = this.area[scanIndex];
                return area.x === x && area.y === y && area.z === z;
            });
            if (matchingScanIndex > -1) {
                this.scanIndexes.splice(matchingScanIndex, 1);

                const hasScanner = await this.getScanners();
                if (!hasScanner) {
                    throw new Error('No Scanner to scan with');
                }

                yield;

                if (this.hasGeoScanner) {
                    yield* geoScannerCooldown(this.turtle);
                } else if (this.hasUniversalScanner) {
                    yield* universalScannerCooldown(this.turtle);
                }

                const scannedBlocks = await this.scan();
                yield;

                const {x, y, z} = this.turtle.location;
                const blocks = scannedBlocks
                    .filter(
                        ({name, x, y, z}) =>
                            x !== 0 &&
                            y !== 0 &&
                            z !== 0 &&
                            name !== 'minecraft:air' &&
                            name !== 'minecraft:water' &&
                            name !== 'minecraft:lava'
                    )
                    .map((scannedBlock) => ({
                        ...scannedBlock,
                        x: scannedBlock.x + x,
                        y: scannedBlock.y + y,
                        z: scannedBlock.z + z,
                    }));

                yield;

                for (const block of blocks) {
                    if (this.isInExcludeMode) {
                        if (!block.name.endsWith('_ore')) continue;
                        if (this.hasExclusions && !!this.mineableBlockIncludeOrExcludeMap.get(block.name)) continue;
                    } else if (!this.mineableBlockIncludeOrExcludeMap.get(block.name)) continue;

                    const areaIndex = this.area.findIndex(
                        ({x, y, z}) => block.x === x && block.y === y && block.z === z
                    );
                    if (areaIndex > -1 && !this.remainingAreaIndexes.includes(areaIndex)) {
                        this.remainingAreaIndexes.push(areaIndex);
                    }
                }
            }

            // Extract scanned ores
            const areaIndexOfTurtle = this.remainingAreaIndexes.findIndex(
                (i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z
            );
            if (areaIndexOfTurtle > -1) {
                this.remainingAreaIndexes.splice(areaIndexOfTurtle, 1);
            }

            try {
                for await (const _ of this.goToDestinations(
                    this.remainingAreaIndexes
                        .map((i) => this.area[i])
                        .concat(this.scanIndexes.map((i) => this.area[i])),
                    {
                        isBlockMineableFunc: (x, y, z, _block) => !!this.mineableBlockMap.get(`${x},${y},${z}`),
                    }
                )) {
                    yield;

                    // Go home?
                    const hasAvailableSpaceInInventory = Object.values(this.turtle.inventory).some(
                        (value) => value == null
                    );
                    const fuelPercentage = (100 * this.turtle.fuelLevel) / this.turtle.fuelLimit;
                    if (fuelPercentage < 10 || !hasAvailableSpaceInInventory) {
                        const home = this.turtle.home;
                        if (home === null) {
                            throw new Error('Inventory is full');
                        }

                        try {
                            for await (const _ of this.goToDestinations([new Point(home.x, home.y, home.z)])) {
                                yield;
                            }
                        } catch (err) {
                            if (err instanceof DestinationError && err.message === 'Movement obstructed') {
                                yield;
                                continue;
                            } else if (typeof err === 'string') {
                                throw new Error(err);
                            } else {
                                throw err;
                            }
                        }

                        // Ensures we have access to peripherals
                        await this.turtle.sleep(1);
                        yield;

                        for await (const _ of this.transferIntoNearbyInventories()) {
                            yield;
                        }

                        if ((100 * this.turtle.fuelLevel) / this.turtle.fuelLimit < 10) {
                            for await (const _ of this.refuelFromNearbyInventories()) {
                                yield;
                            }
                        }
                    }
                }
            } catch (err) {
                if (
                    err instanceof DestinationError &&
                    (err.message === 'Movement obstructed' || err.message === 'Cannot break unbreakable block')
                ) {
                    const {x, y, z} = err.node.point;
                    const areaIndexOfNode = this.remainingAreaIndexes.findIndex(
                        (i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z
                    );
                    if (areaIndexOfNode > -1) {
                        this.remainingAreaIndexes.splice(areaIndexOfNode, 1);
                    } else {
                        const scanIndexOfNode = this.scanIndexes.findIndex(
                            (i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z
                        );
                        if (scanIndexOfNode > -1) {
                            this.scanIndexes.splice(scanIndexOfNode, 1);
                        }
                    }

                    yield;
                    continue;
                } else if (typeof err === 'string') {
                    throw new Error(err);
                } else {
                    throw err;
                }
            }
        }
    }
}
