import {getArea} from '../../db';
import {Location} from '../../db/turtle.type';
import DStarLite from '../../dlite';
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
    private readonly algorithm: DStarLite;
    private isInFarmingArea: boolean = false;
    private solution: Node | null = null;
    private remainingAreaIndexes: number[] = [];
    private noop: number = 0;
    private goToHome: Location | null = null;

    constructor(turtle: Turtle, data: Omit<FarmingStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.FARMING
        };
        this.area = getArea(this.turtle.serverId, this.data.areaId).area.map(({x, y, z}) => ({x, y: y + 1, z}));
        this.algorithm = new DStarLite(this.turtle.serverId);
    }

    public async act() {
        if (this.turtle.location === null) {
            this.turtle.error = 'Unable to farm without knowing turtle location';
            return;
        }

        if (this.goToHome !== null) {
            const {x, y, z} = this.turtle.location;
            const home = this.goToHome;
            if (home.x === x && home.y === y && home.z === z) {
                this.solution = null;

                // Ensure we have access to peripherals
                await this.turtle.sleep(0.1);

                if (!Object.values(this.turtle.peripherals).some(({types}) => {
                    if (types.includes('inventory')) {
                        return true;
                    }

                    return false;
                })) {
                    this.turtle.error = 'No inventory at home to refuel from / empty into';
                    return; // Error
                }

                for (let slot = 1; slot < 27; slot++) {
                    const item = this.turtle.inventory[slot];
                    if (item) {
                        const {inventories, hubs} = Object.entries(this.turtle.peripherals).reduce((acc, [side, {types, data}]) => {
                            if (types.includes('inventory')) {
                                acc.inventories.push([side, {types, data}]);
                            } else if (types.includes('peripheral_hub')) {
                                acc.hubs.push([side, {types, data}]);
                            }
        
                            return acc;
                        }, {inventories: [] as [string, {data?: unknown; types: string[]}][], hubs: [] as [string, {data?: unknown; types: string[]}][]});

                        const bestMatchingInventory = inventories.find(([side, {data}]) => {
                            const content = (data as {content: {name: string}[]}).content;
                            if (content === undefined) {
                                return false;
                            }
    
                            const containsItem = content?.some(({name}) => name === item?.name);
                            if (!containsItem) return false;

                            switch (side) {
                                case 'front':
                                case 'top':
                                case 'bottom':
                                case 'left':
                                case 'right':
                                case 'back':
                                    return true;
                                default:
                                    return hubs.some(([_, {data}]) => {
                                        if (!(data as {localName: string})?.localName) return false;
                                        return (data as {remoteNames: string[]})?.remoteNames?.includes(side);
                                    });
                            }
                        }) ?? inventories.find(([side]) => {
                            if (side === 'front') return true;
                            if (side === 'top') return true;
                            if (side === 'bottom') return true;
                            if (side === 'left') return true;
                            if (side === 'right') return true;
                            if (side === 'back') return true;
                            return false;
                        });
                        if (bestMatchingInventory === undefined) continue;
                        const [bestMatchingSide] = bestMatchingInventory;
                        await this.turtle.select(slot);
                        switch (bestMatchingSide) {
                            case 'front':
                                await this.turtle.drop();
                                break;
                            case 'top':
                                await this.turtle.dropUp();
                                break;
                            case 'bottom':
                                await this.turtle.dropDown();
                                break;
                            case 'left':
                                await this.turtle.turnLeft();
                                await this.turtle.drop();
                                break;
                            case 'right':
                                await this.turtle.turnRight();
                                await this.turtle.drop();
                                break;
                            case 'back':
                                await this.turtle.turnLeft();
                                await this.turtle.turnLeft();
                                await this.turtle.drop();
                                break;
                            default:
                                const connectedHub = hubs.find(([_, {data}]) => (data as {remoteNames: string[]})?.remoteNames?.includes(bestMatchingSide));
                                if (connectedHub) {
                                    const [_, {data}] = connectedHub;
                                    await this.turtle.usePeripheralWithSide<[number]>(
                                        bestMatchingSide,
                                        'pullItems',
                                        (data as {localName: string}).localName,
                                        slot,
                                    );
                                }
                                break;
                        }
                    }
                }

                this.goToHome = null;
                return; // Yield
            }

            if (this.solution !== null) {
                const [didMoveToNode, failedMoveMessage] = await this.moveToNode(this.solution);
                if (didMoveToNode) {
                    this.solution = this.solution.parent;    
                    return; // Yield
                } else {
                    switch (failedMoveMessage) {
                        case 'Movement obstructed':
                            this.solution = null;
                            return; // Yield
                        case 'Out of fuel':
                        case 'Movement failed':
                        case 'Too low to move':
                        case 'Too high to move':
                        case 'Cannot leave the world':
                        case 'Cannot leave loaded world':
                        case 'Cannot pass the world border':
                        case 'No tool to dig with':
                        case 'Cannot break block with this tool':
                        case 'Turtle location is null':
                        default:
                            this.turtle.error = failedMoveMessage;
                            return; // Error
                    }
                }
            }
        }

        if (this.turtle.selectedSlot !== 1) {
            await this.turtle.select(1); // Ensures proper item stacking
        }

        const areaLength = this.area.length;
        if (areaLength > 1 && this.noop > areaLength) {
            const didSelect = await this.selectAnySeedInInventory();
            if (!didSelect) {
                this.turtle.error = 'No seeds in inventory';
                return;
            }

            this.turtle.error = 'Nothing to farm in area';
            return; // Yield
        }

        if (!this.isInFarmingArea) {
            const {x, y, z} = this.turtle.location;
            if (this.area.some(({x: areaX, y: areaY, z: areaZ}) => areaX === x && areaY === y && areaZ === z)) {
                this.isInFarmingArea = true;
                return;
            }

            if (this.solution === null) {
                const solution = await this.algorithm.search(new Point(x, y, z), this.area);
                if (solution === undefined) {
                    this.turtle.error = 'Stuck; unable to reach destination';
                    return; // Error
                }

                this.solution = solution;
                return; // Yield
            }

            const [didMoveToNode, failedMoveMessage] = await this.moveToNode(this.solution);
            if (didMoveToNode) {
                this.solution = this.solution.parent;
                const {x, y, z} = this.turtle.location;
                if (
                    this.area.some(({x: areaX, y: areaY, z: areaZ}) => areaX === x && areaY === y && areaZ === z)
                ) {
                    this.isInFarmingArea = true;
                    this.solution = null;
                }
            }

            return; // Yield
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
                const didSelect = await this.selectAnySeedInInventory();
                if (didSelect) {
                    const [didPlace] = await this.turtle.placeDown();
                    if (didPlace) {
                        this.noop = 0;
                    } else {
                        this.noop++;
                    }
                } else {
                    this.noop++;
                }

                this.remainingAreaIndexes.splice(farmlandIndexOfBlock, 1);

                return; // Yield
            }

            const farmingBlockToFarmingDetails = blockToFarmingDetailsMapObject[block.name];
            if (farmingBlockToFarmingDetails) {
                if (!this.hasSpaceForItem(farmingBlockToFarmingDetails.harvest)) {
                    const home = this.turtle.home;
                    if (home !== null) {
                        this.goToHome = home;
                        this.isInFarmingArea = false;
                        const solution = await this.algorithm.search(new Point(x, y, z), [new Point(home.x, home.y, home.z)]);
                        if (solution === undefined) {
                            this.turtle.error = 'Stuck; unable to reach home';
                            return; // Error
                        }
                        this.solution = solution;
                    } else {
                        this.turtle.error = 'Inventory is full';
                    }
                    return; // Error
                }

                if (block.state.age === farmingBlockToFarmingDetails.maxAge) {
                    await this.farmBlock(farmingBlockToFarmingDetails.seed);
                    this.remainingAreaIndexes.splice(farmlandIndexOfBlock, 1);
                } else {
                    await this.turtle.sleep(1);
                }

                this.noop = 0;
            }

            return; // Yield
        }

        if (this.solution === null) {
            const solution = await this.algorithm.search(
                new Point(x, y, z),
                this.remainingAreaIndexes.map((i) => this.area[i])
            );
            if (solution === undefined) {
                this.turtle.error = 'Stuck; unable to reach destination';
                return; // Error
            }

            this.solution = solution;
            return; // Yield
        }

        const [didMoveToNode, failedMoveMessage] = await this.moveToNode(this.solution);
        if (didMoveToNode) {
            this.solution = this.solution.parent;
            if (
                this.remainingAreaIndexes.findIndex(
                    (i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z
                )
            ) {
                this.solution = null;
            }

            return; // Yield
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

    private async farmBlock(seedTypeName: string) {
        const [didDigDown] = await this.turtle.digDown();
        if (didDigDown) {
            const didSelectSeed = await this.selectItemOfType(seedTypeName);
            if (didSelectSeed) {
                await this.turtle.placeDown();
            }
        }
    }
}
