import {Database} from 'better-sqlite3';

export const prepareSelectTurtle = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
'id', \`t\`.\`id\`,
'name', \`t\`.\`name\`,
'fuelLevel', \`t\`.\`fuel_level\`,
'fuelLimit', \`t\`.\`fuel_limit\`,
'selectedSlot', \`t\`.\`selected_slot\`,
'inventory', json(\`t\`.\`inventory\`),
'stepsSinceLastRefuel', \`t\`.\`steps_since_last_refuel\`,
'state', json(\`t\`.\`state\`),
'location', json(\`t\`.\`location\`),
'direction', \`t\`.\`direction\`,
'home', json(\`t\`.\`home\`)
) FROM \`turtles\` AS \`t\` WHERE \`server_id\` = ? AND \`id\` = ?`
        )
        .pluck();

export const prepareSelectTurtles = (db: Database) =>
    db
        .prepare(
            `SELECT json_group_array(json_object(
'id', \`t\`.\`id\`,
'name', \`t\`.\`name\`,
'fuelLevel', \`t\`.\`fuel_level\`,
'fuelLimit', \`t\`.\`fuel_limit\`,
'selectedSlot', \`t\`.\`selected_slot\`,
'inventory', json(\`t\`.\`inventory\`),
'stepsSinceLastRefuel', \`t\`.\`steps_since_last_refuel\`,
'state', json(\`t\`.\`state\`),
'location', json(\`t\`.\`location\`),
'direction', \`t\`.\`direction\`,
'home', json(\`t\`.\`home\`)
)) FROM \`turtles\` AS \`t\` WHERE \`server_id\` = ?`
        )
        .pluck();

export const prepareInsertTurtle = (db: Database) =>
    db.prepare(
        'INSERT INTO `turtles` VALUES (:server_id, :id, :name, :fuel_level, :fuel_limit, :selected_slot, :inventory, :steps_since_last_refuel, :state, :location, :direction, :home) ON CONFLICT DO UPDATE SET name = :name, fuel_level = :fuel_level, fuel_limit = :fuel_limit, selected_slot = :selected_slot, inventory = :inventory, steps_since_last_refuel = :steps_since_last_refuel, state = :state, location = :location, direction = :direction, home = :home'
    );

export const prepareDeleteTurtle = (db: Database) =>
    db.prepare('DELETE FROM `turtles` WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleName = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `name` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleFuelLevel = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `fuel_level` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleSelectedSlot = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `selected_slot` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleInventory = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `inventory` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleStepsSinceLastRefuel = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `steps_since_last_refuel` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleState = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `state` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleLocation = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `location` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleDirection = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `direction` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleMovement = (db: Database) =>
    db.prepare(
        'UPDATE `turtles` SET `fuel_level` = ?, `steps_since_last_refuel` = ?, `location` = ? WHERE `server_id` = ? AND `id` = ?'
    );

export const prepareUpdateTurtleFuel = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `fuel_level` = ? WHERE `server_id` = ? AND `id` = ?');

export const prepareUpdateTurtleHome = (db: Database) =>
    db.prepare('UPDATE `turtles` SET `home` = ? WHERE `server_id` = ? AND `id` = ?');
