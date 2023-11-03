const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

module.exports = class AreasDB {
    constructor() {
        this.db = new JsonDB(new Config('areas.json', true, true, '/'));
    }

    addArea(area) {
        this.db.push(`/${area.id}`, area);
    }

    async getArea(id) {
        try {
            return await this.db.getData(`/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    getAreas() {
        return this.db.getData('/');
    }
};
