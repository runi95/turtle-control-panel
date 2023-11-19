const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class WorldDB {
    constructor() {
        this.db = new JsonDB(new Config('world.json', true, true, '/'));
    }

    async updateBlock(serverId, x, y, z, block = {}) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        await this.db.push(`/${serverId}/${x},${y},${z}`, block);
    }

    async deleteBlock(serverId, x, y, z) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        return await this.db.delete(`/${serverId}/${x},${y},${z}`);
    }

    async getBlock(serverId, x, y, z) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        return await this.db.getObjectDefault(`/${x},${y},${z}`, null);
    }

    async getBlocks(serverId) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        try {
            return await this.db.getData(`/${serverId}/`);
        } catch (err) {
            return {};
        }
    }

    async getAllBlocks() {
        return await this.db.getData('/');
    }
}

module.exports = new WorldDB();
