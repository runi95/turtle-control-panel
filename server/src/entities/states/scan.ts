import {deleteBlocks, upsertBlocks} from '../../db';
import {Block} from '../../db/block.type';
import {Location} from '../../db/turtle.type';
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
        id: TURTLE_STATES.SCANNING,
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
        if (hasGeoScanner) {
            yield* this.geoScanner();
        }

        const [hasUniversalScanner] = await this.turtle.hasPeripheralWithName('universal_scanner');
        if (hasUniversalScanner) {
            yield* this.universalScanner();
        }

        const [hasBlockScanner] = await this.turtle.hasPeripheralWithName('plethora:scanner');
        if (hasBlockScanner) {
            yield* this.blockScanner();
        }

        throw new Error('No Scanner to scan with');
    }

    private async *geoScanner() {
        yield;

        let [cooldown] = await this.turtle.usePeripheralWithName<[number]>(
            'geoScanner',
            'getOperationCooldown',
            '"scanBlocks"'
        );
        while (cooldown > 0) {
            await this.turtle.sleep(Math.min(1, Math.ceil(cooldown / 100) / 10));
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

        const {x, y, z} = this.turtle.location as Location;
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
                            z: k + z,
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

    private async *universalScanner() {
        yield;

        let [cooldown] = await this.turtle.usePeripheralWithName<[number]>(
            'universal_scanner',
            'getCooldown',
            '"portableUniversalScan"'
        );
        while (cooldown > 0) {
            await this.turtle.sleep(Math.min(1, Math.ceil(cooldown / 100) / 10));
            cooldown -= 1000;
            yield;
        }

        const [scannedBlocks, scanMessage] = await this.turtle.usePeripheralWithName<
            [(Block & {x: number; y: number; z: number})[], string]
        >('universal_scanner', 'scan', '"block"', `${scanSize}`);
        if (scannedBlocks === null) {
            throw new Error(scanMessage);
        }

        yield;

        const {x, y, z} = this.turtle.location as Location;
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
                            z: k + z,
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

    private async *blockScanner() {
        yield;

        const [scannedBlocks, scanMessage] = await this.turtle.usePeripheralWithName<
            [(Block & {x: number; y: number; z: number})[], string]
        >('plethora:scanner', 'scan');
        if (scannedBlocks === null) {
            throw new Error(scanMessage);
        }

        yield;

        const {x, y, z} = this.turtle.location as Location;
        const blocks = [];
        const existingBlocks = new Map<string, boolean>();
        for (const scannedBlock of scannedBlocks) {
            if (scannedBlock.x === 0 && scannedBlock.y === 0 && scannedBlock.z === 0) continue;
            if (scannedBlock.name === 'minecraft:air') continue;
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
                            z: k + z,
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
