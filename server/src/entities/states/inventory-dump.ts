import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface InventoryDumpStateData {
    readonly id: TURTLE_STATES;
}

export class TurtleInventoryDumpState extends TurtleBaseState<InventoryDumpStateData> {
    public readonly id = TURTLE_STATES.INVENTORY_DUMP;
    public readonly name = 'dumping inventory';
    public data = {
        id: TURTLE_STATES.INVENTORY_DUMP,
    };
    public warning: string | null = null;

    constructor(turtle: Turtle) {
        super(turtle);
    }

    public async *act() {
        for await (const _ of this.transferIntoNearbyInventories()) {
            yield;
        }
    }
}
