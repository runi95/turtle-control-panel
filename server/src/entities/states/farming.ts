import {getArea} from '../../db';
import {Location} from '../../db/turtle.type';
import {Node} from '../../dlite/Node';
import {Point} from '../../dlite/Point';
import {blockToFarmingDetailsMapObject, farmingSeedNames} from '../../helpers/farming';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface FarmingStateData {
    readonly id: TURTLE_STATES;
    areaId: number;
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
            id: TURTLE_STATES.FARMING
        };
        this.area = getArea(this.turtle.serverId, this.data.areaId).area.map(({x, y, z}) => ({x, y: y + 1, z}));
    }

    public async *act() {
        while (true) {
            if (this.turtle.location === null) {
                this.turtle.error = 'Unable to farm without knowing turtle location';
                return; // Error
            }
    
            if (this.turtle.selectedSlot !== 1) {
                await this.turtle.select(1); // Ensures proper item stacking
                yield;
            }
    
            const areaLength = this.area.length;
            if (areaLength > 1 && this.noop > areaLength) {
                const didSelect = await this.selectAnySeedInInventory();
                if (!didSelect) {
                    this.turtle.error = 'No seeds in inventory';
                } else {
                    this.turtle.error = 'Nothing to farm in area';
                }
    
                return; // Error
            }
    
            // Get to farming area
            if (!this.isInFarmingArea) {
                const {x, y, z} = this.turtle.location;
                if (this.area.some(({x: areaX, y: areaY, z: areaZ}) => areaX === x && areaY === y && areaZ === z)) {
                    this.isInFarmingArea = true;
                } else {
                    for await (const err of this.goToDestinations(this.area)) {
                        switch (err) {
                            case 'Movement obstructed':
                            case undefined:
                                yield;
                                break;
                            default:
                                this.turtle.error = err;
                                return; // Error
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
                    this.turtle.error = 'No turtle location set';
                    return; // Error
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
                        if (!this.hasSpaceForItem(farmingBlockToFarmingDetails.harvest)) {
                            const home = this.turtle.home;
                            if (home !== null) {
                                this.isInFarmingArea = false;
                                for await (const err of this.goToDestinations([new Point(home.x, home.y, home.z)])) {
                                    switch (err) {
                                        case 'Movement obstructed':
                                        case undefined:
                                            yield;
                                            break;
                                        default:
                                            this.turtle.error = err;
                                            return;
                                    }
                                }

                                // Ensure we have access to peripherals
                                await this.turtle.sleep(1);
                                yield;

                                for await (const err of this.transferIntoNearbyInventories()) {
                                    switch (err) {
                                        case undefined:
                                            yield;
                                            break;
                                        default:
                                            this.turtle.error = err;
                                            return;
                                    }
                                }
                            } else {
                                this.turtle.error = 'Inventory is full';
                                return; // Error
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
                for await (const err of this.goToDestinations(this.remainingAreaIndexes.map((i) => this.area[i]))) {
                    switch (err) {
                        case 'Movement obstructed':
                        case undefined:
                            yield;
                            break;
                        default:
                            this.turtle.error = err;
                            return;
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
