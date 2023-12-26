import {Turtle} from '../turtle';
import {StateData, TurtleBaseState} from './base';
import {FarmingStateData, TurtleFarmingState} from './farming';
import {MiningStateData, TurtleMiningState} from './mining';
import {MovingStateData, TurtleMoveState} from './move';
import {RefuelingStateData, TurtleRefuelingState} from './refueling';
import {ScanningStateData, TurtleScanState} from './scan';

export enum TURTLE_STATES {
    REFUELING = 1,
    MINING = 2,
    MOVING = 3,
    FARMING = 4,
    SCANNING = 5
};

export type StateDataTypes = FarmingStateData | MovingStateData | MiningStateData | RefuelingStateData | ScanningStateData;
