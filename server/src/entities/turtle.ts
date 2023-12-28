import WebSocket, {WebSocketServer} from 'ws';
import globalEventEmitter from '../globalEventEmitter';
import nameList from '../names';
import {getLocalCoordinatesForDirection} from '../helpers/coordinates';
import turtleLogLevel from '../logger/turtle';
import logger from '../logger/server';
import {
    updateTurtleName,
    updateTurtleFuelLevel,
    updateTurtleSelectedSlot,
    updateTurtleInventory,
    updateTurtleStepsSinceLastRefuel,
    updateTurtleState,
    updateTurtleLocation,
    updateTurtleDirection,
    updateTurtleMovement,
    updateTurtleFuel,
    getTurtle,
    upsertTurtle,
    deleteBlock,
    getBlock,
    upsertBlock,
    upsertServer,
    getServerByRemoteAddress,
} from '../db';
import {Block} from '../db/block.type';
import {Direction, Inventory, ItemDetail, Location} from '../db/turtle.type';
import {StateData, TurtleBaseState} from './states/base';
import {StateDataTypes, TURTLE_STATES} from './states/helpers';
import {FarmingStateData, TurtleFarmingState} from './states/farming';
import {MovingStateData, TurtleMoveState} from './states/move';
import {MiningStateData, TurtleMiningState} from './states/mining';
import {TurtleRefuelingState} from './states/refueling';
import {TurtleScanState} from './states/scan';

const turtleWssPort = process.env.TURTLE_WSS_PORT ? Number(process.env.TURTLE_WSS_PORT) : 5757;
const wss = new WebSocketServer({port: turtleWssPort});
wss.on('connection', (ws, req) => {
    logger.info('Incoming connection...');
    initializeHandshake(ws, req.socket.remoteAddress as string);
});

logger.info(`Turtle WebSocket listening on port \x1b[36m${turtleWssPort}\x1b[0m`);

const connectedTurtlesMap = new Map<number, Turtle>();
export class Turtle {
    // Database properties
    public readonly serverId: number;
    public readonly id: number;

    #name: string;
    #isOnline: boolean;
    #fuelLevel: number;
    #fuelLimit: number;
    #selectedSlot: number;
    #inventory: Inventory;
    #stepsSinceLastRefuel: number;
    #state: TurtleBaseState<StateDataTypes> | null;
    #location: Location | null;
    #direction: Direction | null;

    // Private properties
    private readonly ws;
    private lastPromise: Promise<unknown> = new Promise<void>((resolve) => resolve());
    private actTimeout: NodeJS.Timeout | null = null;

    constructor(
        serverId: number,
        id: number,
        name: string,
        isOnline: boolean,
        fuelLevel: number,
        fuelLimit: number,
        selectedSlot: number,
        inventory: Inventory,
        stepsSinceLastRefuel: number,
        state: StateData<StateDataTypes> | null,
        location: Location | null,
        direction: Direction | null,
        ws: WebSocket
    ) {
        this.serverId = serverId;
        this.id = id;
        this.#name = name;
        this.#isOnline = isOnline;
        this.#fuelLevel = fuelLevel;
        this.#fuelLimit = fuelLimit;
        this.#selectedSlot = selectedSlot;
        this.#inventory = inventory;
        this.#stepsSinceLastRefuel = stepsSinceLastRefuel;
        this.#state = this.getRecoveredState(state);
        this.#location = location;
        this.#direction = direction;

        this.ws = ws;
        this.ws.on('close', (code, message) => {
            logger.info(
                `${this.name ?? '<unnamed>'}[${
                    this.id ?? '<uninitialized turtle>'
                }] has disconnected with code ${code} and message ${message?.toString() || '<none>'}`
            );
            if (this.id) {
                connectedTurtlesMap.delete(this.id);
                globalEventEmitter.emit('tdisconnect', {id: this.id, serverId: this.serverId});
            }
        });
        this.ws.on('disconnect', (code, message) => {
            logger.info(
                `${this.name ?? '<unnamed>'}[${
                    this.id ?? '<uninitialized turtle>'
                }] has disconnected with code ${code} and message ${message?.toString() || '<none>'}`
            );
            if (this.id) {
                connectedTurtlesMap.delete(this.id);
                this.isOnline = false;
                globalEventEmitter.emit('tdisconnect', {id: this.id, serverId: this.serverId});
            }
        });
    }

    public get name() {
        return this.#name;
    }

    public set name(name) {
        this.#name = name;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                name: this.name,
            },
        });
        updateTurtleName(this.serverId, this.id, this.name);
    }

    public get isOnline() {
        return this.#isOnline;
    }

    public set isOnline(isOnline) {
        this.#isOnline = isOnline;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                isOnline: this.isOnline,
            },
        });
    }

    public get fuelLevel() {
        return this.#fuelLevel;
    }

    public set fuelLevel(fuelLevel) {
        this.#fuelLevel = fuelLevel;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                fuelLevel: this.fuelLevel,
            },
        });
        updateTurtleFuelLevel(this.serverId, this.id, this.fuelLevel);
    }

    public get fuelLimit() {
        return this.#fuelLimit;
    }

    private set fuelLimit(fuelLimit: number) {
        this.#fuelLimit = fuelLimit;
    }

    public get selectedSlot() {
        return this.#selectedSlot;
    }

    public set selectedSlot(selectedSlot) {
        this.#selectedSlot = selectedSlot;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                selectedSlot: this.selectedSlot,
            },
        });
        updateTurtleSelectedSlot(this.serverId, this.id, this.selectedSlot);
    }

    public get inventory() {
        return this.#inventory;
    }

    public set inventory(inventory) {
        this.#inventory = inventory;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                inventory: this.inventory,
            },
        });
        updateTurtleInventory(this.serverId, this.id, this.inventory);
    }

    public get stepsSinceLastRefuel() {
        return this.#stepsSinceLastRefuel;
    }

    public set stepsSinceLastRefuel(stepsSinceLastRefuel) {
        this.#stepsSinceLastRefuel = stepsSinceLastRefuel;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                stepsSinceLastRefuel: this.stepsSinceLastRefuel,
            },
        });
        updateTurtleStepsSinceLastRefuel(this.serverId, this.id, this.stepsSinceLastRefuel);
    }

    private runActLoop() {
        const cb = async () => {
            await this.state?.act();
            if (this.state !== null) {
                this.runActLoop();
            }
        };
        this.actTimeout = setTimeout(cb, 0);
    }

    /**
     * Null = Standby
     */
    public get state() {
        return this.#state;
    }

    public set state(state: TurtleBaseState<StateDataTypes> | null) {
        const previousStateWasNull = this.state === null;
        this.#state = state;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                state: this.state ?? null,
            },
        });
        updateTurtleState(this.serverId, this.id, this.state?.data ?? null);

        if (state === null && this.actTimeout !== null) {
            clearTimeout(this.actTimeout);
        } else if (previousStateWasNull) {
            this.runActLoop();
        }
    }

    private getRecoveredState(data: StateData<StateDataTypes> | null): TurtleBaseState<StateDataTypes> | null {
        if (data === null) return null;

        switch (data.id) {
            case TURTLE_STATES.FARMING:
                return new TurtleFarmingState(this, data as FarmingStateData);
            case TURTLE_STATES.MOVING:
                return new TurtleMoveState(this, data as MovingStateData);
            case TURTLE_STATES.REFUELING:
                return new TurtleRefuelingState(this);
            case TURTLE_STATES.MINING:
                return new TurtleMiningState(this, data as MiningStateData);
            case TURTLE_STATES.SCANNING:
                return new TurtleScanState(this);
            default:
                return null;
        }
    }

    public set error(message: string) {
        if (this.state) {
            this.state.error = message;
        }
    }

    public get location() {
        return this.#location;
    }

    public set location(location) {
        this.#location = location;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                location: this.location,
            },
        });
        updateTurtleLocation(this.serverId, this.id, this.location);
    }

    /**
     * 1: WEST
     * 2: NORTH
     * 3: EAST
     * 4: SOUTH
     */
    public get direction() {
        return this.#direction;
    }

    public set direction(direction: Direction | null) {
        this.#direction = direction;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                direction: this.direction,
            },
        });
        updateTurtleDirection(this.serverId, this.id, this.direction);
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
    async forward(): Promise<[boolean, string | undefined]> {
        const forward = await this.#exec<[boolean, string | undefined]>('turtle.forward()');
        if (!this.location || !this.direction) return forward;

        const [didMove] = forward;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRefuel++;
            const [xChange, zChange] = getLocalCoordinatesForDirection(this.direction);
            const {x, y, z} = this.location;
            this.#location = {x: x + xChange, y, z: z + zChange};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                serverId: this.serverId,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRefuel: this.stepsSinceLastRefuel,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            updateTurtleMovement(this.serverId, this.id, this.fuelLevel, this.stepsSinceLastRefuel, this.location);
            deleteBlock(this.serverId, this.location.x, this.location.y, this.location.z);
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
    async back(): Promise<[boolean, string | undefined]> {
        const back = await this.#exec<[boolean, string | undefined]>('turtle.back()');
        if (!this.location || !this.direction) return back;

        const [didMove] = back;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRefuel++;
            const [xChange, zChange] = getLocalCoordinatesForDirection((((this.direction % 4) + 1) % 4) + 1);
            const {x, y, z} = this.location;
            this.#location = {x: x + xChange, y, z: z + zChange};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                serverId: this.serverId,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRefuel: this.stepsSinceLastRefuel,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            updateTurtleMovement(this.serverId, this.id, this.fuelLevel, this.stepsSinceLastRefuel, this.location);
            deleteBlock(this.serverId, this.location.x, this.location.y, this.location.z);
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
    async up(): Promise<[boolean, string | undefined]> {
        const up = await this.#exec<[boolean, string | undefined]>('turtle.up()');
        if (!this.location) return up;

        const [didMove] = up;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRefuel++;
            const {x, y, z} = this.location;
            this.#location = {x, y: y + 1, z};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                serverId: this.serverId,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRefuel: this.stepsSinceLastRefuel,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            updateTurtleMovement(this.serverId, this.id, this.fuelLevel, this.stepsSinceLastRefuel, this.location);
            deleteBlock(this.serverId, this.location.x, this.location.y, this.location.z);
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
    async down(): Promise<[boolean, string | undefined]> {
        const down = await this.#exec<[boolean, string | undefined]>('turtle.down()');
        if (!this.location) return down;

        const [didMove] = down;
        if (didMove) {
            this.#fuelLevel--;
            this.#stepsSinceLastRefuel++;
            const {x, y, z} = this.location;
            this.#location = {x, y: y - 1, z};

            globalEventEmitter.emit('tupdate', {
                id: this.id,
                serverId: this.serverId,
                data: {
                    fuelLevel: this.fuelLevel,
                    stepsSinceLastRefuel: this.stepsSinceLastRefuel,
                    location: this.location,
                },
            });
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });

            updateTurtleMovement(this.serverId, this.id, this.fuelLevel, this.stepsSinceLastRefuel, this.location);
            deleteBlock(this.serverId, this.location.x, this.location.y, this.location.z);
        }
        return down;
    }

    public async turnToDirection(direction: Direction) {
        if (this.direction === null) return;

        const turn = (direction - this.direction + 4) % 4;
        if (turn === 1) {
            await this.turnRight();
        } else if (turn === 2) {
            await this.turnLeft();
            await this.turnLeft();
        } else if (turn === 3) {
            await this.turnLeft();
        }
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
    async turnLeft(): Promise<[boolean, string | undefined]> {
        const turnLeft = await this.#exec<[boolean, string | undefined]>('turtle.turnLeft()');
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
    async turnRight(): Promise<[boolean, string | undefined]> {
        const turnRight = await this.#exec<[boolean, string | undefined]>('turtle.turnRight()');
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
    async getItemDetail(slot = this.selectedSlot, detailed = true): Promise<ItemDetail | null> {
        const [itemDetail] = await this.#exec<[ItemDetail | null]>(
            `turtle.getItemDetail(${slot}, ${detailed}) or textutils.json_null`
        );
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
    async refreshInventoryState(from: number = this.selectedSlot, stopOnUndefined: boolean = false): Promise<void> {
        const inventoryAsObject: Inventory = {};
        for (let i = 1; i < 17; i++) {
            const [item] = await this.#exec<[ItemDetail | null]>(
                `turtle.getItemDetail(${i}, true) or textutils.json_null`
            );
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
    async dig(): Promise<[boolean, string | undefined]> {
        if (this.location === null) return [false, 'Turtle location is null'];

        const selectedSlot = this.selectedSlot;
        const dig = await this.#exec<[boolean, string | undefined]>('turtle.dig()');
        const [didDig] = dig;
        if (didDig) {
            const inventory: Inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec<[ItemDetail | null]>(
                    `turtle.getItemDetail(${i}, true) or textutils.json_null`
                );
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });
            deleteBlock(this.serverId, this.location.x, this.location.y, this.location.z);
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
    async digUp(): Promise<[boolean, string | undefined]> {
        if (this.location === null) return [false, 'Turtle location is null'];

        const selectedSlot = this.selectedSlot;
        const digUp = await this.#exec<[boolean, string | undefined]>('turtle.digUp()');
        const [didDig] = digUp;
        if (didDig) {
            const inventory: Inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec<[ItemDetail | null]>(
                    `turtle.getItemDetail(${i}, true) or textutils.json_null`
                );
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });
            deleteBlock(this.serverId, this.location.x, this.location.y, this.location.z);
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
    async digDown(): Promise<[boolean, string | undefined]> {
        if (this.location === null) return [false, 'Turtle location is null'];

        const selectedSlot = this.selectedSlot;
        const digDown = await this.#exec<[boolean, string | undefined]>('turtle.digDown()');
        const [didDig] = digDown;
        if (didDig) {
            const inventory: Inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec<[ItemDetail | null]>(
                    `turtle.getItemDetail(${i}, true) or textutils.json_null`
                );
                inventory[i] = item ?? undefined;
                if (item === undefined) break;
            }

            this.inventory = {
                ...this.inventory,
                ...inventory,
            };
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y,
                z: this.location.z,
            });
            deleteBlock(this.serverId, this.location.x, this.location.y, this.location.z);
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
    async inspect(): Promise<Block | undefined> {
        if (this.location === null) throw new Error('Turtle location is null');
        if (this.direction === null) throw new Error('Turtle direction is null');

        const {x, y, z} = this.location;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.direction);
        const [didInspect, block] = await this.#exec<[boolean, Block | undefined]>('turtle.inspect()');
        if (!didInspect) {
            const dbBlock = getBlock(this.serverId, x + xChange, y, z + zChange);
            if (!dbBlock) return;
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x + xChange,
                y: this.location.y,
                z: this.location.z + zChange,
            });
            deleteBlock(this.serverId, this.location.x + xChange, this.location.y, this.location.z + zChange);
            return undefined;
        }

        const dbBlock = getBlock(this.serverId, x + xChange, y, z + zChange);
        if (!dbBlock || dbBlock?.name !== block?.name) {
            upsertBlock(
                this.serverId,
                x + xChange,
                y,
                z + zChange,
                (block as Block).name,
                (block as Block).state,
                (block as Block).tags
            );
            globalEventEmitter.emit('wupdate', {serverId: this.serverId, blocks: [{
                x: x + xChange,
                y,
                z: z + zChange,
                name: (block as Block).name,
                state: (block as Block).state,
                tags: (block as Block).tags
            }]});
        }
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
    async inspectUp(): Promise<Block | undefined> {
        if (this.location === null) throw new Error('Turtle location is null');
        if (this.direction === null) throw new Error('Turtle direction is null');

        const {x, y, z} = this.location;
        const [didInspect, block] = await this.#exec<[boolean, Block | undefined]>('turtle.inspectUp()');
        if (!didInspect) {
            const dbBlock = getBlock(this.serverId, x, y + 1, z);
            if (!dbBlock) return;
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y + 1,
                z: this.location.z,
            });
            deleteBlock(this.serverId, this.location.x, this.location.y + 1, this.location.z);
            return undefined;
        }

        const dbBlock = getBlock(this.serverId, x, y + 1, z);
        if (!dbBlock || dbBlock?.name !== block?.name) {
            upsertBlock(
                this.serverId,
                x,
                y + 1,
                z,
                (block as Block).name,
                (block as Block).state,
                (block as Block).tags
            );
            globalEventEmitter.emit('wupdate', {serverId: this.serverId, blocks: [{
                x,
                y: y + 1,
                z,
                name: (block as Block).name,
                state: (block as Block).state,
                tags: (block as Block).tags
            }]});
        }
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
    async inspectDown(): Promise<Block | undefined> {
        if (this.location === null) throw new Error('Turtle location is null');
        if (this.direction === null) throw new Error('Turtle direction is null');

        const {x, y, z} = this.location;
        const [didInspect, block] = await this.#exec<[boolean, Block | undefined]>('turtle.inspectDown()');
        if (!didInspect) {
            const dbBlock = getBlock(this.serverId, x, y - 1, z);
            if (!dbBlock) return;
            globalEventEmitter.emit('wdelete', {
                serverId: this.serverId,
                x: this.location.x,
                y: this.location.y - 1,
                z: this.location.z,
            });
            deleteBlock(this.serverId, this.location.x, this.location.y + 1, this.location.z);
            return undefined;
        }

        const dbBlock = getBlock(this.serverId, x, y - 1, z);
        if (!dbBlock || dbBlock?.name !== block?.name) {
            upsertBlock(
                this.serverId,
                x,
                y - 1,
                z,
                (block as Block).name,
                (block as Block).state,
                (block as Block).tags
            );
            globalEventEmitter.emit('wupdate', {serverId: this.serverId, blocks: [{
                x,
                y: y - 1,
                z,
                name: (block as Block).name,
                state: (block as Block).state,
                tags: (block as Block).tags
            }]});
        }
        return block;
    }

    async place(): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const place = await this.#exec<[boolean, string | undefined]>('turtle.place()');
        const [didPlace] = place;
        if (didPlace) {
            const item = await this.getItemDetail(selectedSlot);
            this.inventory[selectedSlot] = item ?? undefined;
            await this.inspect();
        }

        return place;
    }

    async placeUp(): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const placeUp = await this.#exec<[boolean, string | undefined]>('turtle.placeUp()');
        const [didPlace] = placeUp;
        if (didPlace) {
            const item = await this.getItemDetail(selectedSlot);
            this.inventory[selectedSlot] = item ?? undefined;
            await this.inspectUp();
        }

        return placeUp;
    }

    async placeDown(): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const placeDown = await this.#exec<[boolean, string | undefined]>('turtle.placeDown()');
        const [didPlace] = placeDown;
        if (didPlace) {
            const item = await this.getItemDetail(selectedSlot);
            this.inventory[selectedSlot] = item ?? undefined;
            await this.inspectDown();
        }

        return placeDown;
    }

    async drop(): Promise<[boolean, string | undefined]> {
        const slot = this.selectedSlot;
        const drop = await this.#exec<[boolean, string | undefined]>('turtle.drop()');
        const [didDrop] = drop;
        if (didDrop) {
            await this.getItemDetail(slot);
        }
        return drop;
    }

    async dropUp(): Promise<[boolean, string | undefined]> {
        const slot = this.selectedSlot;
        const dropUp = await this.#exec<[boolean, string | undefined]>('turtle.dropUp()');
        const [didDrop] = dropUp;
        if (didDrop) {
            await this.getItemDetail(slot);
        }
        return dropUp;
    }

    async dropDown(): Promise<[boolean, string | undefined]> {
        const slot = this.selectedSlot;
        const dropDown = await this.#exec<[boolean, string | undefined]>('turtle.dropDown()');
        const [didDrop] = dropDown;
        if (didDrop) {
            await this.getItemDetail(slot);
        }
        return dropDown;
    }

    async select(slot = 1): Promise<[boolean, string | undefined]> {
        const select = await this.#exec<[boolean, string | undefined]>(`turtle.select(${slot})`);
        const [didSelect] = select;
        if (didSelect) {
            this.selectedSlot = Number(slot);
        }
        return select;
    }

    async suck(count?: number): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const suck = await this.#exec<[boolean, string | undefined]>(`turtle.suck(${count ?? ''})`);
        const [didSuckItems] = suck;
        if (!didSuckItems) {
            const inventory: Inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec<[ItemDetail | null]>(
                    `turtle.getItemDetail(${i}, true) or textutils.json_null`
                );
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

    async suckUp(count?: number): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const suckUp = await this.#exec<[boolean, string | undefined]>(`turtle.suckUp(${count ?? ''})`);
        const [didSuckItems] = suckUp;
        if (!didSuckItems) {
            const inventory: Inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec<[ItemDetail | null]>(
                    `turtle.getItemDetail(${i}, true) or textutils.json_null`
                );
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

    async suckDown(count?: number): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const suckDown = await this.#exec<[boolean, string | undefined]>(`turtle.suckDown(${count ?? ''})`);
        const [didSuckItems] = suckDown;
        if (!didSuckItems) {
            const inventory: Inventory = {};
            for (let i = selectedSlot; i < 17; i++) {
                const [item] = await this.#exec<[ItemDetail | null]>(
                    `turtle.getItemDetail(${i}, true) or textutils.json_null`
                );
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

    async refuel(): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const refuel = await this.#exec<[boolean, string | undefined]>('turtle.refuel()');
        const [didRefuel] = refuel;
        if (didRefuel) {
            const [updatedFuelLevel] = await this.#exec<[number | string]>('turtle.getFuelLevel()');
            this.#fuelLevel = typeof updatedFuelLevel === 'string' ? Number.POSITIVE_INFINITY : updatedFuelLevel;
            const [item] = await this.#exec<[ItemDetail | null]>(
                `turtle.getItemDetail(${selectedSlot}, true) or textutils.json_null`
            );
            this.#inventory[selectedSlot] = item ?? undefined;

            updateTurtleFuel(this.serverId, this.id, this.fuelLevel, this.inventory);
            globalEventEmitter.emit('tupdate', {
                id: this.id,
                serverId: this.serverId,
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
    async transferTo(slot: number, count?: number): Promise<[boolean]> {
        const selectedSlot = this.selectedSlot;
        if (slot === selectedSlot) return [true];
        // NOTE:
        // CC:Tweaked documentation is wrong for turtle.transferTo,
        // it returns [true] only if ALL items successfully transfer and returns [false] otherwise
        const transfer = count
            ? await this.#exec<[boolean]>(`turtle.transferTo(${slot}, ${count})`)
            : await this.#exec<[boolean]>(`turtle.transferTo(${slot})`);
        const [itemDetail] = await this.#exec<[ItemDetail | null]>(
            `turtle.getItemDetail(${slot}, true) or textutils.json_null`
        );
        const [selectedItemDetail] = await this.#exec<[ItemDetail | null]>(
            `turtle.getItemDetail(${selectedSlot}, true) or textutils.json_null`
        );
        this.inventory = {
            ...this.inventory,
            [slot]: itemDetail ?? undefined,
            [selectedSlot]: selectedItemDetail ?? undefined,
        };

        return transfer;
    }

    async equipLeft(): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const equipLeft = await this.#exec<[boolean, string | undefined]>('turtle.equipLeft()');
        const [didEquip] = equipLeft;
        if (didEquip) {
            await this.getItemDetail(selectedSlot);
        }

        return equipLeft;
    }

    async equipRight(): Promise<[boolean, string | undefined]> {
        const selectedSlot = this.selectedSlot;
        const equipRight = await this.#exec<[boolean, string | undefined]>('turtle.equipRight()');
        const [didEquip] = equipRight;
        if (didEquip) {
            await this.getItemDetail(selectedSlot);
        }

        return equipRight;
    }

    async getSelectedSlot(): Promise<[number]> {
        const [selectedSlot] = await this.#exec<string>('turtle.getSelectedSlot()');
        const transformedSelectedSlot = Number(selectedSlot);
        this.selectedSlot = transformedSelectedSlot;
        return [transformedSelectedSlot];
    }

    async getFuelLimit(): Promise<[number]> {
        const [fuelLimit] = await this.#exec<string>('turtle.getFuelLimit()');
        const transformedFuelLimit = Number(fuelLimit);
        this.fuelLimit = transformedFuelLimit;
        return [transformedFuelLimit];
    }

    async craft(): Promise<void> {
        const [hasWorkbench] = await this.hasPeripheralWithName('workbench');
        if (!hasWorkbench) {
            this.error = 'No workbench to craft with';
            return;
        }

        const [didCraft, craftMessage] = await this.#exec<[boolean, string | undefined]>(
            'peripheral.find("workbench").craft()'
        );
        if (didCraft) {
            const inventoryAsObject: Inventory = {};
            for (let i = 1; i < 17; i++) {
                const [item] = await this.#exec<[ItemDetail | null]>(
                    `turtle.getItemDetail(${i}, true) or textutils.json_null`
                );
                inventoryAsObject[i] = item ?? undefined;
            }
            this.#inventory = inventoryAsObject;
            globalEventEmitter.emit('tupdate', {
                id: this.id,
                serverId: this.serverId,
                data: {
                    inventory: this.inventory,
                },
            });
        } else {
            this.error = craftMessage as string;
        }
    }

    async hasPeripheralWithName(peripheralName: string): Promise<[boolean]> {
        return await this.#exec<[boolean]>(`peripheral.find("${peripheralName}") ~= nil`);
    }

    async usePeripheralWithName<R>(peripheralName: string, method: string, ...args: string[]): Promise<R> {
        return await this.#exec<R>(`peripheral.find("${peripheralName}").${method}(${args?.join(', ')})`);
    }

    async gpsLocate(): Promise<[number, number, number] | [null, null, null]> {
        return await this.#exec(
            '(function(x, y, z) return x and y and z and x, y, z or textutils.json_null end)(gps.locate())'
        );
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
    async compareTo(slot: number) {
        return await this.#exec<[boolean]>(`turtle.compareTo(${slot})`);
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

    async getFuelLevel(): Promise<[number]> {
        const [updatedFuelLevel] = await this.#exec<[number | string]>('turtle.getFuelLevel()');
        this.fuelLevel = typeof updatedFuelLevel === 'string' ? Number.POSITIVE_INFINITY : updatedFuelLevel;
        return [this.fuelLevel];
    }

    async rename(name: string): Promise<void> {
        await this.#exec<void>(`os.setComputerLabel("${name}")`);
        this.name = name;
    }

    async inventoryTransfer(fromSlot: number, toSlot: number): Promise<void> {
        const currentSlot = this.selectedSlot;
        const [didSelect] = await this.select(fromSlot);
        if (didSelect) {
            await this.transferTo(toSlot);
            await this.select(currentSlot);
        }
    }

    #exec<R>(f: string): Promise<R> {
        return this.#execRaw(`return ${f}`);
    }

    #execRaw<R>(f: string): Promise<R> {
        const messageConstructorObject: {[key: number]: string} = {};
        this.lastPromise = new Promise<R>((resolve, reject) =>
            this.lastPromise.finally(() => {
                const listener = (msg: Buffer) => {
                    if (msg.length < 6) {
                        logger.warning(`Invalid WebSocket message received: ${msg}`);
                        return;
                    }
            
                    if (msg[0] !== 0x01) {
                        logger.warning(`Turtle WebSocket message does not start with 0x01 (start of heading)`);
                        return;
                    }
            
                    const messageIndex = parseInt(msg.toString('hex', 1, 5), 16);
                    const isFinalMessage = msg[msg.length - 1] === 0x04;
                    const str = msg.toString('utf-8', 6, isFinalMessage ? msg.length - 1 : undefined);
                    messageConstructorObject[messageIndex] = str;
                    if (!isFinalMessage) return;

                    const jsonStr = Object.values(messageConstructorObject).reduce((acc, curr) => acc + curr, '');

                    const obj = JSON.parse(jsonStr);
                    if (obj.type === 'ERROR') {
                        logger.error(obj.message);
                        return;
                    }

                    if (obj.type !== 'EVAL') {
                        return reject(`Unknown response type "${obj.type}" from turtle with message "${obj.message}"`);
                    }

                    this.ws.off('message', listener);
                    return resolve(obj.message);
                };
                this.ws.on('message', listener);
                this.ws.send(JSON.stringify({type: 'EVAL', function: f}));
            })
        );

        return this.lastPromise as Promise<R>;
    }
}

const initializeHandshake = (ws: WebSocket, remoteAddress: string) => {
    logger.info('Initiating handshake...');
    const messageConstructorObject: {[key: number]: string} = {};
    const listener = async (msg: Buffer) => {
        if (msg.length < 6) {
            logger.warning(`Invalid WebSocket message received: ${msg}`);
            return;
        }

        if (msg[0] !== 0x01) {
            logger.warning(`Turtle WebSocket message does not start with 0x01 (start of heading)`);
            return;
        }

        const messageIndex = parseInt(msg.toString('hex', 1, 5), 16);
        const isFinalMessage = msg[msg.length - 1] === 0x04;
        const str = msg.toString('utf-8', 6, isFinalMessage ? msg.length - 1 : undefined);
        messageConstructorObject[messageIndex] = str;
        if (!isFinalMessage) return;

        const obj = JSON.parse(Object.values(messageConstructorObject).reduce((acc, curr) => acc + curr, ''));
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

        upsertServer(remoteAddress, null);
        const {id: serverId} = getServerByRemoteAddress(remoteAddress);
        const {stepsSinceLastRefuel, state, location, direction} = getTurtle(serverId, id) ?? {
            stepsSinceLastRefuel: 0,
            state: null,
            location: null,
            direction: null
        };
        logger.info(`${name || '<unnamed>'} [${id}] has connected!`);
        ws.off('message', listener);
        const isOnline = true;
        const turtle = new Turtle(
            serverId,
            id,
            name,
            isOnline,
            fuelLevel,
            fuelLimit,
            selectedSlot,
            inventoryAsObject,
            stepsSinceLastRefuel,
            state,
            location,
            direction,
            ws
        );
        connectedTurtlesMap.set(id, turtle);

        globalEventEmitter.emit('tconnect', {
            id,
            serverId,
            turtle: {
                serverId,
                id,
                name,
                isOnline,
                fuelLevel,
                fuelLimit,
                selectedSlot,
                inventory: inventoryAsObject,
                stepsSinceLastRefuel,
                state,
                location,
                direction,
            },
        });
        upsertTurtle(
            serverId,
            id,
            name,
            fuelLevel,
            fuelLimit,
            selectedSlot,
            inventoryAsObject,
            stepsSinceLastRefuel,
            state,
            location,
            direction
        );
    };
    ws.on('message', listener);
    ws.on('error', (err) => {
        logger.error(err);
    });
    ws.send(JSON.stringify({type: 'HANDSHAKE', logLevel: turtleLogLevel}));
};

export const getOnlineTurtles = () => connectedTurtlesMap.values();
export const getOnlineTurtleById = (id: number) => connectedTurtlesMap.get(id);
