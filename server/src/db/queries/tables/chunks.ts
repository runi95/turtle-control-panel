import {Database} from 'better-sqlite3';

export const createChunksTable = (db: Database) => db.exec(
    `CREATE TABLE IF NOT EXISTS \`chunks\` (
    server_id INT NOT NULL,
    x INT NOT NULL,
    z INT NOT NULL,
    analysis JSON,
    CONSTRAINT pk_chunks PRIMARY KEY (\`server_id\`, \`x\`, \`z\`),
    FOREIGN KEY (\`server_id\`) REFERENCES \`servers\`(\`id\`) ON UPDATE CASCADE ON DELETE CASCADE
);`
);
