import {getBlock} from '../../db';
import {Block} from '../../db/block.type';
import {Direction, ItemDetail, Location} from '../../db/turtle.type';
import {DestinationError} from '../../dlite';
import {Point} from '../../dlite/Point';
import {LinkedList, Node} from '../../helpers/linked-list';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

type BlockWithKey = Omit<Block, 'tags'> & {key: string};

export interface BuildStateData {
    readonly id: TURTLE_STATES;
    readonly blocks: Omit<Block, 'tags'>[];
}
export class TurtleBuildingState extends TurtleBaseState<BuildStateData> {
    public readonly name = 'building';
    public data: BuildStateData;

    private isInOrAdjacentToBuildingArea: boolean = false;
    private blocks: Map<string, LinkedList<Omit<Block, 'tags'>>>;
    private disabledKeysMap: Map<string, boolean> = new Map();

    constructor(turtle: Turtle, data: Omit<BuildStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.BUILDING,
        };

        const filteredDataBlocks = data.blocks.filter(({x, y, z, name}) => {
            const existingBlock = getBlock(this.turtle.serverId, x, y, z);
            if (existingBlock == null) return true;
            if (existingBlock.name === name) return false;

            return true;
        });

        this.blocks = new Map<string, LinkedList<Omit<Block, 'tags'>>>();
        for (const block of filteredDataBlocks) {
            const key = `${block.x},${block.z}`;
            const existingList = this.blocks.get(key);
            if (existingList != null) {
                existingList.add(block);
            } else {
                const newList = new LinkedList<Omit<Block, 'tags'>>();
                newList.add(block);
                this.blocks.set(key, newList);
            }
        }
    }

    private checkIfTurtleIsInOrAdjacentToArea(): boolean {
        const {x, y, z} = this.turtle.location as Location;
        for (const blockList of this.blocks.values()) {
            const block = blockList.peek();
            if (block == null) continue;

            const {x: areaX, y: areaY, z: areaZ} = block;
            if (areaX === x && areaY === y && areaZ === z) return true;
            if ((areaX === x + 1 || areaX === x - 1) && areaY === y && areaZ === z) return true;
            if (areaX === x && (areaY === y + 1 || areaY === y - 1) && areaZ === z) return true;
            if (areaX === x && areaY === y && (areaZ === z + 1 || areaZ === z - 1)) return true;
        }

        return false;
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

            const buildingMaterials = new Map<string, number>();
            const optionalBuildingMaterials = new Map<string, number>();
            let hasAnyNonEmptyList = false;
            for (const blockList of this.blocks.values()) {
                const blockNode = blockList.getFirstNode();
                if (blockNode == null) continue;
                const block = blockNode.item;
                if (block == null) continue;
                if (this.disabledKeysMap.get(`${block.x},${block.z}`) === true) continue;

                hasAnyNonEmptyList = true;
                buildingMaterials.set(block.name, (buildingMaterials.get(block.name) ?? 0) + 1);

                let next: Node<Omit<Block, 'tags'>> | null = blockNode;
                while ((next = next.next) != null) {
                    const nextBlock = next.item;
                    if (nextBlock == null) continue;

                    optionalBuildingMaterials.set(
                        nextBlock.name,
                        (optionalBuildingMaterials.get(nextBlock.name) ?? 0) + 1
                    );
                }
            }

            if (!hasAnyNonEmptyList) break;

            // Has any building material for current layer?
            if (
                !Object.values(this.turtle.inventory).some((item: ItemDetail) => {
                    if (item == null) return false;
                    const requiredItemCount = buildingMaterials.get(item.name);
                    if (requiredItemCount == null) return false;
                    return requiredItemCount > 0;
                })
            ) {
                // Return home?
                const home = this.turtle.home;
                if (home === null) {
                    throw new Error('No turtle home set to collect materials from');
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
                let didPullAnyItems = false;
                for (const [itemName, itemCount] of buildingMaterials.entries()) {
                    try {
                        for await (const _ of this.pullItemFromNearbyInventories(itemName, itemCount)) {
                            yield;
                        }

                        didPullAnyItems = true;
                    } catch (err) {
                        if (typeof err === 'string') {
                            this.warning = err;
                        } else {
                            this.warning = (err as Error).message;
                        }
                    }
                }

                if (!didPullAnyItems) {
                    yield;
                    await this.turtle.sleep(5);
                    yield;

                    continue;
                }

                for (const [itemName, itemCount] of optionalBuildingMaterials.entries()) {
                    try {
                        for await (const _ of this.pullItemFromNearbyInventories(itemName, itemCount)) {
                            yield;
                        }
                    } catch (err) {
                        if (typeof err === 'string') {
                            this.warning = err;
                        } else {
                            this.warning = (err as Error).message;
                        }
                    }
                }

                // Ensures inventory has updated
                await this.turtle.sleep(1);

                // Got no new items
                if (
                    !Object.values(this.turtle.inventory).some((item) => {
                        if (item == null) return false;
                        const remaining = buildingMaterials.get(item.name);
                        if (remaining == null) return false;
                        return remaining > 0;
                    })
                )
                    throw new Error(
                        `Missing (${buildingMaterials.size}) [${Array.from(buildingMaterials.keys()).join(', ')}]`
                    );
            }

            const inventoryItems = (Object.values(this.turtle.inventory) as ItemDetail[]).reduce((acc, curr) => {
                if (curr == null) return acc;

                acc.add(curr.name);
                return acc;
            }, new Set<string>());

            const destinations: BlockWithKey[] = [];
            for (const [key, blockList] of this.blocks.entries()) {
                const block = blockList.peek();
                if (block == null) continue;
                if (!inventoryItems.has(block.name)) continue;
                if (this.disabledKeysMap.get(key) === true) continue;

                destinations.push({
                    ...block,
                    key,
                });
            }

            // Get to the building area!
            if (!this.isInOrAdjacentToBuildingArea) {
                if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                    this.isInOrAdjacentToBuildingArea = true;
                    yield;
                }

                try {
                    for await (const _ of this.goToDestinations(destinations)) {
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
                    destinations.map(({x, y, z}) => ({
                        x,
                        y: y + 1,
                        z,
                    }))
                )) {
                    yield;
                }

                const {x, y, z} = this.turtle.location;
                let currentBlock: BlockWithKey | null = null;
                for (const destination of destinations) {
                    if (destination.x !== x) continue;
                    if (destination.z !== z) continue;
                    if (destination.y !== y - 1) continue;

                    currentBlock = destination;
                    break;
                }

                if (currentBlock == null) {
                    yield;
                    continue;
                }

                const itemSlot = Object.values(this.turtle.inventory).findIndex((item) => {
                    if (item == null) return false;
                    return currentBlock.name === item.name;
                });
                if (!(itemSlot > -1)) continue;

                if (itemSlot + 1 !== this.turtle.selectedSlot) {
                    await this.turtle.select(itemSlot + 1);
                    yield;
                }

                const blockList = this.blocks.get(currentBlock.key);
                if (blockList == null) {
                    yield;
                    continue;
                }

                const blockToPlace = blockList.peek();
                if (blockToPlace == null) {
                    yield;
                    continue;
                }

                const blockState = blockToPlace.state;
                if (blockState != null) {
                    const facing = blockState['facing'];
                    switch (facing) {
                        case 'north':
                            await this.turtle.turnToDirection(Direction.South);
                            break;
                        case 'east':
                            await this.turtle.turnToDirection(Direction.West);
                            break;
                        case 'south':
                            await this.turtle.turnToDirection(Direction.North);
                            break;
                        case 'west':
                            await this.turtle.turnToDirection(Direction.East);
                            break;
                    }
                }

                const [didPlaceDown, placeDownMessage] = await this.turtle.placeDown();
                if (!didPlaceDown) {
                    this.warning = placeDownMessage;
                    yield;

                    this.disabledKeysMap.set(currentBlock.key, true);

                    continue;
                }

                blockList.poll();
                this.disabledKeysMap.clear();
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
