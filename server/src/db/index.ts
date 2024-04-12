import Database from 'better-sqlite3';
import {Server} from './server.type';
import {Block, BlockState, BlockTags} from './block.type';
import {Direction, Inventory, Location, Turtle} from './turtle.type';
import {Area} from './area.type';
import {StateDataTypes} from '../entities/states/helpers';
import {Chunk, ChunkAnalysis} from './chunk.type';
import {createServersTable} from './queries/tables/servers';
import {createTurtlesTable} from './queries/tables/turtles';
import {createAreasTable} from './queries/tables/areas';
import {createBlocksTable} from './queries/tables/blocks';
import {createChunksTable} from './queries/tables/chunks';
import {prepareDashboard} from './queries/queries/dashboard';
import {
    prepareSelectTurtle,
    prepareSelectTurtles,
    prepareInsertTurtle,
    prepareDeleteTurtle,
    prepareUpdateTurtleName,
    prepareUpdateTurtleFuelLevel,
    prepareUpdateTurtleSelectedSlot,
    prepareUpdateTurtleInventory,
    prepareUpdateTurtleStepsSinceLastRefuel,
    prepareUpdateTurtleState,
    prepareUpdateTurtleLocation,
    prepareUpdateTurtleDirection,
    prepareUpdateTurtleMovement,
    prepareUpdateTurtleFuel,
    prepareUpdateTurtleHome,
} from './queries/queries/turtles';
import {prepareSelectServer, prepareInsertServer, prepareUpdateServer} from './queries/queries/servers';
import {prepareInsertArea, prepareSelectArea, prepareSelectAreas} from './queries/queries/areas';
import {
    prepareDeleteBlock,
    prepareInsertBlock,
    prepareSelectBlock,
    prepareSelectBlocks,
    prepareSelectBlocksSimple,
    prepareSelectBlocksSimpleWithName,
    prepareSelectBlocksWithName,
} from './queries/queries/blocks';
import {prepareInsertChunk, prepareSelectChunk, prepareSelectChunks} from './queries/queries/chunks';

const db = new Database('db/server.db');
db.pragma('journal_mode = WAL');

createServersTable(db);
createTurtlesTable(db);
createAreasTable(db);
createBlocksTable(db);
createChunksTable(db);

// Portal database queries
const preparedDashboard = prepareDashboard(db);

// Servers
const selectServerByRemoteAddress = prepareSelectServer(db);
const insertServer = prepareInsertServer(db);
const setServerName = prepareUpdateServer(db);

// Areas
const selectArea = prepareSelectArea(db);
const selectAreas = prepareSelectAreas(db);
const insertArea = prepareInsertArea(db);

// Turtles
const selectTurtle = prepareSelectTurtle(db);
const selectTurtles = prepareSelectTurtles(db);
const insertTurtle = prepareInsertTurtle(db);
const deleteTurtleStatement = prepareDeleteTurtle(db);
const setTurtleName = prepareUpdateTurtleName(db);
const setTurtleFuelLevel = prepareUpdateTurtleFuelLevel(db);
const setTurtleSelectedSlot = prepareUpdateTurtleSelectedSlot(db);
const setTurtleInventory = prepareUpdateTurtleInventory(db);
const setTurtleStepsSinceLastRefuel = prepareUpdateTurtleStepsSinceLastRefuel(db);
const setTurtleState = prepareUpdateTurtleState(db);
const setTurtleLocation = prepareUpdateTurtleLocation(db);
const setTurtleDirection = prepareUpdateTurtleDirection(db);
const setTurtleMovement = prepareUpdateTurtleMovement(db);
const setTurtleFuel = prepareUpdateTurtleFuel(db);
const setTurtleHome = prepareUpdateTurtleHome(db);

// Blocks
const selectBlocks = prepareSelectBlocks(db);
const selectBlocksWithName = prepareSelectBlocksWithName(db);
const selectBlocksSimple = prepareSelectBlocksSimple(db);
const selectBlocksSimpleWithName = prepareSelectBlocksSimpleWithName(db);
const selectBlock = prepareSelectBlock(db);
const insertBlock = prepareInsertBlock(db);
const deleteBlockStatement = prepareDeleteBlock(db);

// Chunks
const selectChunks = prepareSelectChunks(db);
const selectChunk = prepareSelectChunk(db);
const insertChunk = prepareInsertChunk(db);

export const getDashboard = () => preparedDashboard.all().map((server: unknown) => JSON.parse(server as string));
export const upsertServer = (remoteAddress: string, name: string | null) =>
    insertServer.run({
        remote_address: remoteAddress,
        name,
    });
export const renameServer = (id: number, name: string) => setServerName.run(name, id);
export const getServerByRemoteAddress = (remoteAddress: string) =>
    selectServerByRemoteAddress.get(remoteAddress) as Server;
export const getArea = (serverId: number, id: number) => JSON.parse(selectArea.get(serverId, id) as string) as Area;
export const getAreas = (serverId: number) => JSON.parse(selectAreas.get(serverId) as string) as Area[];
export const addArea = (serverId: number, name: string, color: string, area: JSON) =>
    insertArea.run(serverId, name, color, JSON.stringify(area));
export const getTurtle = (serverId: number, id: number) => {
    const turtleString = selectTurtle.get(serverId, id) as string | undefined;
    return turtleString === undefined ? null : (JSON.parse(turtleString) as Turtle);
};
export const getTurtlesByServerId = (serverId: number) => {
    const turtlesString = selectTurtles.get(serverId) as string | undefined;
    return turtlesString == null ? [] : (JSON.parse(turtlesString) as Turtle[]);
};
export const upsertTurtle = (
    serverId: number,
    id: number,
    name: string,
    fuelLevel: number,
    fuelLimit: number,
    selectedSlot: number,
    inventory: Inventory,
    stepsSinceLastRefuel: number,
    state: StateDataTypes | null,
    location: Location | null,
    direction: Direction | null,
    home: Location | null
) =>
    insertTurtle.run({
        server_id: serverId,
        id,
        name,
        fuel_level: fuelLevel,
        fuel_limit: fuelLimit,
        selected_slot: selectedSlot,
        inventory: JSON.stringify(inventory),
        steps_since_last_refuel: stepsSinceLastRefuel,
        state: JSON.stringify(state),
        location: JSON.stringify(location),
        direction,
        home: JSON.stringify(home),
    });
export interface GetBlocksOptions {
    fromX: number;
    toX: number;
    fromY: number;
    toY: number;
    fromZ: number;
    toZ: number;
    name?: string;
}
export const getBlocks = (serverId: number, options: GetBlocksOptions) =>
    (options.name != null ? selectBlocksWithName : selectBlocks)
        .all({
            server_id: serverId,
            from_x: options.fromX,
            to_x: options.toX,
            from_y: options.fromY,
            to_y: options.toY,
            from_z: options.fromZ,
            to_z: options.toZ,
            name: options.name,
        })
        .map((block) => JSON.parse(block as string)) as Block[];
export const getBlocksSimple = (serverId: number, options: GetBlocksOptions) =>
    (options.name != null ? selectBlocksSimpleWithName : selectBlocksSimple)
        .all({
            server_id: serverId,
            from_x: options.fromX,
            to_x: options.toX,
            from_y: options.fromY,
            to_y: options.toY,
            from_z: options.fromZ,
            to_z: options.toZ,
            name: options.name,
        })
        .map((block) => JSON.parse(block as string)) as Omit<Block, 'state' | 'tags'>[];
export const getBlock = (serverId: number, x: number, y: number, z: number) => {
    const block = selectBlock.get(serverId, x, y, z);
    if (!block) return null;
    return JSON.parse(block as string) as Block;
};
export const upsertBlock = (
    serverId: number,
    x: number,
    y: number,
    z: number,
    name: string,
    state: BlockState,
    tags: BlockTags
) =>
    insertBlock.run({
        server_id: serverId,
        x,
        y,
        z,
        name,
        state: JSON.stringify(state),
        tags: JSON.stringify(tags),
    });
export const upsertBlocks = (
    serverId: number,
    blocks: {
        x: number;
        y: number;
        z: number;
        name: string;
        state: BlockState;
        tags: BlockTags;
    }[]
) =>
    db.transaction(() => {
        for (const block of blocks)
            upsertBlock(serverId, block.x, block.y, block.z, block.name, block.state, block.tags);
    })();
export const deleteBlock = (serverId: number, x: number, y: number, z: number) =>
    deleteBlockStatement.run(serverId, x, y, z);
export const deleteBlocks = (serverId: number, blocks: {x: number; y: number; z: number}[]) =>
    db.transaction(() => {
        for (const block of blocks) deleteBlock(serverId, block.x, block.y, block.z);
    })();
export const deleteTurtle = (serverId: number, id: number) => deleteTurtleStatement.run(serverId, id);
export const updateTurtleName = (serverId: number, id: number, name: string) => setTurtleName.run(name, serverId, id);
export const updateTurtleFuelLevel = (serverId: number, id: number, fuelLevel: number) =>
    setTurtleFuelLevel.run(fuelLevel, serverId, id);
export const updateTurtleSelectedSlot = (serverId: number, id: number, selectedSlot: number) =>
    setTurtleSelectedSlot.run(selectedSlot, serverId, id);
export const updateTurtleInventory = (serverId: number, id: number, inventory: Inventory) =>
    setTurtleInventory.run(JSON.stringify(inventory), serverId, id);
export const updateTurtleStepsSinceLastRefuel = (serverId: number, id: number, stepsSinceLastRefuel: number) =>
    setTurtleStepsSinceLastRefuel.run(stepsSinceLastRefuel, serverId, id);
export const updateTurtleState = (serverId: number, id: number, stateData: StateDataTypes | null) => {
    if (stateData !== null) {
        setTurtleState.run(JSON.stringify(stateData), serverId, id);
    } else {
        setTurtleState.run(null, serverId, id);
    }
};
export const updateTurtleLocation = (serverId: number, id: number, location: Location | null) =>
    setTurtleLocation.run(JSON.stringify(location), serverId, id);
export const updateTurtleDirection = (serverId: number, id: number, direction: Direction | null) =>
    setTurtleDirection.run(direction, serverId, id);
export const updateTurtleMovement = (
    serverId: number,
    id: number,
    fuelLevel: number,
    stepsSinceLastRefuel: number,
    location: Location
) => setTurtleMovement.run(fuelLevel, stepsSinceLastRefuel, JSON.stringify(location), serverId, id);
export const updateTurtleFuel = (serverId: number, id: number, fuelLevel: number) =>
    setTurtleFuel.run(fuelLevel, serverId, id);
export const updateTurtleHome = (serverId: number, id: number, home: Location | null) =>
    setTurtleHome.run(JSON.stringify(home), serverId, id);
export const upsertChunk = (serverId: number, x: number, z: number, analysis: ChunkAnalysis) =>
    insertChunk.run({
        server_id: serverId,
        x,
        z,
        analysis: JSON.stringify(analysis),
    });
export const getChunk = (serverId: number, x: number, z: number) => {
    const chunk = selectChunk.get(serverId, x, z);
    if (!chunk) return null;
    return JSON.parse(chunk as string) as Chunk;
};
export interface GetChunksOptions {
    fromX: number;
    toX: number;
    fromZ: number;
    toZ: number;
}
export const getChunks = (serverId: number, options: GetBlocksOptions) =>
    selectChunks
        .all({
            server_id: serverId,
            from_x: options.fromX,
            to_x: options.toX,
            from_z: options.fromZ,
            to_z: options.toZ,
        })
        .map((chunk) => JSON.parse(chunk as string)) as Chunk[];
