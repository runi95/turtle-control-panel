const { EventEmitter } = require('events');
const Coordinates = require('./dlite/coordinates');
const DStarLite = require('./dlite');

const getLocalCoordinatesForDirection = (direction) => {
    return [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
    ][direction - 1];
};

const mineshaftEntrance = { x: 467, y: 87, z: -587 };
const rechargeStation = { x: 455, y: 87, z: -597 };

module.exports = class TurtleController extends (
    EventEmitter
) {
    constructor(turtlesDB, worldDB, areasDB, wsTurtle, turtle) {
        super();

        this.turtlesDB = turtlesDB;
        this.worldDB = worldDB;
        this.areasDB = areasDB;
        this.wsTurtle = wsTurtle;
        this.turtle = turtle;
    }

    async forward() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.forward()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        this.turtle.stepsSinceLastRecharge++;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x: x + xChange, y, z: z + zChange };
        this.emit('update', 'tlocation', { id: this.turtle.id, location: this.turtle.location, fuelLevel: this.turtle.fuelLevel });
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('update', 'wdelete', { x: this.turtle.location.x, y: this.turtle.location.y, z: this.turtle.location.z });
    }

    async back() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.back()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        this.turtle.stepsSinceLastRecharge++;
        const [xChange, zChange] = getLocalCoordinatesForDirection((((this.turtle.direction % 4) + 1) % 4) + 1);
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x: x + xChange, y, z: z + zChange };
        this.emit('update', 'tlocation', { id: this.turtle.id, location: this.turtle.location, fuelLevel: this.turtle.fuelLevel });
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('update', 'wdelete', { x: this.turtle.location.x, y: this.turtle.location.y, z: this.turtle.location.z });
    }

    async up() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.up()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        this.turtle.stepsSinceLastRecharge++;
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x, y: y + 1, z };
        this.emit('update', 'tlocation', { id: this.turtle.id, location: this.turtle.location, fuelLevel: this.turtle.fuelLevel });
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('update', 'wdelete', { x: this.turtle.location.x, y: this.turtle.location.y, z: this.turtle.location.z });
    }

    async down() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.down()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x, y: y - 1, z };
        this.emit('update', 'tlocation', { id: this.turtle.id, location: this.turtle.location, fuelLevel: this.turtle.fuelLevel });
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('update', 'wdelete', { x: this.turtle.location.x, y: this.turtle.location.y, z: this.turtle.location.z });
    }

    async turnLeft() {
        const [didTurn, err] = await this.wsTurtle.exec('turtle.turnLeft()');
        if (!didTurn) {
            throw new Error(err);
        }

        this.turtle.direction = ((this.turtle.direction + 2) % 4) + 1;
        this.turtlesDB.addTurtle(this.turtle);
    }

    async turnRight() {
        const [didTurn, err] = await this.wsTurtle.exec('turtle.turnRight()');
        if (!didTurn) {
            throw new Error(err);
        }

        this.turtle.direction = (this.turtle.direction % 4) + 1;
        this.turtlesDB.addTurtle(this.turtle);
    }

    async turnToDirection(direction) {
        const turn = (direction - this.turtle.direction + 4) % 4;
        if (turn === 1) {
            await this.turnRight();
        } else if (turn === 2) {
            await this.turnLeft();
            await this.turnLeft();
        } else if (turn === 3) {
            await this.turnLeft();
        }
    }

    async dig() {
        return await this.wsTurtle.exec('turtle.dig()');
    }

    async digUp() {
        return await this.wsTurtle.exec('turtle.digUp()');
    }

    async digDown() {
        return await this.wsTurtle.exec('turtle.digDown()');
    }

    async place() {
        return await this.wsTurtle.exec('turtle.place()');
    }

    async placeUp() {
        return await this.wsTurtle.exec('turtle.placeUp()');
    }

    async placeDown() {
        return await this.wsTurtle.exec('turtle.placeDown()');
    }

    async drop() {
        return await this.wsTurtle.exec('turtle.drop()');
    }

    async dropUp() {
        return await this.wsTurtle.exec('turtle.dropUp()');
    }

    async dropDown() {
        return await this.wsTurtle.exec('turtle.dropDown()');
    }

    async select(slot = 1) {
        const result = await this.wsTurtle.exec(`turtle.select(${slot})`);
        this.turtle.selectedSlot = slot;
        return result;
    }

    async getItemCount(slot = this.turtle.selectedSlot) {
        return await this.wsTurtle.exec(`turtle.getItemCount(${slot})`);
    }

    async getItemSpace(slot = this.turtle.selectedSlot) {
        return await this.wsTurtle.exec(`turtle.getItemSpace(${slot})`);
    }

    async detect() {
        return (await this.wsTurtle.exec('turtle.detect()'))[0];
    }

    async detectUp() {
        return (await this.wsTurtle.exec('turtle.detectUp()'))[0];
    }

    async detectDown() {
        return (await this.wsTurtle.exec('turtle.detectDown()'))[0];
    }

    /**
     * Detects whether or not the block in front of
     * the turtle is the same as the one in the currently selected slot
     */
    async compare() {
        return await this.wsTurtle.exec('turtle.compare()');
    }

    /**
     * Detects whether or not the block above the turtle
     * is the same as the one in the currently selected slot
     */
    async compareUp() {
        return await this.wsTurtle.exec('turtle.compareUp()');
    }

    /**
     * Detects whether or not the block below the turtle
     * is the same as the one in the currently selected slot
     */
    async compareDown() {
        return await this.wsTurtle.exec('turtle.compareDown()');
    }

    async attack() {
        return await this.wsTurtle.exec(`turtle.attack()`);
    }

    async attackUp() {
        return await this.wsTurtle.exec(`turtle.attackUp()`);
    }

    async attackDown() {
        return await this.wsTurtle.exec(`turtle.attackDown()`);
    }

    async suck(count) {
        return await this.wsTurtle.exec(`turtle.suck(${count})`);
    }

    async suckUp(count) {
        return await this.wsTurtle.exec(`turtle.suckUp(${count})`);
    }

    async suckDown(count) {
        return await this.wsTurtle.exec(`turtle.suckDown(${count})`);
    }

    async getFuelLevel() {
        const [updatedFuelLevel] = await this.wsTurtle.exec('turtle.getFuelLevel()');
        return updatedFuelLevel;
    }

    async refuel() {
        await this.wsTurtle.exec('turtle.refuel()');
        const updatedFuelLevel = await this.getFuelLevel();
        this.turtle.fuelLevel = updatedFuelLevel;
        this.turtlesDB.addTurtle(this.turtle);
    }

    /**
     * Detects whether or not the item in the specified slot is the
     * same as the item in the currently selected slot
     *
     * @param {number} slot
     */
    async compareTo(slot) {
        return await this.wsTurtle.exec(`turtle.compareTo(${slot})`);
    }

    /**
     * Transfers quantity items from the currently selected slot to the specified slot.
     * If the quantity argument is omitted, tries to transfer all the items from the currently selected slot.
     * If the destination slot already has items of a different type, returns false
     * (does not try to fill the next slot, like suck() would).
     * If there are fewer than quantity items in the currently selected slot or only room for fewer items in the destination slot,
     * transfers only as many as possible and returns true. If none can be transferred, returns false
     *
     * @param {number} slot
     * @param {number} count
     */
    async transferTo(slot, count) {
        if (count) {
            return await this.wsTurtle.exec(`transferTo(${slot}, ${count})`);
        } else {
            return await this.wsTurtle.exec(`transferTo(${slot})`);
        }
    }

    async getSelectedSlot() {
        const [selectedSlot] = await this.wsTurtle.exec('turtle.getSelectedSlot()');
        this.turtle.selectedSlot = selectedSlot;
        this.turtlesDB.addTurtle(this.turtle);
        return selectedSlot;
    }

    async getFuelLimit() {
        return await this.wsTurtle.exec('turtle.getFuelLimit()');
    }

    async equipLeft() {
        return await this.wsTurtle.exec('turtle.equipLeft()');
    }

    async equipRight() {
        return await this.wsTurtle.exec('turtle.equipRight()');
    }

    /**
     * Get information about the block in front of the turtle
     */
    async inspect() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspect()');
        const { x, y, z } = this.turtle.location;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
        if (!didInspect) {
            this.worldDB.deleteBlock(x + xChange, y, z + zChange);
            this.emit('update', 'wdelete', { x: x + xChange, y, z: z + zChange });
            return undefined;
        }

        this.worldDB.updateBlock(x + xChange, y, z + zChange, block);
        this.emit('update', 'wupdate', { x: x + xChange, y, z: z + zChange, block });
        return block;
    }

    /**
     * Get information about the block above the turtle
     */
    async inspectUp() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspectUp()');
        const { x, y, z } = this.turtle.location;
        if (!didInspect) {
            this.worldDB.deleteBlock(x, y + 1, z);
            this.emit('update', 'wdelete', { x, y: y + 1, z });
            return undefined;
        }

        this.worldDB.updateBlock(x, y + 1, z, block);
        this.emit('update', 'wupdate', { x, y: y + 1, z, block });
        return block;
    }

    /**
     * Get information about the block below the turtle
     */
    async inspectDown() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspectDown()');
        const { x, y, z } = this.turtle.location;
        if (!didInspect) {
            this.worldDB.deleteBlock(x, y - 1, z);
            this.emit('update', 'wdelete', { x, y: y - 1, z });
            return undefined;
        }

        this.worldDB.updateBlock(x, y - 1, z, block);
        this.emit('update', 'wupdate', { x, y: y - 1, z, block });
        return block;
    }

    async getItemDetail(slot = this.turtle.selectedSlot, detailed = false) {
        return await this.wsTurtle.exec(`turtle.getItemDetail(${slot}, ${detailed})`);
    }

    /**
     * Requires a Crafty Turtle.
     * Crafts an item if items in the turtle's inventory matches a valid recipe.
     * The items can be placed anywhere as long as they are oriented properly with respect to one another.
     * Can craft a maximum of one stack of items at a time; for example,
     * if you put three stacks of 64 reed in a line and craft them, only 63 paper will be crafted,
     * and three piles of 43 reed will remain in the turtle.
     * Will not craft if there are any items in the turtle's inventory that are not part of the recipe,
     * including in the slots not used for crafting. The produced items will appear in the selected slot,
     * if that slot is free. If not, it will try the next available slot.
     * A parameter can also be supplied to specify the quantity of items to craft.
     * If the quantity specified is 0, will return true if a valid recipe has been found in the turtle's inventory, and false otherwise.
     *
     * @param {number} limit
     */
    async craft(limit) {
        if (limit) {
            return await this.wsTurtle.exec(`turtle.craft(${limit})`);
        } else {
            return await this.wsTurtle.exec(`turtle.craft()`);
        }
    }

    async dropAllItems() {
        const currentlySelectedSlot = await this.getSelectedSlot();
        for (let i = 1; i < 17; i++) {
            await this.select(i);
            await this.drop();
        }

        await this.select(currentlySelectedSlot);
    }

    async selectItemOfType(name) {
        for (let i = 1; i < 17; i++) {
            const itemDetail = await this.getItemDetail(i);
            if (itemDetail.length !== undefined) {
                if (itemDetail[0].name === name) {
                    await this.select(i);
                    return true;
                }
            }
        }

        return false;
    }

    async checkPeripheral() {
        const list = (
            await this.wsTurtle.execRaw(
                `local list = peripheral.wrap('front').list()\nlocal result = {}\nfor k, v in pairs(list) do result[tostring(k)] = list[k]end\nreturn result`,
            )
        )['0'];

        // 1 coal === 80 fuel
        if (list === undefined) {
            throw new Error('Failed to refuel');
        }

        const keys = Object.keys(list);
        for (let i = 0; i < keys.length; i++) {
            if (list[keys[i]].name === 'minecraft:coal') {
                console.log('Found coal!');
            }
        }
    }

    async sleep(ms) {
        await new Promise((resolve) => setTimeout(() => resolve(), ms));
    }

    async mineToYLevel(mineTarget) {
        if (Number.isNaN(mineTarget)) {
            throw new Error('Invalid mine target');
        }

        const diffInYLevels = mineTarget - this.turtle.location.y;
        if (diffInYLevels !== 0) {
            if (diffInYLevels < 0) {
                await this.digDown();
                await this.suckDown();
                await this.down();
            } else if (diffInYLevels > 0) {
                await this.digUp();
                await this.suckUp();
                await this.up();
            }
        } else {
            this.turtle.state = undefined;
            this.turtlesDB.addTurtle(this.turtle);
        }
    }

    async mineInDirection(mineTarget) {
        switch (mineTarget) {
            case 'Up':
                await this.digUp();
                await this.suckUp();
                break;
            case 'Down':
                await this.digDown();
                await this.suckDown();
                break;
            case 'North':
            case 'East':
            case 'South':
            case 'West':
                await this.turnToDirection({ North: 2, East: 3, South: 4, West: 1 }[mineTarget]);
                await this.dig();
                await this.suck();
                break;
            default:
                throw new Error('Invalid mine target');
        }

        this.turtle.state = undefined;
        this.turtlesDB.addTurtle(this.turtle);
    }

    async mine() {
        const { mineType, mineTarget } = this.turtle.state;
        if (mineType === 'direction') {
            return await this.mineInDirection(mineTarget);
        }

        const { x, y, z } = this.turtle.location;
        if ((await this.getItemDetail(16)).length !== undefined) {
            const currentDirection = this.turtle.direction;
            await this.moveTo(rechargeStation.x, rechargeStation.y, rechargeStation.z);
            await this.dropAllItems();
            await this.moveTo(x, y, z);
            await this.turnToDirection(currentDirection);
        }

        if (mineType === 'ylevel') {
            return await this.mineToYLevel(Number(mineTarget));
        } else if (mineType === 'area') {
            const currentIndex = this.turtle.state.index || 0;
            const mineArea = this.areasDB.getArea(mineTarget);
            if (mineArea === undefined) {
                throw new Error('Given mining area does not exist');
            }

            const mineTargetArea = mineArea.area[currentIndex];
            await this.moveToAndMineObstacles(mineTargetArea.x, mineTargetArea.y, mineTargetArea.z, mineArea.area);

            const newIndex = currentIndex + 1;
            if (newIndex < mineArea.area.length) {
                this.turtle.state.index = newIndex;
                this.turtlesDB.addTurtle(this.turtle);
            } else {
                this.turtle.state = undefined;
                this.turtlesDB.addTurtle(this.turtle);
            }
        } else {
            throw new Error('Invalid mine type');
        }
    }

    async moveAndRefuel() {
        if (this.turtle.fuelLevel > 0.8 * this.turtle.fuelLimit) {
            this.turtle.state = undefined;
            this.turtlesDB.addTurtle(this.turtle);
            return;
        }

        await this.moveTo(rechargeStation.x, rechargeStation.y, rechargeStation.z);

        if (this.turtle.state.dropAllItems) {
            await this.dropAllItems();
        }

        await this.suckUp(Math.min((this.turtle.fuelLimit - this.turtle.fuelLevel) / 80, 64));
        await this.refuel();

        this.turtle.stepsSinceLastRecharge = 0;
    }

    async farm() {
        const { x, y, z } = this.turtle.location;
        if ((await this.getItemDetail(16)).length !== undefined) {
            const currentDirection = this.turtle.direction;
            await this.moveTo(rechargeStation.x, rechargeStation.y, rechargeStation.z);
            await this.dropAllItems();
            await this.moveTo(x, y, z);
            await this.turnToDirection(currentDirection);
        }

        const { areaId, currentAreaFarmIndex } = this.turtle.state;
        const farmArea = this.areasDB.getArea(areaId);

        await this.moveTo(
            farmArea.area[currentAreaFarmIndex].x,
            farmArea.area[currentAreaFarmIndex].y,
            farmArea.area[currentAreaFarmIndex].z,
        );
        const block = await this.inspectDown();

        // Sow if possible
        if (block === undefined) {
            await this.digDown();

            const isWheatSeedsSelected = await this.selectItemOfType('minecraft:wheat_seeds');
            if (isWheatSeedsSelected) {
                await this.placeDown();
            }

            this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
            this.turtlesDB.addTurtle(this.turtle);
        } else {
            switch (block.name) {
                case 'minecraft:wheat':
                    if (block.state.age === 7) {
                        await this.digDown();
                        let continueToPickUpItems = true;
                        let itemPickupCounter = 0;
                        while (continueToPickUpItems && itemPickupCounter < 16) {
                            const [didGatherItems] = await this.suckDown();
                            continueToPickUpItems = didGatherItems;
                            itemPickupCounter++;
                        }
                        const isWheatSeedsSelected = await this.selectItemOfType('minecraft:wheat_seeds');
                        if (isWheatSeedsSelected) {
                            await this.placeDown();
                        }

                        this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
                        this.turtlesDB.addTurtle(this.turtle);
                    }
                    break;
                case 'minecraft:carrots':
                    if (block.state.age === 7) {
                        await this.digDown();
                        let continueToPickUpItems = true;
                        let itemPickupCounter = 0;
                        while (continueToPickUpItems && itemPickupCounter < 16) {
                            const [didGatherItems] = await this.suckDown();
                            continueToPickUpItems = didGatherItems;
                            itemPickupCounter++;
                        }
                        const isCarrotSelected = await this.selectItemOfType('minecraft:carrot');
                        if (isCarrotSelected) {
                            await this.placeDown();
                        }

                        this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
                        this.turtlesDB.addTurtle(this.turtle);
                    }
                    break;
                case 'minecraft:potatoes':
                    if (block.state.age === 7) {
                        await this.digDown();
                        let continueToPickUpItems = true;
                        let itemPickupCounter = 0;
                        while (continueToPickUpItems && itemPickupCounter < 16) {
                            const [didGatherItems] = await this.suckDown();
                            continueToPickUpItems = didGatherItems;
                            itemPickupCounter++;
                        }
                        const isPotatoSelected = await this.selectItemOfType('minecraft:potato');
                        if (isPotatoSelected) {
                            await this.placeDown();
                        }

                        this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
                        this.turtlesDB.addTurtle(this.turtle);
                    }
                    break;
                case 'minecraft:beetroots':
                    if (block.state.age === 3) {
                        await this.digDown();
                        let continueToPickUpItems = true;
                        let itemPickupCounter = 0;
                        while (continueToPickUpItems && itemPickupCounter < 16) {
                            const [didGatherItems] = await this.suckDown();
                            continueToPickUpItems = didGatherItems;
                            itemPickupCounter++;
                        }
                        const isPotatoSelected = await this.selectItemOfType('minecraft:beetroot_seeds');
                        if (isPotatoSelected) {
                            await this.placeDown();
                        }

                        this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
                        this.turtlesDB.addTurtle(this.turtle);
                    }
                    break;
                case 'minecraft:nether_wart':
                    if (block.state.age === 3) {
                        await this.digDown();
                        let continueToPickUpItems = true;
                        let itemPickupCounter = 0;
                        while (continueToPickUpItems && itemPickupCounter < 16) {
                            const [didGatherItems] = await this.suckDown();
                            continueToPickUpItems = didGatherItems;
                            itemPickupCounter++;
                        }
                        const isPotatoSelected = await this.selectItemOfType('minecraft:nether_wart');
                        if (isPotatoSelected) {
                            await this.placeDown();
                        }

                        this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
                        this.turtlesDB.addTurtle(this.turtle);
                    }
                    break;
                case 'minecraft:sweet_berry_bush':
                    if (block.state.age === 3) {
                        await this.digDown();
                        let continueToPickUpItems = true;
                        let itemPickupCounter = 0;
                        while (continueToPickUpItems && itemPickupCounter < 16) {
                            const [didGatherItems] = await this.suckDown();
                            continueToPickUpItems = didGatherItems;
                            itemPickupCounter++;
                        }
                        const isPotatoSelected = await this.selectItemOfType('minecraft:sweet_berries');
                        if (isPotatoSelected) {
                            await this.placeDown();
                        }

                        this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
                        this.turtlesDB.addTurtle(this.turtle);
                    }
                    break;
                default:
                    this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
                    this.turtlesDB.addTurtle(this.turtle);
                    break;
            }
        }
    }

    async *ai() {
        while (true) {
            if (
                this.turtle.fuelLevel < this.turtle.fuelLimit * 0.1 ||
                this.turtle.stepsSinceLastRecharge >= this.turtle.fuelLimit - this.turtle.fuelLevel + this.turtle.fuelLimit * 0.1
            ) {
                this.turtle.state = { id: 1, name: 'refueling', dropAllItems: true };
                this.turtlesDB.addTurtle(this.turtle);
            }

            const stateId = (this.turtle.state || {}).id;
            switch (stateId) {
                case 1:
                    await this.moveAndRefuel();
                    break;
                case 2:
                    await this.mine();
                    break;
                case 3:
                    await this.moveTo(this.turtle.state.x, this.turtle.state.y, this.turtle.state.z);
                    break;
                case 4:
                    await this.farm();
                    break;
            }

            yield;
        }
    }

    async digSuckItemAndMoveForward() {
        let hasNotMovedForward = true;
        let attempts = 0;
        while (hasNotMovedForward) {
            await this.dig();
            await this.suck();
            try {
                await this.forward();
                hasNotMovedForward = false;
            } catch (err) {
                if (attempts > 5) {
                    throw err;
                }
            }

            attempts++;
        }
    }

    async moveToAndMineObstacles(targetX, targetY, targetZ, minableBlocksWhitelist) {
        const mineableObstaclesMap = minableBlocksWhitelist.reduce((acc, curr) => {
            acc[`${curr.x},${curr.y},${curr.z}`] = true;
            return acc;
        }, {});

        let px = this.turtle.location.x;
        let py = this.turtle.location.y;
        let pz = this.turtle.location.z;
        if (!(px === targetX && py === targetY && pz === targetZ)) {
            let moves = 0;
            const obstacles = [];
            const obstaclesHash = {};
            const env = {
                moveTo: async (s) => {
                    moves++;
                    px = s.x;
                    py = s.y;
                    pz = s.z;

                    const { x, y, z } = this.turtle.location;
                    if (py - y > 0) {
                        try {
                            await this.up();
                            return true;
                        } catch (err) {
                            const upLocation = `${x},${y + 1},${z}`;
                            if (mineableObstaclesMap[upLocation]) {
                                await this.digUp();
                                await this.suckUp();
                                await this.up();
                                return true;
                            } else {
                                obstaclesHash[upLocation] = true;
                                obstacles.push(new Coordinates(x, y + 1, z));
                                return false;
                            }
                        }
                    } else if (py - y < 0) {
                        try {
                            await this.down();
                            return true;
                        } catch (err) {
                            const downLocation = `${x},${y - 1},${z}`;
                            if (mineableObstaclesMap[downLocation]) {
                                await this.digDown();
                                await this.suckDown();
                                await this.down();
                                return true;
                            } else {
                                obstaclesHash[downLocation] = true;
                                obstacles.push(new Coordinates(x, y - 1, z));
                                return false;
                            }
                        }
                    } else {
                        const heading = { x: px - x, y: py - y, z: pz - z };
                        const direction = heading.x + Math.abs(heading.x) * 2 + (heading.z + Math.abs(heading.z) * 3);
                        await this.turnToDirection(direction);
                        try {
                            await this.forward();
                            return true;
                        } catch (err) {
                            const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
                            const forwardLocation = `${x + xChange},${y},${z + zChange}`;
                            if (mineableObstaclesMap[forwardLocation]) {
                                await this.digSuckItemAndMoveForward();
                                return true;
                            } else {
                                obstaclesHash[forwardLocation] = true;
                                obstacles.push(new Coordinates(x + xChange, y, z + zChange));
                                return false;
                            }
                        }
                    }
                },
                getInitialObstacles: async () => {
                    const allBlocks = this.worldDB.getAllBlocks();
                    return Object.keys(allBlocks)
                        .filter((key) => !mineableObstaclesMap[key])
                        .map((key) => {
                            const keySplit = key.split(',');
                            return {
                                x: keySplit[0],
                                y: keySplit[1],
                                z: keySplit[2],
                            };
                        });
                },
                getObstaclesInVision: async () => {
                    const { x, y, z } = this.turtle.location;
                    const coordinatesInFront = getLocalCoordinatesForDirection(this.turtle.direction);
                    const inFrontX = x + coordinatesInFront[0];
                    const inFrontZ = z + coordinatesInFront[1];
                    const frontLocation = `${inFrontX},${y},${inFrontZ}`;
                    if (obstaclesHash[frontLocation] === undefined) {
                        if (await this.inspect()) {
                            if (mineableObstaclesMap[frontLocation]) {
                                await this.dig();
                                await this.suck();
                            } else {
                                obstaclesHash[frontLocation] = true;
                                obstacles.push(new Coordinates(inFrontX, y, inFrontZ));
                            }
                        }
                    }

                    const upLocation = `${x},${y + 1},${z}`;
                    if (obstaclesHash[upLocation] === undefined) {
                        if (await this.inspectUp()) {
                            if (mineableObstaclesMap[upLocation]) {
                                await this.digUp();
                                await this.suckUp();
                            } else {
                                obstaclesHash[upLocation] = true;
                                obstacles.push(new Coordinates(x, y + 1, z));
                            }
                        }
                    }

                    const downLocation = `${x},${y - 1},${z}`;
                    if (obstaclesHash[downLocation] === undefined) {
                        if (await this.inspectDown()) {
                            if (mineableObstaclesMap[downLocation]) {
                                await this.digDown();
                                await this.suckDown();
                            } else {
                                obstaclesHash[downLocation] = true;
                                obstacles.push(new Coordinates(x, y - 1, z));
                            }
                        }
                    }

                    return obstacles;
                },
            };

            const dStarLite = new DStarLite();
            try {
                await dStarLite.runDStarLite(px, py, pz, targetX, targetY, targetZ, env);
                console.log(`Moves: ${moves}`);
            } catch (err) {
                console.error(err);
            }
        }

        if (this.turtle.state && this.turtle.state.id === 3) {
            this.turtlesDB.updateState(this.turtle.id, undefined);
        }
    }

    async moveTo(targetX, targetY, targetZ) {
        return await this.moveToAndMineObstacles(targetX, targetY, targetZ, []);
    }
};
