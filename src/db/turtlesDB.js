const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

module.exports = class TurtlesDB {
    constructor() {
        this.db = new JsonDB(new Config('turtles.json', true, true, '/'));
    }

    addTurtle(turtle) {
        this.db.push(`/${turtle.id}`, turtle);
    }

    updateOnlineStatus(id, isOnline) {
        this.db.push(`/${id}/isOnline`, isOnline);
    }

    getTurtle(id) {
        try {
            return this.db.getData(`/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    getTurtles() {
        return this.db.getData('/');
    }
};
