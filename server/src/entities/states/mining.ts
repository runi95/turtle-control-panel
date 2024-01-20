import {Direction, Location} from '../../db/turtle.type';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {DestinationError, TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface MiningStateData {
    readonly id: TURTLE_STATES;
    readonly area: Omit<Location, 'y'>[];
    readonly fromYLevel: number;
    readonly toYLevel: number;
    readonly isExcludeMode: boolean;
    readonly includeOrExcludeList: string[];
}
export class TurtleMiningState extends TurtleBaseState<MiningStateData> {
    public readonly name = 'mining';
    public data: MiningStateData;
    public warning: string | null = null;

    private readonly mineableBlockMap = new Map<string, boolean>();
    private readonly mineableBlockIncludeOrExcludeMap = new Map<string, boolean>();
    private readonly hasExclusions: boolean;
    private readonly isInExcludeMode: boolean;
    private isInOrAdjacentToMiningArea: boolean = false;
    private area: Location[];
    private remainingAreaIndexes: number[] = [];

    constructor(turtle: Turtle, data: Omit<MiningStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.MINING
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
        this.remainingAreaIndexes = Array.from(Array(this.area.length).keys());

        for (const loc of this.area) {
            this.mineableBlockMap.set(`${loc.x},${loc.y},${loc.z}`, true);
        }

        this.isInExcludeMode = isExcludeMode;
        this.hasExclusions = this.isInExcludeMode && includeOrExcludeList.length > 0;
        for (const includeOrExclude of includeOrExcludeList) {
            this.mineableBlockIncludeOrExcludeMap.set(includeOrExclude, true);
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
        })
    }

    public async *act() {
        while (true) {
            if (this.turtle.location === null) {
                throw new Error('Unable to mine without knowing turtle location');
            }
    
            if (this.turtle.selectedSlot !== 1) {
                await this.turtle.select(1); // Ensures proper item stacking
                yield;
            }
    
            if (this.remainingAreaIndexes.length === 0) {
                return; // Done!
            }
    
            // Get to the mining area!
            if (!this.isInOrAdjacentToMiningArea) {
                if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                    this.isInOrAdjacentToMiningArea = true;
                    yield;
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
                    if (err instanceof DestinationError && err.message === 'Movement obstructed') {
                        yield;
                        continue;
                    } else if (typeof err === 'string') {
                        throw new Error(err);
                    } else {
                        throw err;
                    }
                }
            }
    
            const {x, y, z} = this.turtle.location;
            const areaIndexOfTurtle = this.remainingAreaIndexes.findIndex((i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z);
            if (areaIndexOfTurtle > -1) {
                this.remainingAreaIndexes.splice(areaIndexOfTurtle, 1);
            }
    
            try {
                // Mine!
                for await (const _ of this.goToDestinations(this.remainingAreaIndexes.map((i) => this.area[i]), (x, y, z, block) => {
                    const isInArea = !!this.mineableBlockMap.get(`${x},${y},${z}`);
                    if (!isInArea) return false;

                    if (this.isInExcludeMode) {
                        if (!this.hasExclusions) return true;
                        if (block === null) return false;
                        return !this.mineableBlockIncludeOrExcludeMap.get(block.name);
                    } else {
                        if (block === null) return false;
                        return !!this.mineableBlockIncludeOrExcludeMap.get(block.name);
                    }
                })) {
                    yield;

                    // Go home?
                    const hasAvailableSpaceInInventory = Object.values(this.turtle.inventory).some((value) => value == null);
                    const fuelPercentage = 100 * this.turtle.fuelLevel / this.turtle.fuelLimit;
                    if (fuelPercentage < 10 || !hasAvailableSpaceInInventory) {
                        const home = this.turtle.home;
                        if (home === null) {
                            throw new Error('Inventory is full');
                        }

                        this.isInOrAdjacentToMiningArea = false;

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

                        if ((100 * this.turtle.fuelLevel / this.turtle.fuelLimit) < 10) {
                            for await (const _ of this.refuelFromNearbyInventories()) {
                                yield;
                            }
                        }
                    }
                }
            } catch (err) {
                if (err instanceof DestinationError && (err.message === 'Movement obstructed' || err.message === 'Cannot break unbreakable block')) {
                    const {x, y, z} = err.node.point;
                    const obstructedAreaIndex = this.remainingAreaIndexes.findIndex((i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z);
                    if (obstructedAreaIndex > -1) {
                        this.remainingAreaIndexes.splice(areaIndexOfTurtle, 1);
                    }

                    yield;
                    continue;
                } else if (typeof err === "string") {
                    throw new Error(err);
                } else {
                    throw err;
                }
            }
        }
    }
}
