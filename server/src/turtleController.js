const {EventEmitter} = require('events');
const Coordinates = require('./dlite/Coordinates');
const DStarLite = require('./dlite');
const turtlesDB = require('./db/turtlesDB');
const worldDB = require('./db/worldDB');
const areasDB = require('./db/areasDB');
const {farmingBlockToSeedMapObject, farmingSeedNames} = require('../helpers/farming');

const getLocalCoordinatesForDirection = (direction) => {
    return [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
    ][direction - 1];
};

const rechargeStation = {x: 455, y: 87, z: -597};

module.exports = class TurtleController extends EventEmitter {
    constructor(wsTurtle, turtle) {
        super();

        this.wsTurtle = wsTurtle;
        this.turtle = turtle;
    }

    async forward() {
        const forward = await this.wsTurtle.exec('turtle.forward()');
        const [didMove] = forward;
        if (didMove) {
            this.turtle.fuelLevel--;
            this.turtle.stepsSinceLastRecharge++;
            const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
            const {x, y, z} = this.turtle.location;
            this.turtle.location = {x: x + xChange, y, z: z + zChange};
            this.emit('update', 'tlocation', {
                id: this.turtle.id,
                location: this.turtle.location,
                fuelLevel: this.turtle.fuelLevel,
            });
            turtlesDB.addTurtle(this.turtle);
            worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
            this.emit('update', 'wdelete', {
                x: this.turtle.location.x,
                y: this.turtle.location.y,
                z: this.turtle.location.z,
            });
        }
        return forward;
    }

    async back() {
        const back = await this.wsTurtle.exec('turtle.back()');
        const [didMove] = back;
        if (didMove) {
            this.turtle.fuelLevel--;
            this.turtle.stepsSinceLastRecharge++;
            const [xChange, zChange] = getLocalCoordinatesForDirection((((this.turtle.direction % 4) + 1) % 4) + 1);
            const {x, y, z} = this.turtle.location;
            this.turtle.location = {x: x + xChange, y, z: z + zChange};
            this.emit('update', 'tlocation', {
                id: this.turtle.id,
                location: this.turtle.location,
                fuelLevel: this.turtle.fuelLevel,
            });
            turtlesDB.addTurtle(this.turtle);
            worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
            this.emit('update', 'wdelete', {
                x: this.turtle.location.x,
                y: this.turtle.location.y,
                z: this.turtle.location.z,
            });
        }
        return back;
    }

    async up() {
        const up = await this.wsTurtle.exec('turtle.up()');
        const [didMove] = up;
        if (didMove) {
            this.turtle.fuelLevel--;
            this.turtle.stepsSinceLastRecharge++;
            const {x, y, z} = this.turtle.location;
            this.turtle.location = {x, y: y + 1, z};
            this.emit('update', 'tlocation', {
                id: this.turtle.id,
                location: this.turtle.location,
                fuelLevel: this.turtle.fuelLevel,
            });
            turtlesDB.addTurtle(this.turtle);
            worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
            this.emit('update', 'wdelete', {
                x: this.turtle.location.x,
                y: this.turtle.location.y,
                z: this.turtle.location.z,
            });
        }
        return up;
    }

    async down() {
        const down = await this.wsTurtle.exec('turtle.down()');
        const [didMove] = down;
        if (didMove) {
            this.turtle.fuelLevel--;
            const {x, y, z} = this.turtle.location;
            this.turtle.location = {x, y: y - 1, z};
            this.emit('update', 'tlocation', {
                id: this.turtle.id,
                location: this.turtle.location,
                fuelLevel: this.turtle.fuelLevel,
            });
            turtlesDB.addTurtle(this.turtle);
            worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
            this.emit('update', 'wdelete', {
                x: this.turtle.location.x,
                y: this.turtle.location.y,
                z: this.turtle.location.z,
            });
        }
        return down;
    }

    async turnLeft() {
        const turnLeft = await this.wsTurtle.exec('turtle.turnLeft()');
        const [didTurn] = turnLeft;
        if (didTurn) {
            this.turtle.direction = ((this.turtle.direction + 2) % 4) + 1;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    direction: this.turtle.direction,
                },
            });
        }
        return turnLeft;
    }

    async turnRight() {
        const turnRight = await this.wsTurtle.exec('turtle.turnRight()');
        const [didTurn] = turnRight;
        if (didTurn) {
            this.turtle.direction = (this.turtle.direction % 4) + 1;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    direction: this.turtle.direction,
                },
            });
        }
        return turnRight;
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
        const dig = await this.wsTurtle.exec('turtle.dig()');
        const [didDig] = dig;
        if (didDig) {
            for (let i = 1; i < 17; i++) {
                const [item] = await this.getItemDetail(i);
                this.turtle.inventory[i] = item;
            }
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return dig;
    }

    async digUp() {
        const digUp = await this.wsTurtle.exec('turtle.digUp()');
        const [didDig] = digUp;
        if (didDig) {
            for (let i = 1; i < 17; i++) {
                const [item] = await this.getItemDetail(i);
                this.turtle.inventory[i] = item;
            }
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return digUp;
    }

    async digDown() {
        const digDown = await this.wsTurtle.exec('turtle.digDown()');
        const [didDig] = digDown;
        if (didDig) {
            for (let i = 1; i < 17; i++) {
                const [item] = await this.getItemDetail(i);
                this.turtle.inventory[i] = item;
            }
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return digDown;
    }

    async place() {
        const place = await this.wsTurtle.exec('turtle.place()');
        const [didPlace] = place;
        if (didPlace) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return place;
    }

    async placeUp() {
        const placeUp = await this.wsTurtle.exec('turtle.placeUp()');
        const [didPlace] = placeUp;
        if (didPlace) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return placeUp;
    }

    async getItemDetail(slot = this.turtle.selectedSlot, detailed = true) {
        const itemDetail = await this.wsTurtle.exec(`turtle.getItemDetail(${slot}, ${detailed})`);
        if (itemDetail.length > 0) {
            return itemDetail;
        }

        return [];
    }

    async placeDown() {
        const placeDown = await this.wsTurtle.exec('turtle.placeDown()');
        const [didPlace] = placeDown;
        if (didPlace) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return placeDown;
    }

    async drop() {
        const drop = await this.wsTurtle.exec('turtle.drop()');
        const [didDrop] = drop;
        if (didDrop) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }
        return drop;
    }

    async dropUp() {
        const dropUp = await this.wsTurtle.exec('turtle.dropUp()');
        const [didDrop] = dropUp;
        if (didDrop) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }
        return dropUp;
    }

    async dropDown() {
        const dropDown = await this.wsTurtle.exec('turtle.dropDown()');
        const [didDrop] = dropDown;
        if (didDrop) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }
        return dropDown;
    }

    async select(slot = 1) {
        const select = await this.wsTurtle.exec(`turtle.select(${slot})`);
        const [didSelect] = select;
        if (didSelect) {
            this.turtle.selectedSlot = slot;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    selectedSlot: slot,
                },
            });
        }
        return select;
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
        const suck = await this.wsTurtle.exec(`turtle.suck(${count})`);
        const [didSuckItems] = suck;
        if (!didSuckItems) {
            for (let i = 1; i < 17; i++) {
                const [item] = await this.getItemDetail(i);
                this.turtle.inventory[i] = item;
            }
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }
        return suck;
    }

    async suckUp(count) {
        const suckUp = await this.wsTurtle.exec(`turtle.suckUp(${count})`);
        const [didSuckItems] = suckUp;
        if (!didSuckItems) {
            for (let i = 1; i < 17; i++) {
                const [item] = await this.getItemDetail(i);
                this.turtle.inventory[i] = item;
            }
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }
        return suckUp;
    }

    async suckDown(count) {
        const suckDown = await this.wsTurtle.exec(`turtle.suckDown(${count})`);
        const [didSuckItems] = suckDown;
        if (!didSuckItems) {
            for (let i = 1; i < 17; i++) {
                const [item] = await this.getItemDetail(i);
                this.turtle.inventory[i] = item;
            }
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }
        return suckDown;
    }

    async getFuelLevel() {
        const [updatedFuelLevel] = await this.wsTurtle.exec('turtle.getFuelLevel()');
        return updatedFuelLevel;
    }

    async refuel() {
        const refuel = await this.wsTurtle.exec('turtle.refuel()');
        const [didRefuel] = refuel;
        if (didRefuel) {
            const updatedFuelLevel = await this.getFuelLevel();
            this.turtle.fuelLevel = updatedFuelLevel;
            const [item] = await this.getItemDetail();
            this.turtle.inventory[this.turtle.selectedSlot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    fuelLevel: updatedFuelLevel,
                    inventory: this.turtle.inventory,
                },
            });
        }
        return refuel;
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
        const transfer = count
            ? await this.wsTurtle.exec(`transferTo(${slot}, ${count})`)
            : await this.wsTurtle.exec(`transferTo(${slot})`);
        const [didTransfer] = transfer;
        if (didTransfer) {
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return transfer;
    }

    async getSelectedSlot() {
        const [selectedSlot] = await this.wsTurtle.exec('turtle.getSelectedSlot()');
        this.turtle.selectedSlot = selectedSlot;
        turtlesDB.addTurtle(this.turtle);
        return selectedSlot;
    }

    async getFuelLimit() {
        return await this.wsTurtle.exec('turtle.getFuelLimit()');
    }

    async equipLeft() {
        const equipLeft = await this.wsTurtle.exec('turtle.equipLeft()');
        const [didEquip] = equipLeft;
        if (didEquip) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return equipLeft;
    }

    async equipRight() {
        const equipRight = await this.wsTurtle.exec('turtle.equipRight()');
        const [didEquip] = equipRight;
        if (didEquip) {
            const slot = this.turtle.selectedSlot;
            const [item] = await this.getItemDetail(slot);
            this.turtle.inventory[slot] = item;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                },
            });
        }

        return equipRight;
    }

    /**
     * Get information about the block in front of the turtle
     */
    async inspect() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspect()');
        const {x, y, z} = this.turtle.location;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
        if (!didInspect) {
            worldDB.deleteBlock(x + xChange, y, z + zChange);
            this.emit('update', 'wdelete', {x: x + xChange, y, z: z + zChange});
            return undefined;
        }

        worldDB.updateBlock(x + xChange, y, z + zChange, block);
        this.emit('update', 'wupdate', {x: x + xChange, y, z: z + zChange, block});
        return block;
    }

    /**
     * Get information about the block above the turtle
     */
    async inspectUp() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspectUp()');
        const {x, y, z} = this.turtle.location;
        if (!didInspect) {
            worldDB.deleteBlock(x, y + 1, z);
            this.emit('update', 'wdelete', {x, y: y + 1, z});
            return undefined;
        }

        worldDB.updateBlock(x, y + 1, z, block);
        this.emit('update', 'wupdate', {x, y: y + 1, z, block});
        return block;
    }

    /**
     * Get information about the block below the turtle
     */
    async inspectDown() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspectDown()');
        const {x, y, z} = this.turtle.location;
        if (!didInspect) {
            worldDB.deleteBlock(x, y - 1, z);
            this.emit('update', 'wdelete', {x, y: y - 1, z});
            return undefined;
        }

        worldDB.updateBlock(x, y - 1, z, block);
        this.emit('update', 'wupdate', {x, y: y - 1, z, block});
        return block;
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
            const [item] = await this.getItemDetail(i);
            if (item !== undefined) {
                if (item.name === name) {
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
                `local list = peripheral.wrap('front').list()\nlocal result = {}\nfor k, v in pairs(list) do result[tostring(k)] = list[k]end\nreturn result`
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
                const [didDigDown, digDownMessage] = await this.digDown();
                if (!didDigDown && digDownMessage !== 'Nothing to dig here') {
                    this.turtle.state.error = digDownMessage;
                    turtlesDB.addTurtle(this.turtle);
                    this.emit('update', 'tupdate', {
                        id: this.turtle.id,
                        data: {
                            state: this.turtle.state,
                        },
                    });
                    return;
                }
                const [didSuckDown, suckDownMessage] = await this.suckDown();
                if (!didSuckDown && suckDownMessage !== 'No items to take') {
                    this.turtle.state.error = suckDownMessage;
                    turtlesDB.addTurtle(this.turtle);
                    this.emit('update', 'tupdate', {
                        id: this.turtle.id,
                        data: {
                            state: this.turtle.state,
                        },
                    });
                    return;
                }
                const [didMoveDown, moveDownMessage] = await this.down();
                if (!didMoveDown) {
                    this.turtle.state.error = moveDownMessage;
                    turtlesDB.addTurtle(this.turtle);
                    this.emit('update', 'tupdate', {
                        id: this.turtle.id,
                        data: {
                            state: this.turtle.state,
                        },
                    });
                    return;
                }
            } else if (diffInYLevels > 0) {
                const [didDigUp, digUpMessage] = await this.digUp();
                if (!didDigUp && digUpMessage !== 'Nothing to dig here') {
                    this.turtle.state.error = digUpMessage;
                    turtlesDB.addTurtle(this.turtle);
                    this.emit('update', 'tupdate', {
                        id: this.turtle.id,
                        data: {
                            state: this.turtle.state,
                        },
                    });
                    return;
                }
                const [didSuckUp, suckUpMessage] = await this.suckUp();
                if (!didSuckUp && suckUpMessage !== 'No items to take') {
                    this.turtle.state.error = suckUpMessage;
                    turtlesDB.addTurtle(this.turtle);
                    this.emit('update', 'tupdate', {
                        id: this.turtle.id,
                        data: {
                            state: this.turtle.state,
                        },
                    });
                    return;
                }
                const [didMoveUp, moveUpMessage] = await this.up();
                if (!didMoveUp) {
                    this.turtle.state.error = moveUpMessage;
                    turtlesDB.addTurtle(this.turtle);
                    this.emit('update', 'tupdate', {
                        id: this.turtle.id,
                        data: {
                            state: this.turtle.state,
                        },
                    });
                    return;
                }
            }
        } else {
            this.turtle.state = undefined;
            turtlesDB.addTurtle(this.turtle);
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
                await this.turnToDirection({North: 2, East: 3, South: 4, West: 1}[mineTarget]);
                await this.dig();
                await this.suck();
                break;
            default:
                throw new Error('Invalid mine target');
        }

        this.turtle.state = undefined;
        turtlesDB.addTurtle(this.turtle);
    }

    async mine() {
        const {mineType, mineTarget} = this.turtle.state;
        if (mineType === 'direction') {
            return await this.mineInDirection(mineTarget);
        }

        const {x, y, z} = this.turtle.location;
        const [item] = await this.getItemDetail(16);
        if (item !== undefined) {
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
            const mineArea = areasDB.getArea(mineTarget);
            if (mineArea === undefined) {
                throw new Error('Given mining area does not exist');
            }

            const mineTargetArea = mineArea.area[currentIndex];
            await this.moveToAndMineObstacles(mineTargetArea.x, mineTargetArea.y, mineTargetArea.z, mineArea.area);

            const newIndex = currentIndex + 1;
            if (newIndex < mineArea.area.length) {
                this.turtle.state.index = newIndex;
                turtlesDB.addTurtle(this.turtle);
            } else {
                this.turtle.state = undefined;
                turtlesDB.addTurtle(this.turtle);
            }
        } else {
            throw new Error('Invalid mine type');
        }
    }

    async moveAndRefuel() {
        // Turtle has enough fuel
        if (this.turtle.fuelLevel > 0.8 * this.turtle.fuelLimit) {
            this.turtle.state = undefined;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        // Attempt to refuel with whatever is in the inventory
        const currentFuelLevel = this.turtle.fuelLevel;
        const currentlySelectedSlot = await this.getSelectedSlot();
        for (let i = 1; i < 17; i++) {
            await this.select(i);
            await this.refuel();
        }

        await this.select(currentlySelectedSlot);

        // TODO: Attempt to locate a fuel station if possible

        // Refuel successful!
        if (this.turtle.fuelLevel > this.turtle.fuelLimit * 0.1) {
            this.turtle.state = undefined;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        // Failed to refuel, request help
        this.turtle.state.error = 'Out of fuel';
        turtlesDB.addTurtle(this.turtle);
        this.emit('update', 'tupdate', {
            id: this.turtle.id,
            data: {
                state: this.turtle.state,
            },
        });
    }

    async farmBlock(seedTypeName) {
        const initialItemCount = Object.values(this.turtle.inventory).reduce(
            (acc, curr) => acc + (curr?.count || 0),
            0
        );
        const [didDigDown] = await this.digDown();
        if (didDigDown) {
            const currentItemCount = Object.values(this.turtle.inventory).reduce(
                (acc, curr) => acc + (curr?.count || 0),
                0
            );
            if (currentItemCount === initialItemCount) {
                this.turtle.state.error = 'Inventory is full';
                turtlesDB.addTurtle(this.turtle);
                this.emit('update', 'tupdate', {
                    id: this.turtle.id,
                    data: {
                        state: this.turtle.state,
                    },
                });
                return;
            }

            const didSelectSeed = await this.selectItemOfType(seedTypeName);
            if (didSelectSeed) {
                await this.placeDown();
            }
        }
    }

    async selectAnySeedInInventory() {
        for (let i = 1; i < 17; i++) {
            const item = this.turtle.inventory?.[i];
            if (item?.name && farmingSeedNames.includes(item.name)) {
                // Ensure that the item is in the turtle's in-game inventory
                const [itemDetail] = await this.getItemDetail(i);
                if (itemDetail?.name === item.name) {
                    await this.select(i);
                    return true;
                }
            }
        }
    }

    async farm(moveContinously = false) {
        const {areaId, currentAreaFarmIndex} = this.turtle.state;
        const farmArea = await areasDB.getArea(areaId);
        if (farmArea.area.length > 4 && this.turtle.state.noopTiles >= farmArea.area.length) {
            const didSelect = await this.selectAnySeedInInventory();
            if (!didSelect) {
                this.turtle.state.error = 'No seeds in inventory';
                turtlesDB.addTurtle(this.turtle);
                this.emit('update', 'tupdate', {
                    id: this.turtle.id,
                    data: {
                        state: this.turtle.state,
                    },
                });
                return;
            }

            this.turtle.state.error = 'Nothing to farm in area';
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        await this.moveTo(
            farmArea.area[currentAreaFarmIndex].x,
            farmArea.area[currentAreaFarmIndex].y + 1,
            farmArea.area[currentAreaFarmIndex].z
        );
        const block = await this.inspectDown();

        // Sow if possible
        if (block === undefined) {
            await this.digDown();

            const didSelect = await this.selectAnySeedInInventory();
            if (didSelect) {
                const [didPlace] = await this.placeDown();
                if (didPlace) {
                    this.turtle.state.noopTiles = 0;
                } else {
                    this.turtle.state.noopTiles++;
                }
            } else {
                this.turtle.state.noopTiles++;
            }

            this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
            turtlesDB.addTurtle(this.turtle);
        } else {
            const farmingBlockToSeed = farmingBlockToSeedMapObject[block.name];
            let shouldMoveForward = !farmingBlockToSeed;
            if (farmingBlockToSeed) {
                if (block.state.age === farmingBlockToSeed.maxAge) {
                    await this.farmBlock(farmingBlockToSeed.seed);
                    shouldMoveForward = true;
                }
                this.turtle.state.noopTiles = 0;
            } else {
                this.turtle.state.noopTiles++;
            }

            if (moveContinously || shouldMoveForward) {
                this.turtle.state.currentAreaFarmIndex = (currentAreaFarmIndex + 1) % farmArea.area.length;
            }
            turtlesDB.addTurtle(this.turtle);
        }
    }

    async dropInventory() {
        await this.drop();
        this.turtle.state = this.turtle.state.nextState;
        turtlesDB.addTurtle(this.turtle);
        this.emit('update', 'tupdate', {
            id: this.turtle.id,
            data: {
                state: this.turtle.state,
            },
        });
    }

    async craftInventory() {
        const [hasWorkbench] = await this.wsTurtle.exec('peripheral.find("workbench") ~= nil');
        if (!hasWorkbench) {
            this.turtle.state.error = 'No workbench to craft with';
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        const [didCraft, craftMessage] = await this.wsTurtle.exec('peripheral.find("workbench").craft()');
        if (didCraft) {
            for (let i = 1; i < 17; i++) {
                const [item] = await this.getItemDetail(i);
                this.turtle.inventory[i] = item;
            }
            this.turtle.state = this.turtle.state.nextState;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    inventory: this.turtle.inventory,
                    state: this.turtle.state,
                },
            });
        } else {
            this.turtle.state.error = craftMessage;
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
        }
    }

    async refreshInventoryState() {
        for (let i = 1; i < 17; i++) {
            const [item] = await this.getItemDetail(i);
            this.turtle.inventory[i] = item;
        }
        this.turtle.state = this.turtle.state.nextState;
        turtlesDB.addTurtle(this.turtle);
        this.emit('update', 'tupdate', {
            id: this.turtle.id,
            data: {
                inventory: this.turtle.inventory,
                state: this.turtle.state,
            },
        });
    }

    async recalibrate() {
        const [hasModem] = await this.wsTurtle.exec('peripheral.find("modem") ~= nil');
        if (!hasModem) {
            this.turtle.state.error = 'No wireless modem attached';
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        let movedBackwards = false;
        const [didMoveForwards] = await this.wsTurtle.exec('turtle.forward()');
        if (!didMoveForwards) {
            movedBackwards = true;
            const [didMoveBackwards] = await this.wsTurtle.exec('turtle.back()');
            if (!didMoveBackwards) {
                movedBackwards = false;
                const [didTurnLeft] = await this.wsTurtle.exec('turtle.turnLeft()');
                if (!didTurnLeft) {
                    const [didTurnRight] = await this.wsTurtle.exec('turtle.turnRight()');
                    if (!didTurnRight) {
                        this.turtle.state.error = 'Cannot move or turn around';
                        turtlesDB.addTurtle(this.turtle);
                        this.emit('update', 'tupdate', {
                            id: this.turtle.id,
                            data: {
                                state: this.turtle.state,
                            },
                        });
                        return;
                    }
                }
                const [didMoveForwards] = await this.wsTurtle.exec('turtle.forward()');
                if (!didMoveForwards) {
                    movedBackwards = true;
                    const [didMoveBackwards] = await this.wsTurtle.exec('turtle.back()');
                    if (!didMoveBackwards) {
                        this.turtle.state.error = 'Stuck';
                        turtlesDB.addTurtle(this.turtle);
                        this.emit('update', 'tupdate', {
                            id: this.turtle.id,
                            data: {
                                state: this.turtle.state,
                            },
                        });
                        return;
                    }
                }
            }
        }

        const location = await this.wsTurtle.exec('gps.locate()');
        const x = location?.[0];
        const y = location?.[1];
        const z = location?.[2];
        if (movedBackwards) {
            await this.wsTurtle.exec('turtle.forward()');
        } else {
            await this.wsTurtle.exec('turtle.back()');
        }

        if (x === undefined || y === undefined || z === undefined) {
            this.turtle.state.error = 'Could not determine position';
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        let diff = [this.turtle.location.x - x, this.turtle.location.y - y, this.turtle.location.z - z];
        if (!movedBackwards) {
            diff = [-diff[0], -diff[1], -diff[2]];
        }

        const direction = diff[0] + Math.abs(diff[0]) * 2 + diff[2] + Math.abs(diff[2]) * 3;
        this.turtle.direction = direction;
        this.turtle.state = undefined;
        turtlesDB.addTurtle(this.turtle);
    }

    async locate() {
        const [hasModem] = await this.wsTurtle.exec('peripheral.find("modem") ~= nil');
        if (!hasModem) {
            this.turtle.state.error = 'No wireless modem attached';
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        const location = await this.wsTurtle.exec('gps.locate()');
        const x = location?.[0];
        const y = location?.[1];
        const z = location?.[2];
        if (x === undefined || y === undefined || z === undefined) {
            this.turtle.state.error = 'Could not determine position';
            turtlesDB.addTurtle(this.turtle);
            this.emit('update', 'tupdate', {
                id: this.turtle.id,
                data: {
                    state: this.turtle.state,
                },
            });
            return;
        }

        this.turtle.state = undefined;
        this.turtle.location = {x, y, z};
        turtlesDB.addTurtle(this.turtle);
    }

    async *ai() {
        while (true) {
            if (this.turtle.state?.error) {
                yield;
                continue;
            }
            if (this.turtle.state?.id === undefined) {
                if (this.turtle.location === undefined) {
                    console.log('locating...');
                    this.turtle.state = {id: 5, name: 'locating'};
                    turtlesDB.addTurtle(this.turtle);
                } else if (
                    this.turtle.fuelLevel < this.turtle.fuelLimit * 0.1 ||
                    this.turtle.stepsSinceLastRecharge >=
                        this.turtle.fuelLimit - this.turtle.fuelLevel + this.turtle.fuelLimit * 0.1
                ) {
                    this.turtle.state = {id: 1, name: 'refueling'};
                    turtlesDB.addTurtle(this.turtle);
                } else if (!this.turtle.direction) {
                    this.turtle.state = {id: 6, name: 'recalibrating'};
                    turtlesDB.addTurtle(this.turtle);
                }
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
                case 5:
                    await this.locate();
                    break;
                case 6:
                    await this.recalibrate();
                    break;
                case 7:
                    await this.refreshInventoryState();
                    break;
                case 8:
                    await this.craftInventory();
                    break;
                case 9:
                    await this.dropInventory();
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
            const [didMoveForward, forwardMessage] = await this.forward();
            if (didMoveForward) {
                hasNotMovedForward = false;
            } else if (attempts > 5) {
                throw forwardMessage;
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

                    const {x, y, z} = this.turtle.location;
                    if (py - y > 0) {
                        const [didMoveUp] = await this.up();
                        if (!didMoveUp) {
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
                        const [didMoveDown] = await this.down();
                        if (didMoveDown) {
                            return true;
                        }

                        const downLocation = `${x},${y - 1},${z}`;
                        if (mineableObstaclesMap[downLocation]) {
                            await this.digDown();
                            await this.suckDown();
                            const [didMoveDown] = await this.down();
                            if (!didMoveDown) {
                                return false;
                            }
                            return true;
                        } else {
                            obstaclesHash[downLocation] = true;
                            obstacles.push(new Coordinates(x, y - 1, z));
                            return false;
                        }
                    } else {
                        const heading = {x: px - x, y: py - y, z: pz - z};
                        const direction = heading.x + Math.abs(heading.x) * 2 + (heading.z + Math.abs(heading.z) * 3);
                        await this.turnToDirection(direction);

                        const [didMoveForwar] = await this.forward();
                        if (didMoveForwar) return true;

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
                },
                getInitialObstacles: async () => {
                    const allBlocks = worldDB.getAllBlocks();
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
                    const {x, y, z} = this.turtle.location;
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
            turtlesDB.updateState(this.turtle.id, undefined);
        }
    }

    async moveTo(targetX, targetY, targetZ) {
        return await this.moveToAndMineObstacles(targetX, targetY, targetZ, []);
    }
};
