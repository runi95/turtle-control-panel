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
    public error: string | null = null;

    private readonly area: Location[];
    private readonly algorithm: DStarLite;
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
        this.algorithm = new DStarLite(this.turtle.serverId);
    }

    public async act() {
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
                this.solution = await this.algorithm.search(new Point(x, y, z), this.area);
                return; // Yield
            }

            const didMoveToNode = await this.moveToNode(this.solution);
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
                    this.turtle.error = 'Inventory is full';
                    return; // Error
                }

                if (block.state.age === farmingBlockToFarmingDetails.maxAge) {
                    await this.farmBlock(farmingBlockToFarmingDetails.seed);
                    this.remainingAreaIndexes.splice(farmlandIndexOfBlock, 1);
                }

                this.noop = 0;
            }

            return; // Yield
        }

        if (this.solution === null) {
            this.solution = await this.algorithm.search(
                new Point(x, y, z),
                this.remainingAreaIndexes.map((i) => this.area[i])
            );
            return; // Yield
        }

        const didMoveToNode = await this.moveToNode(this.solution);
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
        const initialItemCount = Object.values(this.turtle.inventory).reduce(
            (acc, curr) => acc + (curr?.count || 0),
            0
        );
        const [didDigDown] = await this.turtle.digDown();
        if (didDigDown) {
            const currentItemCount = Object.values(this.turtle.inventory).reduce(
                (acc, curr) => acc + (curr?.count || 0),
                0
            );
            if (currentItemCount === initialItemCount) {
                this.turtle.error = 'Inventory is full';
                return;
            }

            const didSelectSeed = await this.selectItemOfType(seedTypeName);
            if (didSelectSeed) {
                await this.turtle.placeDown();
            }
        }
    }
}
