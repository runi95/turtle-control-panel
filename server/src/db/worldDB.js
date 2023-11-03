const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

module.exports = class WorldDB {
    constructor() {
        this.db = new JsonDB(new Config('world.json', true, true, '/'));
    }

    updateBlock(x, y, z, block = {}) {
        this.db.push(`/${x},${y},${z}`, block);
    }

    deleteBlock(x, y, z) {
        return this.db.delete(`/${x},${y},${z}`);
    }

    getBlock(x, y, z) {
        return this.db.getData(`/${x},${y},${z}`);
    }

    getAllBlocks() {
        return this.db.getData('/');
    }
};
