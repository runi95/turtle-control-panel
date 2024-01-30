import {ExtractionStateData} from './extraction';
import {FarmingStateData} from './farming';
import {GoHomeStateData} from './gohome';
import {MiningStateData} from './mining';
import {MovingStateData} from './move';
import {RefuelingStateData} from './refueling';
import {ScanningStateData} from './scan';

export enum TURTLE_STATES {
    REFUELING = 1,
    MINING = 2,
    MOVING = 3,
    FARMING = 4,
    SCANNING = 5,
    GO_HOME = 6,
    EXTRACTION = 7,
    BUILDING = 8,
};

export type StateDataTypes = FarmingStateData | MovingStateData | MiningStateData | RefuelingStateData | ScanningStateData | GoHomeStateData | ExtractionStateData;
