const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

module.exports = class TurtlesDB {
    constructor() {
        this.db = new JsonDB(new Config('turtles.json', true, true, '/'));
    }

    async addTurtle(turtle) {
        await this.db.push(`/${turtle.id}`, turtle);
    }

    async updateOnlineStatus(id, isOnline) {
        await this.db.push(`/${id}/isOnline`, isOnline);
    }

    async updateState(id, state) {
        await this.db.push(`/${id}/state`, state);
    }

    async getTurtle(id) {
        try {
            return await this.db.getData(`/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    async getTurtles() {
        return await this.db.getData('/');
    }
};
