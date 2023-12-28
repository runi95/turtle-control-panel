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
    public error: string | null = null;

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

    public async act() {
        if (this.turtle.location === null) {
            this.turtle.error = 'Unable to move without knowing turtle location';
            return;
        }

        const {x, y, z} = this.turtle.location;
        if (this.data.x === x && this.data.y === y && this.data.z === z) {
            this.turtle.state = null;
            return; // Done
        }

        if (this.solution === null) {
            this.solution = await this.algorithm.search(
                new Point(x, y, z),
                [new Point(this.data.x, this.data.y, this.data.z)]
            );
            return; // Yield
        }

        const didMoveToNode = await this.moveToNode(this.solution);
        if (didMoveToNode) {
            this.solution = this.solution.parent;
            return; // Yield
        } else {
            this.turtle.error = 'Unable to move';
            return;
        }
    }
}
