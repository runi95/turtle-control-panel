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

    public async *act() {
        while (true) {
            if (this.turtle.location === null) {
                this.turtle.error = 'Unable to mine without knowing turtle location';
                return;
            }
    
            if (this.turtle.selectedSlot !== 1) {
                await this.turtle.select(1); // Ensures proper item stacking
                yield;
            }
    
            if (this.remainingAreaIndexes.length === 0) {
                this.turtle.state = null;
                return; // Done!
            }
    
            if (!this.isInOrAdjacentToMiningArea) {
                if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                    this.isInOrAdjacentToMiningArea = true;
                    yield;
                }
    
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
    
                    if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                        this.isInOrAdjacentToMiningArea = true;
                        this.solution = null;
                        break;
                    }
                }
            }
    
            const {x, y, z} = this.turtle.location;
            const areaIndexOfTurtle = this.remainingAreaIndexes.findIndex((i) => this.area[i].x === x && this.area[i].y === y && this.area[i].z === z);
            if (areaIndexOfTurtle > -1) {
                this.remainingAreaIndexes.splice(areaIndexOfTurtle, 1);
            }
    
            for await (const err of this.goToDestinations(this.remainingAreaIndexes.map((i) => this.area[i]))) {
                if (err === 'Cannot break unbreakable block') {
                    const areaIndexOfNode = this.remainingAreaIndexes.findIndex((i) => this.area[i].x === this.solution?.point?.x && this.area[i].y === this.solution?.point?.y && this.area[i].z === this.solution?.point?.z);
                    if (areaIndexOfNode > -1) {
                        this.remainingAreaIndexes.splice(areaIndexOfNode, 1);
                    }
    
                    break;
                }
    
                switch (err) {
                    case 'Movement obstructed':
                    case undefined:
                        yield;
                        break;
                    default:
                        this.turtle.error = err;
                        return; // Error
                }
    
                if (this.checkIfTurtleIsInOrAdjacentToArea()) {
                    this.isInOrAdjacentToMiningArea = true;
                    this.solution = null;
                    break;
                }
            }
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
