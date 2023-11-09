const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class AreasDB {
    constructor() {
        this.db = new JsonDB(new Config('areas.json', true, true, '/'));
    }

    async addArea(area) {
        await this.db.push(`/${area.id}`, area);
    }

    async getArea(id) {
        try {
            return await this.db.getData(`/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    async getAreas() {
        return await this.db.getData('/');
    }
}

module.exports = new AreasDB();
