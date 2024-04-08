import {deleteBlocks, upsertBlocks} from '../../db';
import {Block} from '../../db/block.type';
import globalEventEmitter from '../../globalEventEmitter';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface ScanningStateData {
    readonly id: TURTLE_STATES;
}

const scanSize = 16;

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

        let [cooldown] = await this.turtle.usePeripheralWithName<[number]>('geoScanner', 'getOperationCooldown', '"scanBlocks"');
        while (cooldown > 0) {
            await this.turtle.sleep(Math.min(1, (Math.ceil(cooldown / 100) / 10)));
            cooldown -= 1000;
            yield;
        }

        const [scannedBlocks, scanMessage] = await this.turtle.usePeripheralWithName<
            [(Block & {x: number; y: number; z: number})[], string]
        >('geoScanner', 'scan', `${scanSize}`);
        if (scannedBlocks === null) {
            throw new Error(scanMessage);
        }

        yield;

        const {x, y, z} = this.turtle.location;
        const blocks = [];
        const existingBlocks = new Map<string, boolean>();
        for (const scannedBlock of scannedBlocks) {
            if (scannedBlock.x === 0 && scannedBlock.y === 0 && scannedBlock.z === 0) continue;
            if (scannedBlock.name === 'computercraft:turtle_advanced') continue;
            if (scannedBlock.name === 'computercraft:turtle_normal') continue;
            blocks.push({
                ...scannedBlock,
                x: scannedBlock.x + x,
                y: scannedBlock.y + y,
                z: scannedBlock.z + z,
            });
            existingBlocks.set(`${scannedBlock.x},${scannedBlock.y},${scannedBlock.z}`, true);
        }

        const deletedBlocks = [];
        for (let i = -scanSize; i < scanSize; i++) {
            for (let j = -scanSize; j < scanSize; j++) {
                for (let k = -scanSize; k < scanSize; k++) {
                    if (!existingBlocks.get(`${i + x},${j + y},${k + z}`)) {
                        deletedBlocks.push({
                            x: i + x,
                            y: j + y,
                            z: k + z
                        });
                    }
                }
            }
        }

        deleteBlocks(this.turtle.serverId, deletedBlocks);
        upsertBlocks(this.turtle.serverId, blocks);
        globalEventEmitter.emit('wupdate', {
            serverId: this.turtle.serverId,
            blocks,
            deletedBlocks,
        });
    }
}
