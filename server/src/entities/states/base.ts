import {Location} from '../../db/turtle.type';
import DStarLite, {Boundaries, DestinationError, IsBlockMineableFunc} from '../../dlite/index';
import {Node} from '../../dlite/Node';
import {Point} from '../../dlite/Point';
import {PriorityQueue} from '../../dlite/PriorityQueue';
import globalEventEmitter from '../../globalEventEmitter';
import {levenshteinDistance} from '../../helpers/levenshtein-distance';
import {Turtle} from '../turtle';

interface ComparableItem {
    side: string;
    index: number;
    priority: number;
}

export abstract class TurtleBaseState<T> {
    public abstract readonly name: string;
    public abstract data: T;
    #warning: string | null = null;

    protected readonly turtle: Turtle;

    constructor(turtle: Turtle) {
        this.turtle = turtle;
    }

    public abstract act(): AsyncIterator<string | undefined>;

    public get warning(): string | null {
        return this.#warning;
    }

    public set warning(warning: string | null) {
        this.#warning = warning;

        globalEventEmitter.emit('tupdate', {
            id: this.turtle.id,
            serverId: this.turtle.serverId,
            data: {
                state: {
                    name: this.name,
                    warning: this.#warning,
                    data: this.data,
                },
            },
        });
    }

    protected async *refuelFromNearbyInventories(): AsyncGenerator<void> {
        const {inventories, hubs} = Object.entries(this.turtle.peripherals).reduce(
            (acc, [side, {types, data}]) => {
                if (types.includes('inventory')) {
                    acc.inventories.push([side, {types, data}]);
                } else if (types.includes('peripheral_hub')) {
                    acc.hubs.push([side, {types, data}]);
                }

                return acc;
            },
            {
                inventories: [] as [string, {data?: unknown; types: string[]}][],
                hubs: [] as [string, {data?: unknown; types: string[]}][],
            }
        );
        if (inventories.length < 1) {
            throw new Error('No inventory to refuel from');
        }

        const compareFuel = (a: ComparableItem, b: ComparableItem) => {
            if (a.priority > b.priority) {
                return 1;
            }

            if (a.priority < b.priority) {
                return -1;
            }

            return 0;
        };
        const itemPriorityQueue = new PriorityQueue<ComparableItem>(compareFuel);
        for (const [side, peripheral] of inventories) {
            const isValidInventory = (() => {
                switch (side) {
                    case 'front':
                    case 'top':
                    case 'bottom':
                    case 'left':
                    case 'right':
                    case 'back':
                        return false;
                    default:
                        return hubs.some(([_, {data}]) => {
                            if (!(data as {localName: string})?.localName) return false;
                            return (data as {remoteNames: string[]})?.remoteNames?.includes(side);
                        });
                }
            })();
            if (!isValidInventory) continue;

            const {data} = peripheral;
            const {content} = data as {content: {name: string; tags?: {[key: string]: boolean}}[] | null};
            if (content === null) continue;

            for (let i = 0; i < content.length; i++) {
                const item = content[i];
                const priority = (() => {
                    if (item?.tags?.['minecraft:logs'] === true) {
                        return 4;
                    } else {
                        switch (item.name) {
                            case 'minecraft:lava_bucket':
                                return 3;
                            case 'minecraft:blaze_rod':
                                return 1;
                            case 'minecraft:coal':
                                return 6;
                            case 'minecraft:charcoal':
                                return 7;
                            case 'minecraft:stick':
                                return 2;
                            case 'minecraft:coal_block':
                                return 5;
                        }
                    }

                    return null;
                })();
                if (priority !== null) {
                    itemPriorityQueue.add({
                        index: i + 1,
                        side,
                        priority,
                    });
                }
            }
        }

        let item: ComparableItem | null = null;
        while (
            (item = itemPriorityQueue.poll()) !== null &&
            (100 * this.turtle.fuelLevel) / this.turtle.fuelLimit < 90
        ) {
            switch (item.side) {
                case 'front':
                case 'top':
                case 'bottom':
                case 'left':
                case 'right':
                case 'back':
                    continue;
                default:
                    const connectedHub = hubs.find(([_, {data}]) =>
                        (data as {remoteNames: string[]})?.remoteNames?.includes((item as ComparableItem).side)
                    );
                    if (connectedHub) {
                        let availableSlot = null;
                        for (let i = 1; i < 17; i++) {
                            if (this.turtle.inventory[i] == null) {
                                availableSlot = i;
                                break;
                            }
                        }
                        if (availableSlot === null) break;

                        await this.turtle.select(availableSlot);
                        yield;

                        const [_, {data}] = connectedHub;
                        const [pulledItemCount] = await this.turtle.usePeripheralWithSide<[number]>(
                            item.side,
                            'pushItems',
                            (data as {localName: string}).localName,
                            item.index,
                            null,
                            availableSlot
                        );
                        yield;
                        if (pulledItemCount > 0) {
                            await this.turtle.refuel();
                            yield;
                        }
                    }
                    break;
            }
        }
    }

    protected async *pullItemFromNearbyInventories(itemName: string, count: number): AsyncGenerator<void> {
        if (
            !Object.values(this.turtle.peripherals).some(({types}) => {
                if (types.includes('inventory')) {
                    return true;
                }

                return false;
            })
        ) {
            throw new Error('No inventory to pull items from');
        }

        let hasPulledItemFromInventories = false;
        const {inventories, hubs} = Object.entries(this.turtle.peripherals).reduce(
            (acc, [side, {types, data}]) => {
                if (types.includes('inventory')) {
                    acc.inventories.push([side, {types, data}]);
                } else if (types.includes('peripheral_hub')) {
                    acc.hubs.push([side, {types, data}]);
                }

                return acc;
            },
            {
                inventories: [] as [string, {data?: unknown; types: string[]}][],
                hubs: [] as [string, {data?: unknown; types: string[]}][],
            }
        );

        for (const [side, {data}] of inventories) {
            // Have we gotten all the items we need?
            if (count < 1) break;

            let {content, size} = data as {
                content: ({name: string; count: number; maxCount: string} | null)[];
                size: number;
            };

            // Is inventory missing item content?
            if (content == null) continue;

            for (let i = 0; i < size; i++) {
                // Have we gotten all the items we need?
                if (count < 1) break;
                const item = content[i];

                // Is this item slot empty?
                if (item == null) continue;

                // Is it the correct item type?
                if (item.name !== itemName) continue;

                // Are there any left in stock?
                if (item.count < 1) continue;

                switch (side) {
                    case 'front':
                    case 'top':
                    case 'bottom':
                    case 'left':
                    case 'right':
                    case 'back':
                        // Is requested item not in first slot?
                        if (i > 0) {
                            // Is the first inventory slot available?
                            const firstItemInInventory = content[0];
                            if (firstItemInInventory != null) {
                                let freeSlot = -1;
                                for (let i = 1; i < size; i++) {
                                    if (content[i] != null) continue;
                                    freeSlot = i;
                                    break;
                                }

                                // Are there any available slots to move items to?
                                if (freeSlot === -1) continue;

                                const [pushedTempItemCount] = await this.turtle.usePeripheralWithSide<[number]>(
                                    side,
                                    'pushItems',
                                    side,
                                    1,
                                    null,
                                    freeSlot + 1
                                );
                                if (pushedTempItemCount >= firstItemInInventory.count) {
                                    content[freeSlot] = firstItemInInventory;
                                    content[0] = null;
                                } else if (pushedTempItemCount > 0) {
                                    content[freeSlot] = {
                                        name: item.name,
                                        maxCount: item.maxCount,
                                        count: pushedTempItemCount,
                                    };
                                    continue;
                                }
                            }

                            const [pushedItemCount] = await this.turtle.usePeripheralWithSide<[number]>(
                                side,
                                'pushItems',
                                side,
                                i + 1,
                                null,
                                1
                            );
                            if (pushedItemCount === item.count) {
                                content[0] = item;
                                content[i] = null;
                            } else if (pushedItemCount > 0) {
                                content[0] = {
                                    name: item.name,
                                    maxCount: item.maxCount,
                                    count: pushedItemCount,
                                };
                            }
                        }

                        if (side === 'left') {
                            await this.turtle.turnLeft();
                            yield;
                        } else if (side === 'back') {
                            await this.turtle.turnLeft();
                            yield;

                            await this.turtle.turnLeft();
                            yield;
                        } else if (side === 'right') {
                            await this.turtle.turnRight();
                            yield;
                        }

                        if (side === 'top') {
                            await this.turtle.suckUp(Math.min(count, 64));
                            yield;
                        } else if (side === 'bottom') {
                            await this.turtle.suckDown(Math.min(count, 64));
                            yield;
                        } else {
                            await this.turtle.suck(Math.min(count, 64));
                            yield;
                        }

                        // Refresh connected inventory state
                        const expectedCount = content[0]?.count ?? 0;
                        await this.turtle.connectToInventory(side);
                        content = (
                            this.turtle.peripherals[side].data as {
                                content: {name: string; count: number; maxCount: string}[];
                                size: number;
                            }
                        ).content;
                        if (content[0] == null) {
                            hasPulledItemFromInventories = true;
                            count -= expectedCount;
                        } else {
                            const movedCount = expectedCount - (content[0]?.count ?? 0);
                            if (movedCount > 0) {
                                hasPulledItemFromInventories = true;
                                count -= movedCount;
                            }
                        }
                        yield;

                        break;
                    default:
                        const connectedHub = hubs.find(([_, {data}]) =>
                            (data as {remoteNames: string[]})?.remoteNames?.includes(side)
                        );
                        if (connectedHub) {
                            const [_, {data: hubData}] = connectedHub;
                            const [pushedItemCount] = await this.turtle.usePeripheralWithSide<[number]>(
                                side,
                                'pushItems',
                                (hubData as {localName: string}).localName,
                                i + 1,
                                count
                            );
                            if (pushedItemCount > 0) {
                                hasPulledItemFromInventories = true;
                                count -= pushedItemCount;

                                if (item.count <= pushedItemCount) {
                                    content[i] = null;
                                } else {
                                    item.count -= pushedItemCount;
                                }
                            }
                        }
                        break;
                }
            }
        }

        if (!hasPulledItemFromInventories) {
            throw new Error('No nearby inventory has the specified item');
        }
    }

    protected async *transferSlotIntoNearbyInventories(slot: number): AsyncGenerator<void> {
        const item = this.turtle.inventory[slot];
        if (item == null) return;

        const {inventories, hubs} = Object.entries(this.turtle.peripherals).reduce(
            (acc, [side, {types, data}]) => {
                if (types.includes('inventory')) {
                    acc.inventories.push([side, {types, data}]);
                } else if (types.includes('peripheral_hub')) {
                    acc.hubs.push([side, {types, data}]);
                }

                return acc;
            },
            {
                inventories: [] as [string, {data?: unknown; types: string[]}][],
                hubs: [] as [string, {data?: unknown; types: string[]}][],
            }
        );

        let bestStringMatch = Number.MAX_VALUE;
        const bestMatchingInventory = inventories.reduce(
            (bestMatch, inventory) => {
                const [_, {data}] = inventory;
                const {content, size} = data as {
                    content: ({name: string; count: number; maxCount: string} | null)[];
                    size: number;
                };
                if (content == null) return bestMatch;

                let currentBestMatch = Number.MAX_VALUE;
                for (let i = 0; i < size; i++) {
                    const invItem = content[i];
                    if (invItem == null) continue;

                    const distance = levenshteinDistance(item.name, invItem.name);
                    if (distance < currentBestMatch) {
                        currentBestMatch = distance;
                    }
                }

                if (currentBestMatch < bestStringMatch) {
                    bestStringMatch = currentBestMatch;
                    return inventory;
                }

                return bestMatch;
            },
            inventories.find(([_, {data}]) => {
                const {content, size} = data as {
                    content: ({name: string; count: number; maxCount: string} | null)[];
                    size: number;
                };
                if (content == null) return size > 0;

                for (let i = 0; i < size; i++) {
                    const invItem = content[i];
                    if (invItem == null) return true;
                    if (invItem.name === item.name) return true;
                }

                return false;
            }) ?? null
        );
        if (bestMatchingInventory == null) return;
        const [bestMatchingSide] = bestMatchingInventory;
        await this.turtle.select(slot);

        switch (bestMatchingSide) {
            case 'front':
                await (async () => {
                    const [didDrop, dropMessage] = await this.turtle.drop();
                    if (!didDrop) throw new Error(dropMessage);

                    await this.turtle.connectToInventory('front');
                })();
                break;
            case 'top':
                await (async () => {
                    const [didDrop, dropMessage] = await this.turtle.dropUp();
                    if (!didDrop) throw new Error(dropMessage);

                    await this.turtle.connectToInventory('top');
                })();
                break;
            case 'bottom':
                await (async () => {
                    const [didDrop, dropMessage] = await this.turtle.dropDown();
                    if (!didDrop) throw new Error(dropMessage);

                    await this.turtle.connectToInventory('bottom');
                })();
                break;
            case 'left':
                await (async () => {
                    await this.turtle.turnLeft();
                    const [didDrop, dropMessage] = await this.turtle.drop();
                    if (!didDrop) throw new Error(dropMessage);

                    await this.turtle.connectToInventory('front');
                })();
                break;
            case 'right':
                await (async () => {
                    await this.turtle.turnRight();
                    const [didDrop, dropMessage] = await this.turtle.drop();
                    if (!didDrop) throw new Error(dropMessage);

                    await this.turtle.connectToInventory('front');
                })();
                break;
            case 'back':
                await (async () => {
                    await this.turtle.turnLeft();
                    await this.turtle.turnLeft();
                    const [didDrop, dropMessage] = await this.turtle.drop();
                    if (!didDrop) throw new Error(dropMessage);

                    await this.turtle.connectToInventory('front');
                })();
                break;
            default:
                const connectedHub = hubs.find(([_, {data}]) =>
                    (data as {remoteNames: string[]})?.remoteNames?.includes(bestMatchingSide)
                );
                if (connectedHub) {
                    const [_, {data}] = connectedHub;
                    const [pulledItemCount] = await this.turtle.usePeripheralWithSide<[number]>(
                        bestMatchingSide,
                        'pullItems',
                        (data as {localName: string}).localName,
                        slot
                    );
                    if (pulledItemCount < 1) throw new Error(`Unable to transfer to '${bestMatchingSide}'`);

                    await this.turtle.connectToInventory(bestMatchingSide);
                }
                break;
        }
    }

    protected async *transferIntoNearbyInventories(): AsyncGenerator<void> {
        if (
            !Object.values(this.turtle.peripherals).some(({types}) => {
                if (types.includes('inventory')) {
                    return true;
                }

                return false;
            })
        ) {
            throw new Error('No inventory to empty into');
        }

        // Has any items in inventory?
        let itemsInInventory = 0;
        for (let slot = 1; slot < 16; slot++) {
            if (this.turtle.inventory[slot]) itemsInInventory++;
        }

        if (itemsInInventory < 1) {
            yield;
            return; // Done!
        }

        for (let slot = 1; slot < 16; slot++) {
            for await (const _ of this.transferSlotIntoNearbyInventories(slot)) {
                yield;
            }
        }
    }

    protected async *goToDestinations(
        destinations: Point[],
        options?: {
            isBlockMineableFunc?: IsBlockMineableFunc;
            noInspect?: boolean;
            boundaries?: Boundaries;
        }
    ): AsyncGenerator<void> {
        const {location} = this.turtle;
        if (location === null) {
            throw new Error('Missing location');
        }

        const algorithm = new DStarLite(this.turtle.serverId, {
            isBlockMineableFunc: options?.isBlockMineableFunc,
            boundaries: options?.boundaries,
        });
        let solution = await algorithm.search(new Point(location.x, location.y, location.z), destinations);
        if (solution === null) {
            yield;
            return;
        }

        while (solution !== null) {
            const [didMoveToNode, failedMoveMessage] = await this.moveToNode(solution, options?.noInspect);
            if (didMoveToNode) {
                solution = solution.parent;
                yield;
                continue;
            } else {
                throw new DestinationError(solution, failedMoveMessage);
            }
        }
    }

    protected async moveToNode(s: Node, noInspect?: boolean): Promise<[true, undefined] | [false, string]> {
        const {x, y, z} = this.turtle.location as Location;
        if (s.point.y - y > 0) {
            const [didMoveUp, upMessage] = await this.turtle.up();
            if (didMoveUp) return [true, undefined];

            if (upMessage === 'Out of fuel') {
                await this.turtle.getFuelLevel();
                return [false, upMessage];
            }

            // We don't know what the other potential errors are!
            if (noInspect || upMessage !== 'Movement obstructed') return [false, upMessage as string];

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
            if (noInspect || downMessage !== 'Movement obstructed') return [false, downMessage as string];

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
            if (noInspect || forwardMessage !== 'Movement obstructed') return [false, forwardMessage as string];

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
