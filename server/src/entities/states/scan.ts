import {upsertBlocks} from '../../db';
import {Block} from '../../db/block.type';
import globalEventEmitter from '../../globalEventEmitter';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface ScanningStateData {
    readonly id: TURTLE_STATES;
}

export class TurtleScanState extends TurtleBaseState<ScanningStateData> {
    public readonly id = TURTLE_STATES.SCANNING;
    public readonly name = 'scanning';
    public data = {
        id: TURTLE_STATES.SCANNING
    };
    public warning: string | null = null;

    constructor(turtle: Turtle) {
        super(turtle);
    }

    public async *act() {
        if (this.turtle.location === null) {
            throw new Error('Unable to scan without knowing turtle location');
        }

        const [hasGeoScanner] = await this.turtle.hasPeripheralWithName('geoScanner');
        if (!hasGeoScanner) {
            throw new Error('No Geo Scanner to scan with (requires Advanced Peripherals mod)');
        }

        yield;

        const [scannedBlocks, scanMessage] = await this.turtle.usePeripheralWithName<
            [(Block & {x: number; y: number; z: number})[], string]
        >('geoScanner', 'scan', '16');
        if (scannedBlocks === null) {
            throw new Error(scanMessage);
        }

        yield;

        const {x, y, z} = this.turtle.location;
        const blocks = scannedBlocks
            .filter((scannedBlock) => scannedBlock.x !== 0 || scannedBlock.y !== 0 || scannedBlock.z !== 0)
            .map((scannedBlock) => ({
                ...scannedBlock,
                x: scannedBlock.x + x,
                y: scannedBlock.y + y,
                z: scannedBlock.z + z,
            }));

        upsertBlocks(this.turtle.serverId, blocks);
        globalEventEmitter.emit('wupdate', {
            serverId: this.turtle.serverId,
            blocks,
        });
    }
}
