import {getArea} from '../../db';
import {Location} from '../../db/turtle.type';
import DStarLite from '../../dlite';
import {Node} from '../../dlite/Node';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface MiningStateData {
    readonly id: TURTLE_STATES;
    areaId: number;
    currentAreaFarmIndex: number;
}

export class TurtleMiningState extends TurtleBaseState<MiningStateData> {
    public readonly name = 'mining';
    public data: MiningStateData;
    public warning: string | null = null;

    private readonly area: Location[];
    private readonly mineableBlockMap = new Map<string, boolean>();
    private readonly algorithm: DStarLite;
    private isInOrAdjacentToMiningArea: boolean = false;
    private solution: Node | null = null;
    private remainingAreaIndexes: number[] = [];

    constructor(turtle: Turtle, data: Omit<MiningStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.MINING
        };
        this.area = getArea(this.turtle.serverId, this.data.areaId).area;
        this.remainingAreaIndexes = Array.from(Array(this.area.length).keys());

        for (const loc of this.area) {
            this.mineableBlockMap.set(`${loc.x},${loc.y},${loc.z}`, true);
        }

        this.algorithm = new DStarLite(this.turtle.serverId, {
            isBlockMineableFunc: (x, y, z, _block) => !!this.mineableBlockMap.get(`${x},${y},${z}`)
        });
    }

    private checkIfTurtleIsInOrAdjacentToArea(): boolean {
        const {x, y, z} = this.turtle.location as Location;
        return this.area.some(({x: areaX, y: areaY, z: areaZ}) => {
            if (areaX === x && areaY === y && areaZ === z) return true;
            if ((areaX === x + 1 || areaX === x - 1) && areaY === y && areaZ === z) return true;
            if (areaX === x && (areaY === y + 1 || areaY === y - 1) && areaZ === z) return true;
            if (areaX === x && areaY === y && (areaZ === z + 1 || areaZ === z - 1)) return true;
            return false;
        })
    }

    public async act() {
        if (this.turtle.location === null) {
            this.turtle.error = 'Unable to mine without knowing turtle location';
            return;
        }

        if (this.turtle.selectedSlot !== 1) {
            await this.turtle.select(1); // Ensures proper item stacking
        }

        if (this.remainingAreaIndexes.length === 0) {
            this.turtle.state = null;
            return; // Done!
        }

        if (!this.isInOrAdjacentToMiningArea) {
            if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                this.isInOrAdjacentToMiningArea = true;
                return;
            }

            if (this.solution === null) {
                const {x, y, z} = this.turtle.location;
                const solution = await this.algorithm.search(new Point(x, y, z), this.area);
                if (solution === undefined) {
                    this.turtle.error = 'Stuck; unable to reach destination';
                    return; // Error
                }

                this.solution = solution; 
                return; // Yield
            }

            const [didMoveToNode, failedMoveMessage] = await this.moveToNode(this.solution);
            if (!didMoveToNode) {
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
                    default:
                        this.turtle.error = failedMoveMessage;
                        return; // Error
                }
            }

            this.solution = this.solution.parent;
            if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                this.isInOrAdjacentToMiningArea = true;
                this.solution = null;
            }

            return; // Yield
        }

        const {x, y, z} = this.turtle.location;
        if (this.solution === null) {
            const areaIndexOfTurtle = this.remainingAreaIndexes.findIndex((i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z);
            if (areaIndexOfTurtle > -1) {
                this.remainingAreaIndexes.splice(areaIndexOfTurtle, 1);
            }

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
        if (!didMoveToNode) {
            switch (failedMoveMessage) {
                case 'Movement obstructed':
                    this.solution = null;
                    return; // Yield
                case 'Cannot break unbreakable block':
                    const areaIndexOfNode = this.remainingAreaIndexes.findIndex((i) => this.area[i].x === this.solution?.point?.x && this.area[i].y === this.solution?.point?.y && this.area[i].z === this.solution?.point?.z);
                    if (areaIndexOfNode > -1) {
                        this.remainingAreaIndexes.splice(areaIndexOfNode, 1);
                    }
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

        this.solution = this.solution.parent;
        if (
            this.remainingAreaIndexes.findIndex(
                (i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z
            )
        ) {
            this.solution = null;
        }
    }

    // public static async mineInDirection(turtle: Turtle, mineTarget: 'Up' | 'Down' | 'North' | 'East' | 'South' | 'West') {
    //     switch (mineTarget) {
    //         case 'Up':
    //             await turtle.digUp();
    //             await turtle.suckUp();
    //             break;
    //         case 'Down':
    //             await turtle.digDown();
    //             await turtle.suckDown();
    //             break;
    //         case 'North':
    //         case 'East':
    //         case 'South':
    //         case 'West':
    //             await turtle.turnToDirection({North: 2, East: 3, South: 4, West: 1}[mineTarget]);
    //             await turtle.dig();
    //             await turtle.suck();
    //             break;
    //     }
    // }
}
