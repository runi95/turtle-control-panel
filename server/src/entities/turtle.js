const ws = require('ws');
const {v4: uuid4} = require('uuid');
const globalEventEmitter = require('../globalEventEmitter');
const {removeTurtle, addTurtle} = require('../turtleController');
const nameList = require('../names.json');
const turtlesDB = require('../db/turtlesDB');
const worldDB = require('../db/worldDB');
const {getLocalCoordinatesForDirection} = require('../helpers/coordinates');
const turtleLogLevel = require('../logger/turtle');
const logger = require('../logger/server');

const connectedTurtlesMap = new Map();
class Turtle {
    // Database properties
    #id;
    #name;
    #isOnline;
    #fuelLevel;
    #fuelLimit;
    #selectedSlot;
    #inventory;
    #stepsSinceLastRecharge;
    #state;
    #location;
    #direction;

    // Private properties
    #ws;
    #lastPromise = new Promise((resolve) => resolve());

    constructor(
        id,
        name,
        isOnline,
        fuelLevel,
        fuelLimit,
        selectedSlot,
        inventory,
        stepsSinceLastRecharge,
        state,
        location,
        direction,
        ws
    ) {
        this.#id = id;
        this.#name = name;
        this.#isOnline = isOnline;
        this.#fuelLevel = fuelLevel;
        this.#fuelLimit = fuelLimit;
        this.#selectedSlot = selectedSlot;
        this.#inventory = inventory;
        this.#stepsSinceLastRecharge = stepsSinceLastRecharge;
        this.#state = state;
        this.#location = location;
        this.#direction = direction;

        this.#ws = ws;
        this.#ws.on('close', (code, message) => {
            logger.info(
                `${this.name ?? '<unnamed>'}[${
                    this.id ?? '<uninitialized turtle>'
                }] has disconnected with code ${code} and message ${message?.toString() || '<none>'}`
            );
            if (this.id) {
                connectedTurtlesMap.delete(this.id);
                globalEventEmitter.emit('tdisconnect', this.id);
            }
        });
        this.#ws.on('disconnect', (code, message) => {
            logger.info(
                `${this.name ?? '<unnamed>'}[${
                    this.id ?? '<uninitialized turtle>'
                }] has disconnected with code ${code} and message ${message?.toString() || '<none>'}`
            );
            removeTurtle(this);
            if (this.id) {
                connectedTurtlesMap.delete(this.id);
                this.isOnline = false;
                globalEventEmitter.emit('tdisconnect', {id: this.id});
            }
        });
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#name;
    }

    set name(name) {
        this.#name = name;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                name: this.name,
            },
        });
        turtlesDB.updateName(this.id, this.name);
    }

    get isOnline() {
        return this.#isOnline;
    }

    set isOnline(isOnline) {
        this.#isOnline = isOnline;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                isOnline: this.isOnline,
            },
        });
        turtlesDB.updateIsOnline(this.id, this.isOnline);
    }

    get fuelLevel() {
        return this.#fuelLevel;
    }

    set fuelLevel(fuelLevel) {
        this.#fuelLevel = fuelLevel;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                fuelLevel: this.fuelLevel,
            },
        });
        turtlesDB.updateFuelLevel(this.id, this.fuelLevel);
    }

    get fuelLimit() {
        return this.#fuelLimit;
    }

    get selectedSlot() {
        return this.#selectedSlot;
    }

    set selectedSlot(selectedSlot) {
        this.#selectedSlot = selectedSlot;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                selectedSlot: this.selectedSlot,
            },
        });
        turtlesDB.updateSelectedSlot(this.id, this.selectedSlot);
    }

    get inventory() {
        return this.#inventory;
    }

    set inventory(inventory) {
        this.#inventory = inventory;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                inventory: this.inventory,
            },
        });
        turtlesDB.updateInventory(this.id, this.inventory);
    }

    get stepsSinceLastRecharge() {
        return this.#stepsSinceLastRecharge;
    }

    set stepsSinceLastRecharge(stepsSinceLastRecharge) {
        this.#stepsSinceLastRecharge = stepsSinceLastRecharge;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                stepsSinceLastRecharge: this.stepsSinceLastRecharge,
            },
        });
        turtlesDB.updateStepsSinceLastRecharge(this.id, this.stepsSinceLastRecharge);
    }

    /**
     * Undefined: Standby
     */
    get state() {
        return this.#state;
    }

    set state(state) {
        this.#state = state;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                state: this.state,
            },
        });
        turtlesDB.updateState(this.id, this.state);
    }

    set error(message) {
        this.state = {
            ...this.state,
            error: message,
        };
    }

    get location() {
        return this.#location;
    }

    set location(location) {
        this.#location = location;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                location: this.location,
            },
        });
        turtlesDB.updateLocation(this.id, this.location);
    }

    /**
     * 1: WEST
     * 2: NORTH
     * 3: EAST
     * 4: SOUTH
     */
    get direction() {
        return this.#direction;
    }

    set direction(direction) {
        this.#direction = direction;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            data: {
                direction: this.direction,
            },
        });
        turtlesDB.updateDirection(this.id, this.direction);
    }

    /**
     * Moves the turtle forward by one block.
     *
     * This method asynchronously executes the 'turtle.forward()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the turtle successfully moved forward.
     *   - An optional string describing an error if the movement was unsuccessful.
     */
    async forward() {
        const forward = await this.#exec('turtle.forward()');
        if (!this.location || !this.direction) return forward;

        const [didMove] = forward;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRecharge++;
            const [xChange, zChange] = getLocalCoordinatesForDirection(this.direction);
            const {x, y, z} = this.location;
            this.#location = {x: x + xChange, y, z: z + zChange};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            turtlesDB.addTurtle(this.id, {
                fuelLevel: this.fuelLevel,
                stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                location: this.location,
            });
            worldDB.deleteBlock(this.location.x, this.location.y, this.location.z);
        }
        return forward;
    }

    /**
     * Move the turtle backwards one block.
     *
     * This method asynchronously executes the 'turtle.back()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the turtle successfully moved back.
     *   - An optional string describing an error if the movement was unsuccessful.
     */
    async back() {
        const back = await this.#exec('turtle.back()');
        if (!this.location || !this.direction) return back;

        const [didMove] = back;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRecharge++;
            const [xChange, zChange] = getLocalCoordinatesForDirection((((this.direction % 4) + 1) % 4) + 1);
            const {x, y, z} = this.location;
            this.#location = {x: x + xChange, y, z: z + zChange};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            turtlesDB.addTurtle(this.id, {
                fuelLevel: this.fuelLevel,
                stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                location: this.location,
            });
            worldDB.deleteBlock(this.location.x, this.location.y, this.location.z);
        }
        return back;
    }

    /**
     * Move the turtle up one block.
     *
     * This method asynchronously executes the 'turtle.up()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the turtle successfully moved up.
     *   - An optional string describing an error if the movement was unsuccessful.
     */
    async up() {
        const up = await this.#exec('turtle.up()');
        if (!this.location) return up;

        const [didMove] = up;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRecharge++;
            const {x, y, z} = this.location;
            this.#location = {x, y: y + 1, z};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            turtlesDB.addTurtle(this.id, {
                fuelLevel: this.fuelLevel,
                stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                location: this.location,
            });
            worldDB.deleteBlock(this.location.x, this.location.y, this.location.z);
        }
        return up;
    }

    /**
     * Move the turtle down one block.
     *
     * This method asynchronously executes the 'turtle.down()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the turtle successfully moved down.
     *   - An optional string describing an error if the movement was unsuccessful.
     */
    async down() {
        const down = await this.#exec('turtle.down()');
        if (!this.location) return down;

        const [didMove] = down;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRecharge++;
            const {x, y, z} = this.location;
            this.#location = {x, y: y - 1, z};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            turtlesDB.addTurtle(this.id, {
                fuelLevel: this.fuelLevel,
                stepsSinceLastRecharge: this.stepsSinceLastRecharge,
                location: this.location,
            });
            worldDB.deleteBlock(this.location.x, this.location.y, this.location.z);
        }
        return down;
    }

    /**
     * Rotate the turtle 90 degrees to the left.
     *
     * This method asynchronously executes the 'turtle.turnLeft()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the turtle successfully turned left.
     *   - An optional string describing an error if the rotation was unsuccessful.
     */
    async turnLeft() {
        const turnLeft = await this.#exec('turtle.turnLeft()');
        const [didTurn] = turnLeft;
        if (didTurn && this.direction) {
            this.direction = ((this.direction + 2) % 4) + 1;
        }
        return turnLeft;
    }

    /**
     * Rotate the turtle 90 degrees to the right.
     *
     * This method asynchronously executes the 'turtle.turnRight()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the turtle successfully turned right.
     *   - An optional string describing an error if the rotation was unsuccessful.
     */
    async turnRight() {
        const turnRight = await this.#exec('turtle.turnRight()');
        const [didTurn] = turnRight;
        if (didTurn && this.direction) {
            this.direction = (this.direction % 4) + 1;
        }
        return turnRight;
    }

    /**
     * Get detailed information about the items in the given slot.
     *
     * This method asynchronously executes the 'turtle.getItemDetail()' command and updates the turtle's inventory based on the result.
     *
     * @param {number} [slot=this.selectedSlot] - The inventory slot to query. Defaults to the currently selected slot.
     * @param {boolean} [detailed=true] - A boolean indicating whether to retrieve detailed information about the item. Defaults to true.
     *
     * @returns {Promise<object | null>} A Promise resolving to an object containing details about the item in the specified slot or undefined if the slot is empty.
     * The details object includes the following properties:
     *   - `enchantments` - An array of objects containing details about the enchantments (`level`, `name`, `displayName`) or undefined if item is unenchanted
     *   - `durability` - How much durability the item has left in % where 1.0 = 100%, 0.5 = 50% and 0.0 = 0%
     *   - `maxDamage` - How much potential damage the item can take or undefined if item cannot be damaged
     *   - `damage` - How much damage the item has taken or undefined if item cannot be damaged
     *   - `nbt` - Named Binary Tag
     *   - `name` - The name of the item
     *   - `tags` - Tags used by Minecraft for item sorting and grouping
     *   - `count` - The current item count
     *   - `maxCount` - The maximum possible count in one stack
     *   - `displayName` - The name of the item as displayed in-game
     */
    async getItemDetail(slot = this.selectedSlot, detailed = true) {
        const [itemDetail] = await this.#exec(`turtle.getItemDetail(${slot}, ${detailed}) or textutils.json_null`);
        this.inventory = {
            ...this.inventory,
            [slot]: itemDetail ?? undefined,
        };
        return itemDetail;
    }

    /**
     * Refreshes the turtle's inventory state by querying details for items in all slots.
     *
     * This method asynchronously executes the 'turtle.getItemDetail()' command for each slot and updates the turtle's inventory based on the results.
     *
     * @param {number} [from=this.selectedSlot] - The starting inventory slot to query. Defaults to the currently selected slot.
     * @param {boolean} [stopOnUndefined=false] - A boolean indicating whether to stop querying when an empty item slot is encountered. Defaults to false.
     *
     * @returns {Promise<void>} A Promise that resolves once the turtle's inventory state has been refreshed.
     */
    async refreshInventoryState(from = this.selectedSlot, stopOnUndefined = false) {
        const inventoryAsObject = {};
        for (let i = 1; i < 17; i++) {
            const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
            inventoryAsObject[i] = item ?? undefined;
        }

        this.inventory = inventoryAsObject;
    }

    /**
     * Attempt to break the block in front of the turtle.
     * This requires a turtle tool capable of breaking the block. Diamond pickaxes (mining turtles) can break any vanilla block, but other tools (such as axes) are more limited.
     *
     * This method asynchronously executes the 'turtle.dig()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the block was broken.
     *   - An optional string describing an the reason no block was broken.
     */
    async dig() {
        const selectedSlot = this.selectedSlot;
        const dig = await this.#exec('turtle.dig()');
        const [didDig] = dig;
        if (didDig) {
            const inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
            globalEventEmitter.emit('wdelete', {
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });
            worldDB.deleteBlock(this.location.x, this.location.y, this.location.z);
        }

        return dig;
    }

    /**
     * Attempt to break the block above the turtle.
     * This requires a turtle tool capable of breaking the block. Diamond pickaxes (mining turtles) can break any vanilla block, but other tools (such as axes) are more limited.
     *
     * This method asynchronously executes the 'turtle.digUp()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the block was broken.
     *   - An optional string describing an the reason no block was broken.
     */
    async digUp() {
        const selectedSlot = this.selectedSlot;
        const digUp = await this.#exec('turtle.digUp()');
        const [didDig] = digUp;
        if (didDig) {
            const inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
            globalEventEmitter.emit('wdelete', {
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });
            worldDB.deleteBlock(this.location.x, this.location.y, this.location.z);
        }

        return digUp;
    }

    /**
     * Attempt to break the block below the turtle.
     * This requires a turtle tool capable of breaking the block. Diamond pickaxes (mining turtles) can break any vanilla block, but other tools (such as axes) are more limited.
     *
     * This method asynchronously executes the 'turtle.digDown()' command and updates the turtle's state based on the result.
     *
     * @returns {Promise<[boolean, string | undefined]>} A Promise resolving to a tuple:
     *   - A boolean indicating whether the block was broken.
     *   - An optional string describing an the reason no block was broken.
     */
    async digDown() {
        const selectedSlot = this.selectedSlot;
        const digDown = await this.#exec('turtle.digDown()');
        const [didDig] = digDown;
        if (didDig) {
            const inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
            globalEventEmitter.emit('wdelete', {
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });
            worldDB.deleteBlock(this.location.x, this.location.y, this.location.z);
        }

        return digDown;
    }

    /**
     * Get information about the block in front of the turtle.
     *
     * This method asynchronously executes the 'turtle.inspect()' command and interacts with the world database based on the result.
     *
     * @returns {Promise<object | undefined>} A Promise resolving to an object representing the inspected block or undefined if inspection fails.
     * The details object includes the following properties:
     *   - `state` - An object containing details about the block state if there is any
     *   - `name` - The name of the block
     *   - `tags` - Tags used by Minecraft for block sorting and grouping
     */
    async inspect() {
        const {x, y, z} = this.location;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.direction);
        const [didInspect, block] = await this.#exec('turtle.inspect()');
        if (!didInspect) {
            worldDB.getBlock(x + xChange, y, z + zChange).then((dbBlock) => {
                if (!dbBlock) return;
                globalEventEmitter.emit('wdelete', {
                    x: this.location.x + xChange,
                    y: this.location.y,
                    z: this.location.z + zChange,
                });
                worldDB.deleteBlock(this.location.x + xChange, this.location.y, this.location.z + zChange);
            });
            return undefined;
        }

        worldDB.getBlock(x + xChange, y, z + zChange).then((dbBlock) => {
            if (!dbBlock || dbBlock?.name !== block?.name) {
                worldDB.updateBlock(x + xChange, y, z + zChange, block);
                globalEventEmitter.emit('wupdate', {x: x + xChange, y, z: z + zChange, block});
            }
        });
        return block;
    }

    /**
     * Get information about the block above the turtle.
     *
     * This method asynchronously executes the 'turtle.inspectUp()' command and interacts with the world database based on the result.
     *
     * @returns {Promise<object | undefined>} A Promise resolving to an object representing the inspected block or undefined if inspection fails.
     * The details object includes the following properties:
     *   - `state` - An object containing details about the block state if there is any
     *   - `name` - The name of the block
     *   - `tags` - Tags used by Minecraft for block sorting and grouping
     */
    async inspectUp() {
        const {x, y, z} = this.location;
        const [didInspect, block] = await this.#exec('turtle.inspectUp()');
        if (!didInspect) {
            worldDB.getBlock(x, y + 1, z).then((dbBlock) => {
                if (!dbBlock) return;
                globalEventEmitter.emit('wdelete', {
                    x: this.location.x,
                    y: this.location.y + 1,
                    z: this.location.z,
                });
                worldDB.deleteBlock(this.location.x, this.location.y + 1, this.location.z);
            });
            return undefined;
        }

        worldDB.getBlock(x, y + 1, z).then((dbBlock) => {
            if (!dbBlock || dbBlock?.name !== block?.name) {
                worldDB.updateBlock(x, y + 1, z, block);
                globalEventEmitter.emit('wupdate', {x, y: y + 1, z, block});
            }
        });
        return block;
    }

    /**
     * Get information about the block below the turtle.
     *
     * This method asynchronously executes the 'turtle.inspectDown()' command and interacts with the world database based on the result.
     *
     * @returns {Promise<object | undefined>} A Promise resolving to an object representing the inspected block or undefined if inspection fails.
     * The details object includes the following properties:
     *   - `state` - An object containing details about the block state if there is any
     *   - `name` - The name of the block
     *   - `tags` - Tags used by Minecraft for block sorting and grouping
     */
    async inspectDown() {
        const {x, y, z} = this.location;
        const [didInspect, block] = await this.#exec('turtle.inspectDown()');
        if (!didInspect) {
            worldDB.getBlock(x, y - 1, z).then((dbBlock) => {
                if (!dbBlock) return;
                globalEventEmitter.emit('wdelete', {
                    x: this.location.x,
                    y: this.location.y - 1,
                    z: this.location.z,
                });
                worldDB.deleteBlock(this.location.x, this.location.y + 1, this.location.z);
            });
            return undefined;
        }

        worldDB.getBlock(x, y - 1, z).then((dbBlock) => {
            if (!dbBlock || dbBlock?.name !== block?.name) {
                worldDB.updateBlock(x, y - 1, z, block);
                globalEventEmitter.emit('wupdate', {x, y: y - 1, z, block});
            }
        });
        return block;
    }

    async place() {
        const selectedSlot = this.selectedSlot;
        const place = await this.#exec('turtle.place()');
        const [didPlace] = place;
        if (didPlace) {
            const item = await this.getItemDetail(selectedSlot);
            this.inventory[selectedSlot] = item ?? undefined;
            await this.inspect();
        }

        return place;
    }

    async placeUp() {
        const selectedSlot = this.selectedSlot;
        const placeUp = await this.#exec('turtle.placeUp()');
        const [didPlace] = placeUp;
        if (didPlace) {
            const item = await this.getItemDetail(selectedSlot);
            this.inventory[selectedSlot] = item ?? undefined;
            await this.inspectUp();
        }

        return placeUp;
    }

    async placeDown() {
        const selectedSlot = this.selectedSlot;
        const placeDown = await this.#exec('turtle.placeDown()');
        const [didPlace] = placeDown;
        if (didPlace) {
            const item = await this.getItemDetail(selectedSlot);
            this.inventory[selectedSlot] = item ?? undefined;
            await this.inspectDown();
        }

        return placeDown;
    }

    async drop() {
        const slot = this.selectedSlot;
        const drop = await this.#exec('turtle.drop()');
        const [didDrop] = drop;
        if (didDrop) {
            await this.getItemDetail(slot);
        }
        return drop;
    }

    async dropUp() {
        const slot = this.selectedSlot;
        const dropUp = await this.#exec('turtle.dropUp()');
        const [didDrop] = dropUp;
        if (didDrop) {
            await this.getItemDetail(slot);
        }
        return dropUp;
    }

    async dropDown() {
        const slot = this.selectedSlot;
        const dropDown = await this.#exec('turtle.dropDown()');
        const [didDrop] = dropDown;
        if (didDrop) {
            await this.getItemDetail(slot);
        }
        return dropDown;
    }

    async select(slot = 1) {
        const select = await this.#exec(`turtle.select(${slot})`);
        const [didSelect] = select;
        if (didSelect) {
            this.selectedSlot = slot;
        }
        return select;
    }

    async suck(count) {
        const selectedSlot = this.selectedSlot;
        const suck = await this.#exec(`turtle.suck(${count ?? ''})`);
        const [didSuckItems] = suck;
        if (!didSuckItems) {
            const inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
        }
        return suck;
    }

    async suckUp(count) {
        const selectedSlot = this.selectedSlot;
        const suckUp = await this.#exec(`turtle.suckUp(${count ?? ''})`);
        const [didSuckItems] = suckUp;
        if (!didSuckItems) {
            const inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
        }
        return suckUp;
    }

    async suckDown(count) {
        const selectedSlot = this.selectedSlot;
        const suckDown = await this.#exec(`turtle.suckDown(${count ?? ''})`);
        const [didSuckItems] = suckDown;
        if (!didSuckItems) {
            const inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
        }
        return suckDown;
    }

    async refuel() {
        const selectedSlot = this.selectedSlot;
        const refuel = await this.#exec('turtle.refuel()');
        const [didRefuel] = refuel;
        if (didRefuel) {
            const [updatedFuelLevel] = await this.#exec('turtle.getFuelLevel()');
            this.#fuelLevel = updatedFuelLevel;
            const [item] = await this.#exec(`turtle.getItemDetail(${selectedSlot}, true) or textutils.json_null`);
            this.#inventory[selectedSlot] = item ?? undefined;

            turtlesDB.addTurtle({
                id: this.id,
                fuelLevel: this.fuelLevel,
                inventory: this.inventory,
            });
            globalEventEmitter.emit('tupdate', {
                id: this.id,
                data: {
                    fuelLevel: this.fuelLevel,
                    inventory: this.inventory,
                },
            });
        }
        return refuel;
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
        const selectedSlot = this.selectedSlot;
        if (slot === selectedSlot) return [true];
        const transfer = count
            ? await this.#exec(`transferTo(${slot}, ${count})`)
            : await this.#exec(`transferTo(${slot})`);
        const [didTransfer] = transfer;
        if (didTransfer) {
            const [itemDetail] = await this.#exec(`turtle.getItemDetail(${slot}, true) or textutils.json_null`);
            const [selectedItemDetail] = await this.#exec(
                `turtle.getItemDetail(${selectedSlot}, true) or textutils.json_null`
            );
            this.inventory = {
                ...this.inventory,
                [slot]: itemDetail ?? undefined,
                [selectedSlot]: selectedItemDetail ?? undefined,
            };
        }

        return transfer;
    }

    async equipLeft() {
        const selectedSlot = this.selectedSlot;
        const equipLeft = await this.#exec('turtle.equipLeft()');
        const [didEquip] = equipLeft;
        if (didEquip) {
            await this.getItemDetail(selectedSlot);
        }

        return equipLeft;
    }

    async equipLeft() {
        const selectedSlot = this.selectedSlot;
        const equipRight = await this.#exec('turtle.equipRight()');
        const [didEquip] = equipRight;
        if (didEquip) {
            await this.getItemDetail(selectedSlot);
        }

        return equipRight;
    }

    async getSelectedSlot() {
        const [selectedSlot] = Number(await this.#exec('turtle.getSelectedSlot()'));
        this.selectedSlot = selectedSlot;
        return [selectedSlot];
    }

    async getFuelLimit() {
        const [fuelLimit] = await this.#exec('turtle.getFuelLimit()');
        this.fuelLimit = fuelLimit;
        return [fuelLimit];
    }

    async craft() {
        const [hasWorkbench] = await this.hasPeripheralWithName('workbench');
        if (!hasWorkbench) {
            this.error = 'No workbench to craft with';
            return;
        }

        const [didCraft, craftMessage] = await this.#exec('peripheral.find("workbench").craft()');
        if (didCraft) {
            const inventoryAsObject = {};
            for (let i = 1; i < 17; i++) {
                const [item] = await this.#exec(`turtle.getItemDetail(${i}, true) or textutils.json_null`);
                inventoryAsObject[i] = item ?? undefined;
            }
            this.#inventory = inventoryAsObject;
            globalEventEmitter.emit('tupdate', {
                id: this.id,
                data: {
                    inventory: this.inventory,
                },
            });
        } else {
            this.error = craftMessage;
        }
    }

    async hasPeripheralWithName(peripheralName) {
        return await this.#exec(`peripheral.find("${peripheralName}") ~= nil`);
    }

    async gpsLocate() {
        return await this.#exec('gps.locate()');
    }

    async detect() {
        return await this.#exec('turtle.detect()');
    }

    async detectUp() {
        return await this.#exec('turtle.detectUp()');
    }

    async detectDown() {
        return await this.#exec('turtle.detectDown()');
    }

    /**
     * Detects whether or not the block in front of
     * the turtle is the same as the one in the currently selected slot
     */
    async compare() {
        return await this.#exec('turtle.compare()');
    }

    /**
     * Detects whether or not the block above the turtle
     * is the same as the one in the currently selected slot
     */
    async compareUp() {
        return await this.#exec('turtle.compareUp()');
    }

    /**
     * Detects whether or not the block below the turtle
     * is the same as the one in the currently selected slot
     */
    async compareDown() {
        return await this.#exec('turtle.compareDown()');
    }

    /**
     * Detects whether or not the item in the specified slot is the
     * same as the item in the currently selected slot
     *
     * @param {number} slot
     */
    async compareTo(slot) {
        return await this.#exec(`turtle.compareTo(${slot})`);
    }

    async attack() {
        return await this.#exec(`turtle.attack()`);
    }

    async attackUp() {
        return await this.#exec(`turtle.attackUp()`);
    }

    async attackDown() {
        return await this.#exec(`turtle.attackDown()`);
    }

    async getItemCount(slot = this.selectedSlot) {
        return await this.#exec(`turtle.getItemCount(${slot})`);
    }

    async getItemSpace(slot = this.selectedSlot) {
        return await this.#exec(`turtle.getItemSpace(${slot})`);
    }

    async getFuelLevel() {
        const [updatedFuelLevel] = await this.#exec('turtle.getFuelLevel()');
        this.fuelLevel = updatedFuelLevel;
        return updatedFuelLevel;
    }

    async rename(name) {
        await this.#exec(`os.setComputerLabel("${name}")`);
        this.name = name;
    }

    #exec(f) {
        return this.#execRaw(`return ${f}`);
    }

    #execRaw(f) {
        const uuid = uuid4();
        this.#lastPromise = new Promise((resolve, reject) =>
            this.#lastPromise.finally(() => {
                const listener = (msg) => {
                    const obj = JSON.parse(msg);
                    if (obj.uuid !== uuid) {
                        logger.error(`${obj.uuid} does not match ${uuid}!`);
                        return;
                    }

                    if (obj.type === 'ERROR') {
                        logger.error(obj.message);
                        return reject(obj.message);
                    }

                    if (obj.type !== 'EVAL') {
                        return reject(`Unknown response type "${obj.type}" from turtle with message "${obj.message}"`);
                    }

                    this.#ws.off('message', listener);
                    return resolve(obj.message);
                };
                this.#ws.on('message', listener);
                this.#ws.send(JSON.stringify({type: 'EVAL', uuid, function: f}));
            })
        );

        return this.#lastPromise;
    }
}

const initializeHandshake = (ws) => {
    logger.info('Initiating handshake...');
    const uuid = uuid4();
    const listener = async (msg) => {
        const obj = JSON.parse(msg);
        if (obj.uuid !== uuid) {
            logger.error(`${obj.uuid} does not match ${uuid}!`);
            return;
        }

        if (obj.type === 'ERROR') {
            logger.error(obj.message);
            return;
        }

        const {message} = obj;
        const {id, label, fuel, selectedSlot, inventory} = message;
        const inventoryAsObject = Array.isArray(inventory) ? {} : inventory;
        const {level: fuelLevel, limit: fuelLimit} = fuel;
        let name = label;
        if (!name) {
            name = nameList[Math.floor(Math.random() * (nameList.length - 1))];
            ws.send(JSON.stringify({type: 'RENAME', message: name}));
        }

        const {stepsSinceLastRecharge, state, location, direction} = (await turtlesDB.getTurtle(id)) ?? {};
        logger.info(`${name || '<unnamed>'} [${id}] has connected!`);
        ws.off('message', listener);
        const isOnline = true;
        const dbTurtle = {
            id,
            name,
            isOnline,
            fuelLevel,
            fuelLimit,
            selectedSlot,
            inventory: inventoryAsObject,
            stepsSinceLastRecharge,
            state,
            location,
            direction,
        };
        const turtle = new Turtle(
            id,
            name,
            isOnline,
            fuelLevel,
            fuelLimit,
            selectedSlot,
            inventoryAsObject,
            stepsSinceLastRecharge,
            state,
            location,
            direction,
            ws
        );
        connectedTurtlesMap.set(id, turtle);

        globalEventEmitter.emit('tconnect', {turtle: dbTurtle});
        addTurtle(turtle);
        await turtlesDB.addTurtle(dbTurtle);
    };
    ws.on('message', listener);
    ws.on('error', (err) => {
        logger.error(err);
    });
    ws.send(JSON.stringify({type: 'HANDSHAKE', uuid, logLevel: turtleLogLevel}));
};

const wss = new ws.Server({port: 5757});
wss.on('connection', (ws) => {
    logger.info('Incoming connection...');
    initializeHandshake(ws);
});

module.exports = {
    Turtle,
    getOnlineTurtleById: (id) => connectedTurtlesMap.get(id),
};
