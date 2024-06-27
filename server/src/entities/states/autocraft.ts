import {Inventory, ItemDetail} from '../../db/turtle.type';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface AutocraftStateData {
    readonly id: TURTLE_STATES;
    recipe: Inventory;
}

export class TurtleAutocraftState extends TurtleBaseState<AutocraftStateData> {
    public readonly id = TURTLE_STATES.AUTO_CRAFT;
    public readonly name = 'auto crafting';
    public data;
    public warning: string | null = null;

    constructor(turtle: Turtle, data: Omit<AutocraftStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.AUTO_CRAFT,
        };
    }

    public async *act() {
        const [hasCraftingTable] = await this.turtle.hasPeripheralWithName('workbench');
        if (!hasCraftingTable) throw new Error('Unable to auto craft without a Crafting Table');

        const [didInitialCraft, initialCraftMessage] = await this.turtle.usePeripheralWithName<[boolean, string]>(
            'workbench',
            'craft',
            '0'
        );
        if (!didInitialCraft) {
            throw new Error(initialCraftMessage);
        }

        while (true) {
            const [didCraft, craftMessage] = await this.turtle.usePeripheralWithName<[boolean, string]>(
                'workbench',
                'craft'
            );
            if (!didCraft) {
                throw new Error(craftMessage);
            }

            await this.turtle.sleep(0.1);

            for await (const _ of this.transferIntoNearbyInventories()) {
                yield;
            }

            let hasAllItems = false;
            while (!hasAllItems) {
                hasAllItems = true;
                for (let i = 1; i <= 16; i++) {
                    const item = this.data.recipe[i];
                    if (item == null) continue;
                    if (item.name === this.turtle.inventory[i]?.name) continue;

                    try {
                        await this.turtle.updateAllAttachedPeripherals(this.turtle.peripherals);
                        for await (const _ of this.pullItemsFromNearbyInventories(item, i)) {
                            yield;
                        }
                    } catch (err) {
                        if (typeof err === 'string') {
                            this.warning = err;
                        } else {
                            this.warning = (err as Error).message;
                        }

                        await this.turtle.sleep(5);
                        hasAllItems = false;
                        break;
                    }
                }
            }
        }
    }

    private async *pullItemsFromNearbyInventories(item: ItemDetail, slotNumber: number): AsyncGenerator<void> {
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

        let hasPulledItemFromInventories = false;
        let {count, name: itemName} = item;
        for (const [side, {data}] of inventories) {
            // Have we gotten all the items we need?
            if (count < 1) break;

            let {content, size} = data as {
                content: ({name: string; count: number; maxCount: string} | null)[];
                size: number;
            };

            // Is inventory missing item content?
            if (content == null) continue;

            for (let j = 0; j < size; j++) {
                const item = content[j];

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
                        if (j > 0) {
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
                                j + 1,
                                null,
                                1
                            );
                            if (pushedItemCount === item.count) {
                                content[0] = item;
                                content[j] = null;
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

                        await this.turtle.select(slotNumber);
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
                                j + 1,
                                count,
                                slotNumber
                            );
                            if (pushedItemCount > 0) {
                                hasPulledItemFromInventories = true;
                                count -= pushedItemCount;

                                if (item.count <= pushedItemCount) {
                                    content[j] = null;
                                } else {
                                    item.count -= pushedItemCount;
                                }
                            }
                        }
                        break;
                }
            }

            if (!hasPulledItemFromInventories) {
                throw new Error('No nearby inventory has the specified item');
            }
        }
    }
}
