import {deleteBlock, upsertBlock} from '../../db';
import {Block} from '../../db/block.type';
import {Direction, Location} from '../../db/turtle.type';
import {Boundaries, DestinationError} from '../../dlite';
import globalEventEmitter from '../../globalEventEmitter';
import {Turtle} from '../turtle';
import {TurtleBaseState} from './base';
import {TURTLE_STATES} from './helpers';

export interface ExploreStateData {
    readonly id: TURTLE_STATES;
    readonly startChunk: {
        x: number;
        z: number;
    };
}
export class TurtleExploringState extends TurtleBaseState<ExploreStateData> {
    public readonly name = 'exploring';
    public data: ExploreStateData;
    public warning: string | null = null;

    private chunkOffsetIndex = 0;

    constructor(turtle: Turtle, data: Omit<ExploreStateData, 'id'>) {
        super(turtle);

        this.data = {
            ...data,
            id: TURTLE_STATES.EXPLORING,
        };
    }

    private async exploreSurroundings(x: number, y: number, z: number, locationsToExplore: Location[]) {
        const locationIndex = locationsToExplore.findIndex((loc) => loc.x === x && loc.y === y && loc.z === z);
        if (locationIndex > 0) {
            locationsToExplore.splice(locationIndex, 1)
        }

        const [exploreUp, exploreDown, exploreFront] = await this.turtle.explore();

        const blocks: Block[] = [];
        const deletedBlocks: Location[] = [];

        const upIndex = locationsToExplore.findIndex((loc) => loc.x === x && loc.y === y + 1 && loc.z === z);
        if (upIndex > -1) {
            locationsToExplore.splice(upIndex, 1);
        }

        if (exploreUp != null) {
            upsertBlock(
                this.turtle.serverId,
                x,
                y + 1,
                z,
                exploreUp.name,
                exploreUp.state,
                exploreUp.tags
            );
            blocks.push({
                x,
                y: y + 1,
                z,
                name: exploreUp.name,
                state: exploreUp.state,
                tags: exploreUp.tags,
            });
        } else {
            deleteBlock(this.turtle.serverId, x, y + 1, z);
            deletedBlocks.push({
                x,
                y: y + 1,
                z,
            });
        }

        const downIndex = locationsToExplore.findIndex((loc) => loc.x === x && loc.y === y - 1 && loc.z === z);
        if (downIndex > -1) {
            locationsToExplore.splice(downIndex, 1);
        }

        if (exploreDown != null) {
            upsertBlock(
                this.turtle.serverId,
                x,
                y - 1,
                z,
                exploreDown.name,
                exploreDown.state,
                exploreDown.tags
            );
            blocks.push({
                x,
                y: y - 1,
                z,
                name: exploreDown.name,
                state: exploreDown.state,
                tags: exploreDown.tags,
            });
        } else {
            deleteBlock(this.turtle.serverId, x, y - 1, z);
            deletedBlocks.push({
                x,
                y: y - 1,
                z,
            });
        }

        let dx = 0;
        let dz = 0;
        switch (this.turtle.direction) {
            case Direction.North:
                dz--;
                break;
            case Direction.West:
                dx--;
                break;
            case Direction.South:
                dz++;
                break;
            case Direction.East:
                dx++;
                break;
        }

        const frontIndex = locationsToExplore.findIndex((loc) => loc.x === x + dx && loc.y === y && loc.z === z + dz);
        if (frontIndex > -1) {
            locationsToExplore.splice(frontIndex, 1);
        }

        if (exploreFront != null) {
            upsertBlock(
                this.turtle.serverId,
                x + dx,
                y,
                z + dz,
                exploreFront.name,
                exploreFront.state,
                exploreFront.tags
            );
            blocks.push({
                x: x + dx,
                y,
                z: z + dz,
                name: exploreFront.name,
                state: exploreFront.state,
                tags: exploreFront.tags,
            });
        } else {
            deleteBlock(this.turtle.serverId, x + dx, y, z + dz);
            deletedBlocks.push({
                x: x + dx,
                y,
                z: z + dz,
            });
        }

        globalEventEmitter.emit('wupdate', {
            serverId: this.turtle.serverId,
            blocks,
            deletedBlocks,
        });
    }

    public async *act() {
        while (true) {
            if (this.turtle.location == null) {
                throw new Error('Unable to explore without knowing turtle location');
            }

            let chunkX = this.data.startChunk.x;
            let chunkZ = this.data.startChunk.z;

            // Get the next chunk coordinates
            if (this.chunkOffsetIndex > 0) {
                let dx = 0;
                let dz = -1;
                let layer = 1;
                let layerSteps = 0;
                let direction = 0;
                for (let i = 0; i < this.chunkOffsetIndex; i++) {
                    if (layer === layerSteps) {
                        layerSteps = 0;
                        direction++;

                        if (dx === 0) {
                            dx = -dz;
                            dz = 0;
                        } else {
                            dz = dx;
                            dx = 0;
                        }
                    }

                    if (direction === 2) {
                        direction = 0;
                        layer++;
                    }

                    chunkX += dx;
                    chunkZ += dz;
                    layerSteps++;
                }
            }

            const midYLoc = this.turtle.location.y - 14;
            const locationsToExplore: Location[] = [];
            for (let x = 0; x < 16; x++) {
                for (let y = 0; y < 16; y++) {
                    for (let z = 0; z < 16; z++) {
                        locationsToExplore.push({
                            x: x + chunkX * 16,
                            y: y + midYLoc,
                            z: z + chunkZ * 16,
                        });
                    }
                }
            }

            // Go to chunk
            for await (const _ of this.goToDestinations(locationsToExplore)) {
                yield;
            }

            const boundaries: Boundaries = {
                minX: chunkX * 16,
                maxX: chunkX * 16 + 15,
                minZ: chunkZ * 16,
                maxZ: chunkZ * 16 + 15,
            };
            while (locationsToExplore.length > 0) {
                try {
                    for await (const _ of this.goToDestinations(locationsToExplore, {
                        noInspect: true,
                        boundaries
                    })) {
                        yield;
                    }

                    const {x, y, z} = this.turtle.location;
                    await this.exploreSurroundings(x, y, z, locationsToExplore);
                } catch (err) {
                    if (err instanceof DestinationError && err.message === 'Movement obstructed') {
                        const {x, y, z} = this.turtle.location;
                        await this.exploreSurroundings(x, y, z, locationsToExplore);

                        yield;
                        continue;
                    } else if (err instanceof DestinationError && (err.message === 'No valid path found' || err.message === 'Max steps reached')) {
                        const {x, y, z} = this.turtle.location;
                        await this.exploreSurroundings(x, y, z, locationsToExplore);

                        yield;
                        break;
                    } else if (typeof err === 'string') {
                        throw new Error(err);
                    } else {
                        throw err;
                    }
                }
            }

            this.chunkOffsetIndex++;
        }
    }
}
