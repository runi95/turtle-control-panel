import {Direction, Location} from '../../db/turtle.type';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {DestinationError, TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface BuildStateData {
    readonly id: TURTLE_STATES;
    readonly area: Omit<Location, 'y'>[];
    readonly fromYLevel: number;
    readonly toYLevel: number;
    readonly buildingBlockName: string;
}
export class TurtleBuildingState extends TurtleBaseState<BuildStateData> {
    public readonly name = 'building';
    public data: BuildStateData;
    public warning: string | null = null;

    private isInOrAdjacentToBuildingArea: boolean = false;
    private area: Location[];
    private remainingAreaIndexes: number[] = [];
    private currentYLayer: number = 0;

    constructor(turtle: Turtle, data: Omit<BuildStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.BUILDING
        };

        const area: Location[] = [];
        const {fromYLevel, toYLevel} = this.data;
        const from = Math.min(fromYLevel, toYLevel);
        const to = Math.max(fromYLevel, toYLevel);
        for (let i = from; i <= to; i++) {
            for (const loc of this.data.area) {
                area.push({
                    x: loc.x,
                    y: i,
                    z: loc.z,
                });
            }
        }
        this.area = area;
        this.remainingAreaIndexes = Array.from(Array(this.area.length).keys());
    }

    private checkIfTurtleIsInOrAdjacentToArea(): boolean {
        const {x, y, z} = this.turtle.location as Location;
        return this.area.some(({x: areaX, y: areaY, z: areaZ}, i) => {
            if (i > this.currentYLayer) return false;
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
                throw new Error('Unable to build without knowing turtle location');
            }
    
            if (this.turtle.selectedSlot !== 1) {
                await this.turtle.select(1); // Ensures proper item stacking
                yield;
            }
    
            if (this.remainingAreaIndexes.length === 0) {
                return; // Done!
            }

            // Has building material?
            if (!Object.values(this.turtle.inventory).some((item) => item != null && item.name === this.data.buildingBlockName)) {
                // Return home?
                const home = this.turtle.home;
                if (home === null) {
                    throw new Error(`Missing (${this.remainingAreaIndexes.length}) ${this.data.buildingBlockName}`);
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

                // Take item out of inventories
                for await (const _ of this.pullItemFromNearbyInventories(this.data.buildingBlockName)) {
                    yield;
                }

                // Ensures inventory has updated
                await this.turtle.sleep(1);

                // Got no new items
                if (!Object.values(this.turtle.inventory).some((item) => item != null && item.name === this.data.buildingBlockName)) throw new Error(`Missing (${this.remainingAreaIndexes.length}) ${this.data.buildingBlockName}`);
            }
    
            // Get to the building area!
            if (!this.isInOrAdjacentToBuildingArea) {
                if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                    this.isInOrAdjacentToBuildingArea = true;
                    yield;
                }
    
                try {
                    for await (const _ of this.goToDestinations(this.area.slice(this.currentYLayer, this.currentYLayer + this.data.area.length))) {
                        yield;

                        if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                            this.isInOrAdjacentToBuildingArea = true;
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
    
            try {
                // Build!
                for await (const _ of this.goToDestinations(this.remainingAreaIndexes.filter((i) => i < this.currentYLayer + this.data.area.length).map((i) => ({...this.area[i], y: this.area[i].y + 1})))) {
                    yield;
                }

                const itemSlot = Object.values(this.turtle.inventory).findIndex((item) => item != null && item.name === this.data.buildingBlockName);
                if (!(itemSlot > -1)) continue;

                if (itemSlot + 1 !== this.turtle.selectedSlot) {
                    await this.turtle.select(itemSlot + 1);
                    yield;
                }

                const {x, y, z} = this.turtle.location;
                const currentAreaIndexBelow = this.remainingAreaIndexes.findIndex((i) => this.area[i].x === x && this.area[i].y === y - 1 && this.area[i].z === z);
                if (!(currentAreaIndexBelow > -1)) {
                    yield;
                    continue;
                }

                await this.turtle.placeDown();
                this.remainingAreaIndexes.splice(currentAreaIndexBelow, 1);
                if (!this.remainingAreaIndexes.some((i) => i < this.currentYLayer + this.data.area.length)) {
                    this.currentYLayer++;
                }

                yield;
            } catch (err) {
                if (err instanceof DestinationError && (err.message === 'Movement obstructed')) {
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
