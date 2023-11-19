const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class AreasDB {
    constructor() {
        this.db = new JsonDB(new Config('areas.json', true, true, '/'));
    }

    async addArea(serverId, area) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        await this.db.push(`/${serverId}/${area.id}`, area);
    }

    async getArea(serverId, id) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        try {
            return await this.db.getData(`/${serverId}/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    async getAreas(serverId) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        return await this.db.getData(`/${serverId}/`);
    }

    async getAllAreas() {
        return await this.db.getData('/');
    }
}

module.exports = new AreasDB();
