import {Database} from 'better-sqlite3';

export const createServersTable = (db: Database) => db.exec(
    `CREATE TABLE IF NOT EXISTS \`servers\` (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remote_address VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(32)
);`
);
