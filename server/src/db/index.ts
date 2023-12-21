import Database from 'better-sqlite3';
import {Server} from './server.type';
import {Block, BlockState, BlockTags} from './block.type';
import {BaseState, Direction, Inventory, Location, Turtle} from './turtle.type';
import {Area} from './area.type';

const db = new Database('db/server.db');
db.pragma('journal_mode = WAL');

db.exec(
    `CREATE TABLE IF NOT EXISTS \`servers\` (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remote_address VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(32)
);`
);

db.exec(
    `CREATE TABLE IF NOT EXISTS \`turtles\` (
    server_id INT NOT NULL,
    id INT NOT NULL,
    name VARCHAR(32) NOT NULL,
    fuel_level INT NOT NULL,
    fuel_limit INT NOT NULL,
    selected_slot INT NOT NULL,
    inventory JSON NOT NULL,
    steps_since_last_refuel INT,
    state JSON,
    location JSON,
    direction INT,
    CONSTRAINT pk_turtles PRIMARY KEY (\`server_id\`, \`id\`),
    FOREIGN KEY (\`server_id\`) REFERENCES \`servers\`(\`id\`) ON UPDATE CASCADE ON DELETE CASCADE
);`
);

db.exec(
    `CREATE TABLE IF NOT EXISTS \`areas\` (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INT NOT NULL,
    color INT NOT NULL,
    area JSON NOT NULL,
    FOREIGN KEY (\`server_id\`) REFERENCES \`servers\`(\`id\`) ON UPDATE CASCADE ON DELETE CASCADE
);`
);

db.exec(
    `CREATE TABLE IF NOT EXISTS \`blocks\` (
    server_id INT NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    z INT NOT NULL,
    name VARCHAR(64),
    state JSON,
    tags JSON,
    CONSTRAINT pk_turtles PRIMARY KEY (\`server_id\`, \`x\`, \`y\`, \`z\`),
    FOREIGN KEY (\`server_id\`) REFERENCES \`servers\`(\`id\`) ON UPDATE CASCADE ON DELETE CASCADE
);`
);

// db.exec(`DELETE FROM \`servers\` WHERE \`remote_address\` = 'localhost'`);
// db.exec(`INSERT INTO \`servers\` (\`remote_address\`) VALUES ('localhost')`);

// Portal database queries
const preparedDashboard = db
    .prepare(
        `SELECT json_object(
            'id', \`s\`.\`id\`,
            'remoteAddress', \`s\`.\`remote_address\`,
            'name', \`s\`.\`name\`,
            'turtles', iif(\`t\`.\`id\` IS NOT NULL, json_group_array(json_object(
                'id', \`t\`.\`id\`,
                'name', \`t\`.\`name\`,
                'fuelLevel', \`t\`.\`fuel_level\`,
                'fuelLimit', \`t\`.\`fuel_limit\`,
                'selectedSlot', \`t\`.\`selected_slot\`,
                'inventory', json(\`t\`.\`inventory\`),
                'stepsSinceLastRefuel', \`t\`.\`steps_since_last_refuel\`,
                'state', json(\`t\`.\`state\`),
                'location', json(\`t\`.\`location\`),
                'direction', \`t\`.\`direction\`
            )), json_array()),
            'areas', iif(\`a\`.\`id\` IS NOT NULL, json_group_array(json_object(
                'id', \`a\`.\`id\`,
                'color', \`a\`.\`color\`,
                'area', json(\`a\`.\`area\`)
            )), json_array())
        ) FROM \`servers\` AS \`s\`
        LEFT JOIN \`turtles\` AS \`t\` ON \`t\`.\`server_id\` = \`s\`.\`id\`
        LEFT JOIN \`areas\` AS \`a\` ON \`a\`.\`server_id\` = \`s\`.\`id\`
        GROUP BY \`s\`.\`id\``
    )
    .pluck();

// General database queries
const selectServerByRemoteAddress = db.prepare('SELECT * FROM `servers` WHERE `remote_address` = ?');
const insertServer = db.prepare(
    'INSERT INTO `servers` (`remote_address`, `name`) VALUES (:remote_address, :name) ON CONFLICT DO UPDATE SET name = :name'
);
const setServerName = db.prepare('UPDATE `servers` SET `name` = ? WHERE `id` = ?');
const selectArea = db.prepare(`SELECT json_object(
    'id', \`a\`.\`id\`,
    'color', \`a\`.\`color\`,
    'area', \`a\`.\`area\`
) FROM \`areas\` AS \`a\` WHERE \`server_id\` = ? AND \`id\` = ?`);
const insertArea = db.prepare('INSERT INTO `areas` (`server_id`, `color`, `area`) VALUES (?, ?, ?)');
const selectTurtle = db.prepare(`SELECT json_object(
    'id', \`t\`.\`id\`,
    'name', \`t\`.\`name\`,
    'fuelLevel', \`t\`.\`fuel_level\`,
    'fuelLimit', \`t\`.\`fuel_limit\`,
    'selectedSlot', \`t\`.\`selected_slot\`,
    'inventory', json(\`t\`.\`inventory\`),
    'stepsSinceLastRefuel', \`t\`.\`steps_since_last_refuel\`,
    'state', json(\`t\`.\`state\`),
    'location', json(\`t\`.\`location\`),
    'direction', \`t\`.\`direction\`
) FROM \`turtles\` AS \`t\` WHERE \`server_id\` = ? AND \`id\` = ?`);
const insertTurtle = db.prepare(
    'INSERT INTO `turtles` VALUES (:server_id, :id, :name, :fuel_level, :fuel_limit, :selected_slot, :inventory, :steps_since_last_refuel, :state, :location, :direction) ON CONFLICT DO UPDATE SET name = :name, fuel_level = :fuel_level, fuel_limit = :fuel_limit, selected_slot = :selected_slot, inventory = :inventory, steps_since_last_refuel = :steps_since_last_refuel, state = :state, location = :location, direction = :direction'
);
const selectBlocks = db.prepare(`SELECT json_object(
    'serverId', \`b\`.\`server_id\`,
    'x', \`b\`.\`x\`,
    'y', \`b\`.\`y\`,
    'z', \`b\`.\`z\`,
    'name', \`b\`.\`name\`,
    'state', json(\`b\`.\`state\`),
    'tags', json(\`b\`.\`tags\`)
) FROM \`blocks\` AS \`b\`
    LEFT JOIN
    (
        SELECT \`server_id\`, \`x\`, MAX(\`y\`) max, \`z\`
        FROM \`blocks\`
        WHERE \`server_id\` = :server_id AND \`x\` >= :from_x AND \`x\` <= :to_x AND \`y\` >= :from_y AND \`y\` <= :to_y AND \`z\` >= :from_z AND \`z\` <= :to_z
        GROUP BY \`x\`, \`z\`
    ) \`lb\`
    ON \`lb\`.\`server_id\` = \`b\`.\`server_id\` AND \`lb\`.\`x\` = \`b\`.\`x\` AND \`lb\`.\`max\` = \`b\`.\`y\` AND \`lb\`.\`z\` = \`b\`.\`z\`
WHERE \`b\`.\`server_id\` = :server_id AND \`b\`.\`x\` >= :from_x AND \`b\`.\`x\` <= :to_x AND \`b\`.\`y\` >= :from_y AND \`b\`.\`y\` <= :to_y AND \`b\`.\`z\` >= :from_z AND \`b\`.\`z\` <= :to_z`).pluck();
const selectBlock = db.prepare(`SELECT json_object(
    'serverId', \`b\`.\`server_id\`,
    'x', \`b\`.\`x\`,
    'y', \`b\`.\`y\`,
    'z', \`b\`.\`z\`,
    'name', \`b\`.\`name\`,
    'state', json(\`b\`.\`state\`),
    'tags', json(\`b\`.\`tags\`)
) FROM \`blocks\` AS \`b\` WHERE \`server_id\` = ? AND \`x\` = ? AND \`y\` = ? AND \`z\` = ?`);
const insertBlock = db.prepare(
    'INSERT INTO `blocks` VALUES (:server_id, :x, :y, :z, :name, :state, :tags) ON CONFLICT DO UPDATE SET `name` = :name, `state` = :state, `tags` = :tags'
);
const deleteBlockStatement = db.prepare(
    'DELETE FROM `blocks` WHERE `server_id` = ? AND `x` = ? AND `y` = ? AND `z` = ?'
);
const setTurtleName = db.prepare('UPDATE `turtles` SET `name` = ? WHERE `server_id` = ? AND `id` = ?');
const setTurtleFuelLevel = db.prepare('UPDATE `turtles` SET `fuel_level` = ? WHERE `server_id` = ? AND `id` = ?');
const setTurtleSelectedSlot = db.prepare('UPDATE `turtles` SET `selected_slot` = ? WHERE `server_id` = ? AND `id` = ?');
const setTurtleInventory = db.prepare('UPDATE `turtles` SET `inventory` = ? WHERE `server_id` = ? AND `id` = ?');
const setTurtleStepsSinceLastRefuel = db.prepare(
    'UPDATE `turtles` SET `steps_since_last_refuel` = ? WHERE `server_id` = ? AND `id` = ?'
);
const setTurtleState = db.prepare('UPDATE `turtles` SET `state` = ? WHERE `server_id` = ? AND `id` = ?');
const setTurtleLocation = db.prepare('UPDATE `turtles` SET `location` = ? WHERE `server_id` = ? AND `id` = ?');
const setTurtleDirection = db.prepare('UPDATE `turtles` SET `direction` = ? WHERE `server_id` = ? AND `id` = ?');
const setTurtleMovement = db.prepare(
    'UPDATE `turtles` SET `fuel_level` = ?, `steps_since_last_refuel` = ?, `location` = ? WHERE `server_id` = ? AND `id` = ?'
);
const setTurtleFuel = db.prepare(
    'UPDATE `turtles` SET `fuel_level` = ?, `inventory` = ? WHERE `server_id` = ? AND `id` = ?'
);

export const getDashboard = () => preparedDashboard.all().map((server: unknown) => JSON.parse(server as string));
export const upsertServer = (remoteAddress: string, name: string | null) =>
    insertServer.run({
        remote_address: remoteAddress,
        name,
    });
export const renameServer = (id: number, name: string) => setServerName.run(name, id);
export const getServerByRemoteAddress = (remoteAddress: string) => selectServerByRemoteAddress.get(remoteAddress) as Server;
export const getArea = (serverId: number, id: number) => selectArea.get(serverId, id) as Area;
export const addArea = (serverId: number, color: string, area: JSON) =>
    insertArea.run(serverId, color, JSON.stringify(area));
export const getTurtle = (serverId: number, id: number) => selectTurtle.get(serverId, id) as Turtle;
export const upsertTurtle = (
    serverId: number,
    id: number,
    name: string,
    fuelLevel: number,
    fuelLimit: number,
    selectedSlot: number,
    inventory: Inventory,
    stepsSinceLastRefuel: number,
    state: BaseState | null,
    location: Location,
    direction: Direction
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
    });
export interface GetBlocksOptions {
    fromX: number;
    toX: number;
    fromY: number;
    toY: number;
    fromZ: number;
    toZ: number;
}
export const getBlocks = (serverId: number, options: GetBlocksOptions) => selectBlocks.all({
    server_id: serverId,
    from_x: options.fromX,
    to_x: options.toX,
    from_y: options.fromY,
    to_y: options.toY,
    from_z: options.fromZ,
    to_z: options.toZ
}).map((block) => JSON.parse(block as string)) as Block[];
export const getBlock = (serverId: number, x: number, y: number, z: number) => selectBlock.get(serverId, x, y, z) as Block;
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
export const upsertBlocks = (serverId: number, blocks: {
    x: number;
    y: number;
    z: number;
    name: string;
    state: BlockState;
    tags: BlockTags;
}[]) => db.transaction(() => {
    for (const block of blocks) upsertBlock(serverId, block.x, block.y, block.z, block.name, block.state, block.tags);
})();
export const deleteBlock = (serverId: number, x: number, y: number, z: number) =>
    deleteBlockStatement.run(serverId, x, y, z);
export const updateTurtleName = (serverId: number, id: number, name: string) => setTurtleName.run(name, serverId, id);
export const updateTurtleFuelLevel = (serverId: number, id: number, fuelLevel: number) =>
    setTurtleFuelLevel.run(fuelLevel, serverId, id);
export const updateTurtleSelectedSlot = (serverId: number, id: number, selectedSlot: number) =>
    setTurtleSelectedSlot.run(selectedSlot, serverId, id);
export const updateTurtleInventory = (serverId: number, id: number, inventory: Inventory) =>
    setTurtleInventory.run(JSON.stringify(inventory), serverId, id);
export const updateTurtleStepsSinceLastRefuel = (serverId: number, id: number, stepsSinceLastRefuel: number) =>
    setTurtleStepsSinceLastRefuel.run(stepsSinceLastRefuel, serverId, id);
export const updateTurtleState = (serverId: number, id: number, baseState: BaseState | null) => {
    if (baseState !== null) {
        const {meta: _meta, ...state} = baseState;
        setTurtleState.run(JSON.stringify(state), serverId, id);
    } else {
        setTurtleState.run(null, serverId, id);
    }
}
export const updateTurtleLocation = (serverId: number, id: number, location: Location) =>
    setTurtleLocation.run(JSON.stringify(location), serverId, id);
export const updateTurtleDirection = (serverId: number, id: number, direction: Direction) =>
    setTurtleDirection.run(direction, serverId, id);
export const updateTurtleMovement = (
    serverId: number,
    id: number,
    fuelLevel: number,
    stepsSinceLastRefuel: number,
    location: Location
) => setTurtleMovement.run(fuelLevel, stepsSinceLastRefuel, JSON.stringify(location), serverId, id);
export const updateTurtleFuel = (serverId: number, id: number, fuelLevel: number, inventory: Inventory) =>
    setTurtleFuel.run(fuelLevel, JSON.stringify(inventory), serverId, id);
