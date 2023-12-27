import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface RefuelingStateData {
    readonly id: TURTLE_STATES;
} 

export class TurtleRefuelingState extends TurtleBaseState<RefuelingStateData> {
    public readonly name = 'refueling';
    public data = {
        id: TURTLE_STATES.REFUELING
    };

    public error: string | null = null;

    constructor(turtle: Turtle) {
        super(turtle);
    }

    public async act() {
        const currentFuelLevel = this.turtle.fuelLevel;
        if (currentFuelLevel > 0.8 * this.turtle.fuelLimit) {
            this.turtle.state = null;
            return;
        }

        // Attempt to refuel with whatever is currently in the inventory
        const currentlySelectedSlot = this.turtle.selectedSlot;
        for (let i = 0; i < 15; i++) {
            await this.turtle.select(((currentlySelectedSlot + i + 1) % 16) + 1);
            await this.turtle.refuel();
        }

        // TODO: Attempt to locate a fuel station if possible

        // Refuel successful! (refuelled to 10% or above)
        if (this.turtle.fuelLevel > this.turtle.fuelLimit * 0.1) {
            this.turtle.state = null;
            return;
        }

        // Failed to refuel, request help
        this.turtle.error = 'Out of fuel';
    }
}