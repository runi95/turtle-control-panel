import {Database} from 'better-sqlite3';

export const prepareSelectArea = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
'id', \`a\`.\`id\`,
'color', \`a\`.\`color\`,
'name', \`a\`.\`name\`,
'area', json(\`a\`.\`area\`)
) FROM \`areas\` AS \`a\` WHERE \`server_id\` = ? AND \`id\` = ?`
        )
        .pluck();

export const prepareSelectAreas = (db: Database) =>
    db
        .prepare(
            `SELECT json_group_array(json_object(
'id', \`a\`.\`id\`,
'color', \`a\`.\`color\`,
'name', \`a\`.\`name\`,
'area', json(\`a\`.\`area\`))
) FROM \`areas\` AS \`a\` WHERE \`server_id\` = ?`
        )
        .pluck();

export const prepareInsertArea = (db: Database) =>
    db.prepare('INSERT INTO `areas` (`server_id`, `name`, `color`, `area`) VALUES (?, ?, ?, ?)');
