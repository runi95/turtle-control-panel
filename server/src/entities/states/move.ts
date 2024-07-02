import DStarLite, {DestinationError} from '../../dlite';
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

    private readonly algorithm: DStarLite;
    private solution: Node | null = null;

    constructor(turtle: Turtle, data: Omit<MovingStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.MOVING,
        };
        this.algorithm = new DStarLite(this.turtle.serverId);
    }

    public async *act() {
        while (true) {
            try {
                for await (const _ of this.goToDestinations([new Point(this.data.x, this.data.y, this.data.z)])) {
                    yield;
                }
                return;
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
