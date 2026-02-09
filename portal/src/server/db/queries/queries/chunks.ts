import {Database} from 'better-sqlite3';

export const prepareSelectChunk = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
'serverId', \`c\`.\`server_id\`,
'x', \`c\`.\`x\`,
'z', \`c\`.\`z\`,
'analysis', json(\`c\`.\`analysis\`)
) FROM \`chunks\` AS \`c\` WHERE \`server_id\` = ? AND \`x\` = ? AND \`z\` = ?`
        )
        .pluck();

export const prepareSelectChunks = (db: Database) =>
    db
        .prepare(
            `SELECT json_object(
'serverId', \`c\`.\`server_id\`,
'x', \`c\`.\`x\`,
'z', \`c\`.\`z\`,
'analysis', json(\`c\`.\`analysis\`)
) FROM \`chunks\` AS \`c\`
WHERE \`c\`.\`server_id\` = :server_id AND \`c\`.\`x\` >= :from_x AND \`c\`.\`x\` <= :to_x AND \`c\`.\`z\` >= :from_z AND \`c\`.\`z\` <= :to_z`
        )
        .pluck();

export const prepareInsertChunk = (db: Database) =>
    db.prepare(
        'INSERT INTO `chunks` VALUES (:server_id, :x, :z, :analysis) ON CONFLICT DO UPDATE SET analysis = :analysis'
    );
