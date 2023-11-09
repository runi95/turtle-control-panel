const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');

class TurtlesDB {
    constructor() {
        this.db = new JsonDB(new Config('turtles.json', true, true, '/'));
    }

    async addTurtle(turtle) {
        await this.db.push(`/${turtle.id}`, turtle);
    }

    async getTurtle(id) {
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
        await this.db.push(`/${id}/name`, name);
    }

    async updateOnlineStatus(id, isOnline) {
        await this.db.push(`/${id}/isOnline`, isOnline);
    }

    async updateFuelLevel(fuelLevel) {
        await this.db.push(`/${id}/fuelLevel`, fuelLevel);
    }

    async updateSelectedSlot(selectedSlot) {
        await this.db.push(`/${id}/selectedSlot`, selectedSlot);
    }

    async updateInventory(inventory) {
        await this.db.push(`/${id}/inventory`, inventory);
    }

    async updateStepsSinceLastRecharge(stepsSinceLastRecharge) {
        await this.db.push(`/${id}/stepsSinceLastRecharge`, stepsSinceLastRecharge);
    }

    async updateState(id, state) {
        await this.db.push(`/${id}/state`, state);
    }

    async updateLocation(location) {
        await this.db.push(`/${id}/location`, location);
    }

    async updateDirection(direction) {
        await this.db.push(`/${id}/direction`, direction);
    }
}

module.exports = new TurtlesDB();
