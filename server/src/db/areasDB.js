const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

module.exports = class AreasDB {
    constructor() {
        this.db = new JsonDB(new Config('areas.json', true, true, '/'));
    }

    addArea(area) {
        this.db.push(`/${area.id}`, area);
    }

    getArea(id) {
        try {
            return this.db.getData(`/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    getAreas() {
        return this.db.getData('/');
    }
};
