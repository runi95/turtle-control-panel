import {Database} from 'better-sqlite3';

export const prepareSelectBlock = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
'serverId', \`b\`.\`server_id\`,
'x', \`b\`.\`x\`,
'y', \`b\`.\`y\`,
'z', \`b\`.\`z\`,
'name', \`b\`.\`name\`,
'state', json(\`b\`.\`state\`),
'tags', json(\`b\`.\`tags\`)
) FROM \`blocks\` AS \`b\` WHERE \`server_id\` = ? AND \`x\` = ? AND \`y\` = ? AND \`z\` = ?`
        )
        .pluck();

export const prepareSelectBlocks = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
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
WHERE \`b\`.\`server_id\` = :server_id AND \`b\`.\`x\` >= :from_x AND \`b\`.\`x\` <= :to_x AND \`b\`.\`y\` >= :from_y AND \`b\`.\`y\` <= :to_y AND \`b\`.\`z\` >= :from_z AND \`b\`.\`z\` <= :to_z`
        )
        .pluck();

export const prepareSelectBlocksWithName = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
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
WHERE \`b\`.\`server_id\` = :server_id AND \`b\`.\`x\` >= :from_x AND \`b\`.\`x\` <= :to_x AND \`b\`.\`y\` >= :from_y AND \`b\`.\`y\` <= :to_y AND \`b\`.\`z\` >= :from_z AND \`b\`.\`z\` <= :to_z AND \`b\`.\`name\` = :name`
        )
        .pluck();

export const prepareSelectBlocksSimple = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
'x', \`b\`.\`x\`,
'y', \`b\`.\`y\`,
'z', \`b\`.\`z\`,
'name', \`b\`.\`name\`,
'facing', json_extract(\`b\`.\`state\`, '$.facing')
) FROM \`blocks\` AS \`b\`
LEFT JOIN
(
    SELECT \`server_id\`, \`x\`, MAX(\`y\`) max, \`z\`
    FROM \`blocks\`
    WHERE \`server_id\` = :server_id AND \`x\` >= :from_x AND \`x\` <= :to_x AND \`y\` >= :from_y AND \`y\` <= :to_y AND \`z\` >= :from_z AND \`z\` <= :to_z
    GROUP BY \`x\`, \`z\`
) \`lb\`
ON \`lb\`.\`server_id\` = \`b\`.\`server_id\` AND \`lb\`.\`x\` = \`b\`.\`x\` AND \`lb\`.\`max\` = \`b\`.\`y\` AND \`lb\`.\`z\` = \`b\`.\`z\`
WHERE \`b\`.\`server_id\` = :server_id AND \`b\`.\`x\` >= :from_x AND \`b\`.\`x\` <= :to_x AND \`b\`.\`y\` >= :from_y AND \`b\`.\`y\` <= :to_y AND \`b\`.\`z\` >= :from_z AND \`b\`.\`z\` <= :to_z`
        )
        .pluck();

export const prepareSelectBlocksSimpleWithName = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
'x', \`b\`.\`x\`,
'y', \`b\`.\`y\`,
'z', \`b\`.\`z\`,
'name', \`b\`.\`name\`
) FROM \`blocks\` AS \`b\`
LEFT JOIN
(
    SELECT \`server_id\`, \`x\`, MAX(\`y\`) max, \`z\`
    FROM \`blocks\`
    WHERE \`server_id\` = :server_id AND \`x\` >= :from_x AND \`x\` <= :to_x AND \`y\` >= :from_y AND \`y\` <= :to_y AND \`z\` >= :from_z AND \`z\` <= :to_z
    GROUP BY \`x\`, \`z\`
) \`lb\`
ON \`lb\`.\`server_id\` = \`b\`.\`server_id\` AND \`lb\`.\`x\` = \`b\`.\`x\` AND \`lb\`.\`max\` = \`b\`.\`y\` AND \`lb\`.\`z\` = \`b\`.\`z\`
WHERE \`b\`.\`server_id\` = :server_id AND \`b\`.\`x\` >= :from_x AND \`b\`.\`x\` <= :to_x AND \`b\`.\`y\` >= :from_y AND \`b\`.\`y\` <= :to_y AND \`b\`.\`z\` >= :from_z AND \`b\`.\`z\` <= :to_z AND \`b\`.\`name\` = :name`
        )
        .pluck();

export const prepareInsertBlock = (db: Database) =>
    db.prepare(
        'INSERT INTO `blocks` VALUES (:server_id, :x, :y, :z, :name, :state, :tags) ON CONFLICT DO UPDATE SET `name` = :name, `state` = :state, `tags` = :tags'
    );

export const prepareDeleteBlock = (db: Database) =>
    db.prepare('DELETE FROM `blocks` WHERE `server_id` = ? AND `x` = ? AND `y` = ? AND `z` = ?');
