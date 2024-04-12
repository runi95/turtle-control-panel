import {Database} from 'better-sqlite3';

export const prepareSelectServer = (db: Database) =>
    db.prepare('SELECT * FROM `servers` WHERE `remote_address` = ?');

export const prepareInsertServer = (db: Database) =>
    db.prepare(
        'INSERT INTO `servers` (`remote_address`, `name`) VALUES (:remote_address, :name) ON CONFLICT DO UPDATE SET name = :name'
    );

export const prepareUpdateServer = (db: Database) => db.prepare('UPDATE `servers` SET `name` = ? WHERE `id` = ?');
