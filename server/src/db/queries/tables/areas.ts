import {Database} from 'better-sqlite3';

export const createAreasTable = (db: Database) => db.exec(
    `CREATE TABLE IF NOT EXISTS \`areas\` (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INT NOT NULL,
    name VARCHAR(32) NOT NULL,
    color INT NOT NULL,
    area JSON NOT NULL,
    FOREIGN KEY (\`server_id\`) REFERENCES \`servers\`(\`id\`) ON UPDATE CASCADE ON DELETE CASCADE
);`
);
