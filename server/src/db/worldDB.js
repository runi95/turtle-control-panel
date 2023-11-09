const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class WorldDB {
    constructor() {
        this.db = new JsonDB(new Config('world.json', true, true, '/'));
    }

    async updateBlock(x, y, z, block = {}) {
        await this.db.push(`/${x},${y},${z}`, block);
    }

    async deleteBlock(x, y, z) {
        return await this.db.delete(`/${x},${y},${z}`);
    }

    async getBlock(x, y, z) {
        return await this.db.getData(`/${x},${y},${z}`);
    }

    async getAllBlocks() {
        return await this.db.getData('/');
    }
}

module.exports = new WorldDB();
