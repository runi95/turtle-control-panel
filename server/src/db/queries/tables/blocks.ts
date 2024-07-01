import {Database} from 'better-sqlite3';

export const createBlocksTable = (db: Database) =>
    db.exec(
        `CREATE TABLE IF NOT EXISTS \`blocks\` (
    server_id INT NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    z INT NOT NULL,
    name VARCHAR(64),
    state JSON,
    tags JSON,
    CONSTRAINT pk_blocks PRIMARY KEY (\`server_id\`, \`x\`, \`y\`, \`z\`),
    FOREIGN KEY (\`server_id\`) REFERENCES \`servers\`(\`id\`) ON UPDATE CASCADE ON DELETE CASCADE
);`
    );
