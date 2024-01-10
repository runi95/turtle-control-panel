import DStarLite from '../../dlite';
import {Node} from '../../dlite/Node';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface MovingStateData {
    readonly id: TURTLE_STATES;
    x: number;
    y: number;
    z: number;
}

export class TurtleMoveState extends TurtleBaseState<MovingStateData> {
    public readonly name = 'moving';
    public data: MovingStateData;
    public warning: string | null = null;

    private readonly algorithm: DStarLite;
    private solution: Node | null = null;

    constructor(turtle: Turtle, data: Omit<MovingStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.MOVING
        };
        this.algorithm = new DStarLite(this.turtle.serverId);
    }

    public async *act() {
        while (true) {
            for await (const err of this.goToDestinations([new Point(this.data.x, this.data.y, this.data.z)])) {
                switch (err) {
                    case 'Movement obstructed':
                        yield;
                        break;
                    case undefined:
                        return;
                    default:
                        this.turtle.error = err;
                        return;
                }
            }
        }
    }
}
