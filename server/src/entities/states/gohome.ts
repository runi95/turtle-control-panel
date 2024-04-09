import {DestinationError} from '../../dlite';
import {Point} from '../../dlite/Point';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface GoHomeStateData {
    readonly id: TURTLE_STATES;
} 

export class TurtleGoHomeState extends TurtleBaseState<GoHomeStateData> {
    public readonly name = 'returning home';
    public data = {
        id: TURTLE_STATES.GO_HOME
    };
    public warning: string | null = null;

    constructor(turtle: Turtle) {
        super(turtle);
    }

    public async *act() {
        if (this.turtle.location === null) {
            throw new Error('Unable to go home without knowing turtle location');
        }

        const home = this.turtle.home;
        if (home === null) throw new Error('Turtle has no home');

        while (true) {
            try {
                for await (const _ of this.goToDestinations([new Point(home.x, home.y, home.z)])) {
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
