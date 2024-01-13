import {Location} from '../../db/turtle.type';
import DStarLite, {IsBlockMineableFunc} from '../../dlite';
import {Node} from '../../dlite/Node';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {TURTLE_STATES} from './helpers';

export type StateData<T> = {
    [Property in keyof T]: string | number | StateData<T>;
} & {
    readonly id: TURTLE_STATES;
}

export abstract class TurtleBaseState<T extends StateData<T>> {
    public abstract readonly name: string;
    public abstract data: T;
    public abstract warning: string | null;

    protected readonly turtle: Turtle;

    constructor(turtle: Turtle) {
        this.turtle = turtle;
    }

    public abstract act(): AsyncIterator<string | undefined>;

    protected async *transferIntoNearbyInventories(): AsyncGenerator<string | undefined> {
        if (!Object.values(this.turtle.peripherals).some(({types}) => {
            if (types.includes('inventory')) {
                return true;
            }

            return false;
        })) {
            throw new Error('No inventory to empty into');
        }

        let hasEmptiedAnySlot = false;
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
                        await (async ()=>{
                            const [didDrop] = await this.turtle.drop();
                            if (didDrop) hasEmptiedAnySlot = true;
                        })();
                        break;
                    case 'top':
                        await (async ()=>{
                            const [didDrop] = await this.turtle.dropUp();
                            if (didDrop) hasEmptiedAnySlot = true;
                        })();
                        break;
                    case 'bottom':
                        await (async ()=>{
                            const [didDrop] = await this.turtle.dropDown();
                            if (didDrop) hasEmptiedAnySlot = true;
                        })();
                        break;
                    case 'left':
                        await (async ()=>{
                            await this.turtle.turnLeft();
                            const [didDrop] = await this.turtle.drop();
                            if (didDrop) hasEmptiedAnySlot = true;
                        })();
                        break;
                    case 'right':
                        await (async ()=>{
                            await this.turtle.turnRight();
                            const [didDrop] = await this.turtle.drop();
                            if (didDrop) hasEmptiedAnySlot = true;
                        })();
                        break;
                    case 'back':
                        await (async ()=>{
                            await this.turtle.turnLeft();
                            await this.turtle.turnLeft();
                            const [didDrop] = await this.turtle.drop();
                            if (didDrop) hasEmptiedAnySlot = true;
                        })();
                        break;
                    default:
                        const connectedHub = hubs.find(([_, {data}]) => (data as {remoteNames: string[]})?.remoteNames?.includes(bestMatchingSide));
                        if (connectedHub) {
                            const [_, {data}] = connectedHub;
                            const [pulledItemCount] = await this.turtle.usePeripheralWithSide<[number]>(
                                bestMatchingSide,
                                'pullItems',
                                (data as {localName: string}).localName,
                                slot,
                            );
                            if (pulledItemCount > 0) {
                                hasEmptiedAnySlot = true;
                            }
                        }
                        break;
                }

                yield;
            }
        }

        if (!hasEmptiedAnySlot) {
            throw new Error('No inventory to empty into');
        }
    }

    protected async *goToDestinations(destinations: Point[], isBlockMineableFunc?: IsBlockMineableFunc): AsyncGenerator<void> {
        const {location} = this.turtle;
        if (location === null) {
            throw new Error('Missing location');
        }

        const algorithm = new DStarLite(this.turtle.serverId, {
            isBlockMineableFunc
        });
        let solution = await algorithm.search(new Point(location.x, location.y, location.z), destinations);
        if (solution === undefined) {
            throw new Error('Stuck; unable to reach destination');
        }

        while (solution !== null) {
            const [didMoveToNode, failedMoveMessage] = await this.moveToNode(solution);
            if (didMoveToNode) {
                solution = solution.parent;
                yield;
                continue;
            } else {
                switch (failedMoveMessage) {
                    case 'Movement obstructed':
                        solution = null;
                        yield;
                        continue;
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
                        throw new Error(failedMoveMessage);
                }
            }
        }
    }

    protected async moveToNode(s: Node): Promise<[true, undefined] | [false, string]> {
        const {x, y, z} = this.turtle.location as Location;
        if (s.point.y - y > 0) {
            const [didMoveUp, upMessage] = await this.turtle.up();
            if (didMoveUp) return [true, undefined];

            if (upMessage === 'Out of fuel') {
                await this.turtle.getFuelLevel();
                return [false, upMessage];
            }

            // We don't know what the other potential errors are!
            if (upMessage !== 'Movement obstructed') return [false, upMessage as string];

            if (!s.isMineable) {
                await this.turtle.inspectUp();
                return [false, upMessage];
            }

            const [didDigUp, didDigUpMessage] = await this.turtle.digUp();
            if (!didDigUp) {
                await this.turtle.inspectUp();
                return [false, didDigUpMessage as string];
            }
            
            await this.turtle.suckUp();
            const [didMoveUpAfterDig, moveDownAfterDigMessage] = await this.turtle.up();
            if (didMoveUpAfterDig) return [true, undefined];

            await this.turtle.inspectUp();
            return [false, moveDownAfterDigMessage as string];
        } else if (s.point.y - y < 0) {
            const [didMoveDown, downMessage] = await this.turtle.down();
            if (didMoveDown) return [true, undefined];

            if (downMessage === 'Out of fuel') {
                await this.turtle.getFuelLevel();
                return [false, downMessage];
            }

            // We don't know what the other potential errors are!
            if (downMessage !== 'Movement obstructed') return [false, downMessage as string];

            if (!s.isMineable) {
                await this.turtle.inspectDown();
                return [false, downMessage];
            }

            const [didDigDown, digDownMessage] = await this.turtle.digDown();
            if (!didDigDown) {
                await this.turtle.inspectDown();
                return [false, digDownMessage as string];
            }

            await this.turtle.suckDown();
            const [didMoveDownAfterDig, moveDownAfterDigMessage] = await this.turtle.down();
            if (didMoveDownAfterDig) return [true, undefined];

            await this.turtle.inspectDown();
            return [false, moveDownAfterDigMessage as string];
        } else {
            const heading = {x: s.point.x - x, y: s.point.y - y, z: s.point.z - z};
            const direction = heading.x + Math.abs(heading.x) * 2 + (heading.z + Math.abs(heading.z) * 3);
            await this.turtle.turnToDirection(direction);

            const [didMoveForward, forwardMessage] = await this.turtle.forward();
            if (didMoveForward) return [true, undefined];

            if (forwardMessage === 'Out of fuel') {
                await this.turtle.getFuelLevel();
                return [false, forwardMessage];
            }

            // We don't know what the other potential errors are!
            if (forwardMessage !== 'Movement obstructed') return [false, forwardMessage as string]

            if (!s.isMineable) {
                await this.turtle.inspect();
                return [false, forwardMessage];
            }

            const [didDig, digMessage] = await this.turtle.dig();
            if (!didDig) {
                await this.turtle.inspect();
                return [false, digMessage as string];
            }

            await this.turtle.suck();

            const [didMoveForwardAfterDig, forwardMessageAfterDig] = await this.turtle.forward();
            if (didMoveForwardAfterDig) return [true, undefined];
            
            await this.turtle.inspect();
            return [false, forwardMessageAfterDig as string];
        }
    }

    protected hasSpaceForItem(name: string, count = 1) {
        const inventoryEntries = Object.entries(this.turtle.inventory);
        if (inventoryEntries.length < 16) return true;

        return (
            inventoryEntries.reduce((remainingCount, [_, item]) => {
                if (!item) return 0;
                if (item.name !== name) return remainingCount;
                if (!item.maxCount || !item.maxCount) return remainingCount;

                return remainingCount - (item.maxCount - item.count);
            }, count) <= 0
        );
    }

    protected async selectItemOfType(name: string) {
        const itemOfType = Object.entries(this.turtle.inventory).find(([_, item]) => item?.name === name);
        if (itemOfType === undefined) return false;

        const [key] = itemOfType;
        await this.turtle.select(Number(key));
        return true;
    }
}
