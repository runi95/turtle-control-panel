const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class ServersDB {
    constructor() {
        this.db = new JsonDB(new Config('servers.json', true, true, '/'));
    }

    async addServer(server) {
        await this.db.push(`/${server.id}/`, server, false);
    }

    async getServerByRemoteAddress(remoteAddress) {
        return await this.db.find('/', (entry) => entry.remoteAddress === remoteAddress);
    }

    async getServer(id) {
        if (!id) throw new Error(`Invalid argument "${id}"`);
        try {
            return await this.db.getData(`/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    async getServers() {
        return await this.db.getData('/');
    }
}

module.exports = new ServersDB();
