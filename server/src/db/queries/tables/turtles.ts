import {Database} from 'better-sqlite3';

export const createTurtlesTable = (db: Database) =>
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
    home JSON,
    CONSTRAINT pk_turtles PRIMARY KEY (\`server_id\`, \`id\`),
    FOREIGN KEY (\`server_id\`) REFERENCES \`servers\`(\`id\`) ON UPDATE CASCADE ON DELETE CASCADE
);`
    );
