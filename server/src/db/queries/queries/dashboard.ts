import {Database} from 'better-sqlite3';

export const prepareDashboard = (db: Database) => db
    .prepare(
        `SELECT json_object(
            'id', \`s\`.\`id\`,
            'remoteAddress', \`s\`.\`remote_address\`,
            'name', \`s\`.\`name\`,
            'turtles', iif(\`t\`.\`id\` IS NOT NULL, json_group_array(json_object(
                'id', \`t\`.\`id\`,
                'name', \`t\`.\`name\`,
                'fuelLevel', \`t\`.\`fuel_level\`,
                'fuelLimit', \`t\`.\`fuel_limit\`,
                'state', json(\`t\`.\`state\`),
                'error', json(null)
            )), json_array())
        ) FROM \`servers\` AS \`s\`
        LEFT JOIN \`turtles\` AS \`t\` ON \`t\`.\`server_id\` = \`s\`.\`id\`
        GROUP BY \`s\`.\`id\``
    )
    .pluck();
