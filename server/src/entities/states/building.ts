import {Block} from '../../db/block.type';
import {ItemDetail, Location} from '../../db/turtle.type';
import {DestinationError} from '../../dlite';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface BuildStateData {
    readonly id: TURTLE_STATES;
    readonly blocks: Omit<Block, 'state' | 'tags'>[];
}
export class TurtleBuildingState extends TurtleBaseState<BuildStateData> {
    public readonly name = 'building';
    public data: BuildStateData;
    public warning: string | null = null;

    private isInOrAdjacentToBuildingArea: boolean = false;
    private blocks: Omit<Block, 'state' | 'tags'>[];
    private remainingAreaIndexes: number[] = [];
    private remainingBlocksOfType = new Map<string, number>();
    private currentYLayer: number;

    constructor(turtle: Turtle, data: Omit<BuildStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.BUILDING,
        };

        this.blocks = data.blocks;
        this.remainingAreaIndexes = Array.from(Array(this.blocks.length).keys());
        this.currentYLayer = this.blocks.reduce((acc, curr, i) => {
            if (curr.y < this.blocks[acc].y) {
                return i;
            }

            return acc;
        }, 0);

        this.blocks.forEach((block) => {
            this.remainingBlocksOfType.set(block.name, (this.remainingBlocksOfType.get(block.name) ?? 0) + 1);
        });
    }

    private checkIfTurtleIsInOrAdjacentToArea(): boolean {
        const {x, y, z} = this.turtle.location as Location;
        return this.blocks.some(({x: areaX, y: areaY, z: areaZ}, i) => {
            if (i < this.currentYLayer) return false;
            if (areaX === x && areaY === y && areaZ === z) return true;
            if ((areaX === x + 1 || areaX === x - 1) && areaY === y && areaZ === z) return true;
            if (areaX === x && (areaY === y + 1 || areaY === y - 1) && areaZ === z) return true;
            if (areaX === x && areaY === y && (areaZ === z + 1 || areaZ === z - 1)) return true;
            return false;
        });
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
            if (
                !Object.values(this.turtle.inventory).some((item: ItemDetail) => {
                    if (item == null) return false;
                    const remaining = this.remainingBlocksOfType.get(item.name);
                    if (remaining == null) return false;
                    return remaining > 0;
                })
            ) {
                // Return home?
                const home = this.turtle.home;
                if (home === null) {
                    throw new Error(
                        `Missing (${this.remainingAreaIndexes.length}) [${Array.from(this.remainingBlocksOfType.keys()).join(', ')}]`
                    );
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

                // Take items out of inventories
                for (const [itemName, itemCount] of this.remainingBlocksOfType.entries()) {
                    for await (const _ of this.pullItemFromNearbyInventories(itemName, itemCount)) {
                        yield;
                    }
                }

                // Ensures inventory has updated
                await this.turtle.sleep(1);

                // Got no new items
                if (
                    !Object.values(this.turtle.inventory).some((item) => {
                        if (item == null) return false;
                        const remaining = this.remainingBlocksOfType.get(item.name);
                        if (remaining == null) return false;
                        return remaining > 0;
                    })
                )
                    throw new Error(
                        `Missing (${this.remainingAreaIndexes.length}) [${Array.from(this.remainingBlocksOfType.keys()).join(', ')}]`
                    );
            }

            // Get to the building area!
            if (!this.isInOrAdjacentToBuildingArea) {
                if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                    this.isInOrAdjacentToBuildingArea = true;
                    yield;
                }

                try {
                    for await (const _ of this.goToDestinations(this.blocks.slice(this.currentYLayer))) {
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
                for await (const _ of this.goToDestinations(
                    this.remainingAreaIndexes
                        .filter((i) => i >= this.currentYLayer)
                        .map((i) => ({...this.blocks[i], y: this.blocks[i].y + 1}))
                )) {
                    yield;
                }

                const {x, y, z} = this.turtle.location;
                const currentAreaIndexBelow = this.remainingAreaIndexes.findIndex(
                    (i) => this.blocks[i].x === x && this.blocks[i].y === y - 1 && this.blocks[i].z === z
                );
                if (!(currentAreaIndexBelow > -1)) {
                    yield;
                    continue;
                }

                const itemSlot = Object.values(this.turtle.inventory).findIndex((item) => {
                    if (item == null) return false;
                    return this.blocks[currentAreaIndexBelow].name === item.name;
                });
                if (!(itemSlot > -1)) continue;

                if (itemSlot + 1 !== this.turtle.selectedSlot) {
                    await this.turtle.select(itemSlot + 1);
                    yield;
                }

                await this.turtle.placeDown();
                this.remainingAreaIndexes.splice(currentAreaIndexBelow, 1);
                if (!this.remainingAreaIndexes.some((i) => i > this.currentYLayer)) {
                    this.currentYLayer--;
                }

                yield;
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
    }
}
