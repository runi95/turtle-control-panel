import {getArea} from '../../db';
import {Location} from '../../db/turtle.type';
import {Node} from '../../dlite/Node';
import {Point} from '../../dlite/Point';
import {blockToFarmingDetailsMapObject, farmingSeedNames} from '../../helpers/farming';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';
import logger from '../../logger/server';
import {DestinationError} from '../../dlite';

export interface FarmingStateData {
    readonly id: TURTLE_STATES;
    area: Location[];
    currentAreaFarmIndex: number;
}

export class TurtleFarmingState extends TurtleBaseState<FarmingStateData> {
    public readonly name = 'farming';
    public data: FarmingStateData;
    public warning: string | null = null;

    private readonly area: Location[];
    private isInFarmingArea: boolean = false;
    private solution: Node | null = null;
    private remainingAreaIndexes: number[] = [];
    private noop: number = 0;

    constructor(turtle: Turtle, data: Omit<FarmingStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.FARMING,
        };
        this.area = this.data.area;
    }

    public async *act() {
        while (true) {
            if (this.turtle.location === null) {
                throw new Error('Unable to farm without knowing turtle location');
            }

            if (this.turtle.selectedSlot !== 1) {
                await this.turtle.select(1); // Ensures proper item stacking
                yield;
            }

            const areaLength = this.area.length;
            if (areaLength > 1 && this.noop > areaLength) {
                const didSelect = await this.selectAnySeedInInventory();
                if (!didSelect) {
                    throw new Error('No seeds in inventory');
                } else {
                    throw new Error('Nothing to farm in area');
                }
            }

            // Get to farming area
            if (!this.isInFarmingArea) {
                const {x, y, z} = this.turtle.location;
                if (this.area.some(({x: areaX, y: areaY, z: areaZ}) => areaX === x && areaY === y && areaZ === z)) {
                    this.isInFarmingArea = true;
                } else {
                    try {
                        for await (const _ of this.goToDestinations(this.area)) {
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
                }
            }

            if (this.remainingAreaIndexes.length === 0) {
                this.remainingAreaIndexes = Array.from(Array(this.area.length).keys());
            }

            const {x, y, z} = this.turtle.location;
            const farmlandIndexOfBlock = this.remainingAreaIndexes.findIndex(
                (i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z
            );

            // Are we above farmland?
            if (farmlandIndexOfBlock > -1) {
                const block = await this.turtle.inspectDown();
                if (block === undefined) {
                    throw new Error('No turtle location set');
                }

                if (block === null) {
                    await this.turtle.digDown();
                    yield;

                    const didSelect = await this.selectAnySeedInInventory();
                    yield;

                    if (didSelect) {
                        const [didPlace] = await this.turtle.placeDown();
                        yield;

                        if (didPlace) {
                            this.noop = 0;
                        } else {
                            this.noop++;
                        }
                    } else {
                        this.noop++;
                    }

                    this.remainingAreaIndexes.splice(farmlandIndexOfBlock, 1);
                } else {
                    const farmingBlockToFarmingDetails = blockToFarmingDetailsMapObject[block.name];
                    if (farmingBlockToFarmingDetails) {
                        // Go home?
                        const fuelPercentage = (100 * this.turtle.fuelLevel) / this.turtle.fuelLimit;
                        if (fuelPercentage < 10 || !this.hasSpaceForItem(farmingBlockToFarmingDetails.harvest)) {
                            const home = this.turtle.home;
                            if (home !== null) {
                                this.isInFarmingArea = false;
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
                            } else {
                                throw new Error('Inventory is full');
                            }
                        }

                        if (block.state.age === farmingBlockToFarmingDetails.maxAge) {
                            yield* this.farmBlock(farmingBlockToFarmingDetails.seed);
                            this.remainingAreaIndexes.splice(farmlandIndexOfBlock, 1);
                        } else {
                            await this.turtle.sleep(1);
                        }

                        this.noop = 0;
                    }
                }
            }

            if (this.solution === null) {
                try {
                    for await (const _ of this.goToDestinations(this.remainingAreaIndexes.map((i) => this.area[i]))) {
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
            }

            yield;
        }
    }

    private async selectAnySeedInInventory() {
        const inventoryEntry = Object.entries(this.turtle.inventory).find(([_, item]) =>
            farmingSeedNames.includes(item?.name)
        );
        if (inventoryEntry === undefined) return false;

        const [slot, seed] = inventoryEntry;
        const slotAsNumber = Number(slot);
        const item = await this.turtle.getItemDetail(slotAsNumber);
        if (item?.name !== seed.name) return false;

        await this.turtle.select(slotAsNumber);
        return true;
    }

    private async *farmBlock(seedTypeName: string) {
        const [didDigDown] = await this.turtle.digDown();
        yield;

        if (didDigDown) {
            const didSelectSeed = await this.selectItemOfType(seedTypeName);
            yield;

            if (didSelectSeed) {
                await this.turtle.placeDown();
                yield;
            }
        }
    }
}
