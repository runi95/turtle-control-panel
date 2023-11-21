const Database = require('better-sqlite3');

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
                'area', \`a\`.\`area\`
            )), json_array()),
            'blocks', iif(\`b\`.\`server_id\` IS NOT NULL, json_group_array(json_object(
                'serverId', \`b\`.\`server_id\`,
                'x', \`b\`.\`x\`,
                'y', \`b\`.\`y\`,
                'z', \`b\`.\`z\`,
                'name', \`b\`.\`name\`,
                'state', json(\`b\`.\`state\`),
                'tags', json(\`b\`.\`tags\`)
            )), json_array())
        ) FROM \`servers\` AS \`s\`
        LEFT JOIN \`turtles\` AS \`t\` ON \`t\`.\`server_id\` = \`s\`.\`id\`
        LEFT JOIN \`areas\` AS \`a\` ON \`a\`.\`server_id\` = \`s\`.\`id\`
        LEFT JOIN \`blocks\` AS \`b\` ON \`b\`.\`server_id\` = \`s\`.\`id\`
        GROUP BY \`s\`.\`id\``
    )
    .pluck();

// General database queries
const selectServerByRemoteAddress = db.prepare('SELECT * FROM `servers` WHERE `remote_address` = ?');
const upsertServer = db.prepare(
    'INSERT INTO `servers` (`remote_address`, `name`) VALUES (:remote_address, :name) ON CONFLICT DO UPDATE SET name = :name'
);
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
const upsertTurtle = db.prepare(
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
) FROM \`blocks\` AS \`b\` WHERE \`server_id\` = ?`);
const selectBlock = db.prepare(`SELECT json_object(
    'serverId', \`b\`.\`server_id\`,
    'x', \`b\`.\`x\`,
    'y', \`b\`.\`y\`,
    'z', \`b\`.\`z\`,
    'name', \`b\`.\`name\`,
    'state', json(\`b\`.\`state\`),
    'tags', json(\`b\`.\`tags\`)
) FROM \`blocks\` AS \`b\` WHERE \`server_id\` = ? AND \`x\` = ? AND \`y\` = ? AND \`z\` = ?`);
const upsertBlock = db.prepare(
    'INSERT INTO `blocks` VALUES (:server_id, :x, :y, :z, :name, :state, :tags) ON CONFLICT DO UPDATE SET `name` = :name, `state` = :state, `tags` = :tags'
);
const deleteBlock = db.prepare('DELETE FROM `blocks` WHERE `server_id` = ? AND `x` = ? AND `y` = ? AND `z` = ?');
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
module.exports = {
    getDashboard: () => preparedDashboard.all().map((server) => JSON.parse(server)),
    upsertServer: (remoteAddress, name) =>
        upsertServer.run({
            remote_address: remoteAddress,
            name,
        }),
    getServerByRemoteAddress: (remoteAddress) => selectServerByRemoteAddress.get(remoteAddress),
    getArea: (serverId, id) => selectArea.get(serverId, id),
    addArea: (serverId, color, area) => insertArea.run(serverId, color, JSON.stringify(area)),
    getTurtle: (serverId, id) => selectTurtle.get(serverId, id),
    upsertTurtle: (
        serverId,
        id,
        name,
        fuelLevel,
        fuelLimit,
        selectedSlot,
        inventory,
        stepsSinceLastRefuel,
        state,
        location,
        direction
    ) =>
        upsertTurtle.run({
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
        }),
    getBlocks: (serverId) => selectBlocks.all(serverId),
    getBlock: (serverId, x, y, z) => selectBlock.get(serverId, x, y, z),
    upsertBlock: (serverId, x, y, z, name, state, tags) =>
        upsertBlock.run({
            server_id: serverId,
            x,
            y,
            z,
            name,
            state: JSON.stringify(state),
            tags: JSON.stringify(tags),
        }),
    deleteBlock: (serverId, x, y, z) => deleteBlock.run(serverId, x, y, z),
    updateTurtleName: (serverId, id, name) => setTurtleName.run(name, serverId, id),
    updateTurtleFuelLevel: (serverId, id, fuelLevel) => setTurtleFuelLevel.run(fuelLevel, serverId, id),
    updateTurtleSelectedSlot: (serverId, id, selectedSlot) => setTurtleSelectedSlot.run(selectedSlot, serverId, id),
    updateTurtleInventory: (serverId, id, inventory) => setTurtleInventory.run(JSON.stringify(inventory), serverId, id),
    updateTurtleStepsSinceLastRefuel: (serverId, id, stepsSinceLastRefuel) =>
        setTurtleStepsSinceLastRefuel.run(stepsSinceLastRefuel, serverId, id),
    updateTurtleState: (serverId, id, state) => setTurtleState.run(JSON.stringify(state), serverId, id),
    updateTurtleLocation: (serverId, id, location) => setTurtleLocation.run(JSON.stringify(location), serverId, id),
    updateTurtleDirection: (serverId, id, direction) => setTurtleDirection.run(direction, serverId, id),
    updateTurtleMovement: (serverId, id, fuelLevel, stepsSinceLastRefuel, location) =>
        setTurtleMovement.run(fuelLevel, stepsSinceLastRefuel, JSON.stringify(location), serverId, id),
    updateTurtleFuel: (serverId, id, fuelLevel, inventory) =>
        setTurtleFuel.run(fuelLevel, JSON.stringify(inventory), serverId, id),
};
