const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class TurtlesDB {
    constructor() {
        this.db = new JsonDB(new Config('turtles.json', true, true, '/'));
    }

    async addTurtle(serverId, id, turtle) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}`, turtle, false);
    }

    async getTurtle(serverId, id) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        try {
            return await this.db.getData(`/${serverId}/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    async getTurtles(serverId) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        return await this.db.getData(`/${serverId}/`);
    }

    async getAllTurtles() {
        return await this.db.getData('/');
    }

    async updateName(serverId, id, name) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/name`, name);
    }

    async updateOnlineStatus(serverId, id, isOnline) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/isOnline`, isOnline);
    }

    async updateFuelLevel(serverId, id, fuelLevel) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/fuelLevel`, fuelLevel);
    }

    async updateSelectedSlot(serverId, id, selectedSlot) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/selectedSlot`, selectedSlot);
    }

    async updateInventory(serverId, id, inventory) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/inventory`, inventory);
    }

    async updateStepsSinceLastRecharge(serverId, id, stepsSinceLastRecharge) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/stepsSinceLastRecharge`, stepsSinceLastRecharge);
    }

    async updateState(serverId, id, state) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/state`, state);
    }

    async updateLocation(serverId, id, location) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/location`, location);
    }

    async updateDirection(serverId, id, direction) {
        if (!serverId) throw new Error(`Invalid argument "${serverId}"`);
        if (!id) throw new Error(`Invalid argument "${id}"`);
        await this.db.push(`/${serverId}/${id}/direction`, direction);
    }
}

module.exports = new TurtlesDB();
