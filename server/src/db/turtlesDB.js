const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class TurtlesDB {
    constructor() {
        this.db = new JsonDB(new Config('turtles.json', true, true, '/'));
    }

    async addTurtle(id, turtle) {
        if (!id) return;
        await this.db.push(`/${id}`, turtle, false);
    }

    async getTurtle(id) {
        if (!id) return undefined;
        try {
            return await this.db.getData(`/${id}`);
        } catch (err) {
            return undefined;
        }
    }

    async getTurtles() {
        return await this.db.getData('/');
    }

    async updateName(id, name) {
        if (!id) return;
        await this.db.push(`/${id}/name`, name);
    }

    async updateOnlineStatus(id, isOnline) {
        if (!id) return;
        await this.db.push(`/${id}/isOnline`, isOnline);
    }

    async updateFuelLevel(id, fuelLevel) {
        if (!id) return;
        await this.db.push(`/${id}/fuelLevel`, fuelLevel);
    }

    async updateSelectedSlot(id, selectedSlot) {
        if (!id) return;
        await this.db.push(`/${id}/selectedSlot`, selectedSlot);
    }

    async updateInventory(id, inventory) {
        if (!id) return;
        await this.db.push(`/${id}/inventory`, inventory);
    }

    async updateStepsSinceLastRecharge(id, stepsSinceLastRecharge) {
        if (!id) return;
        await this.db.push(`/${id}/stepsSinceLastRecharge`, stepsSinceLastRecharge);
    }

    async updateState(id, state) {
        if (!id) return;
        await this.db.push(`/${id}/state`, state);
    }

    async updateLocation(id, location) {
        if (!id) return;
        await this.db.push(`/${id}/location`, location);
    }

    async updateDirection(id, direction) {
        if (!id) return;
        await this.db.push(`/${id}/direction`, direction);
    }
}

module.exports = new TurtlesDB();
