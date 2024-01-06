import WebSocket, {WebSocketServer} from 'ws';
import {v4 as uuid4} from 'uuid';
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
import {EventEmitter} from 'events';

export interface Peripherals {
    [key: string]: {
        data?: unknown;
        types: string[];
    };
}

interface MessageConstructorObject {
    [key: number]: string;
}

const turtleWssPort = process.env.TURTLE_WSS_PORT ? Number(process.env.TURTLE_WSS_PORT) : 5757;
const wss = new WebSocketServer({port: turtleWssPort});
wss.on('connection', (ws, req) => {
    logger.info('Incoming connection...');
    const remoteAddress = req.socket.remoteAddress as string;
    const turtleEventEmitter = new EventEmitter();

    const messageConstructorMap = new Map<string, MessageConstructorObject>();
    const messageConstructor = async (msg: Buffer) => {
        if (msg.length < 11) {
            logger.warning(`Invalid WebSocket message received: ${msg}`);
            return;
        }

        if (msg[0] !== 0x01) {
            logger.warning(`Turtle WebSocket message does not start with 0x01 (start of heading)`);
            return;
        }

        const messageIndex = parseInt(msg.toString('hex', 1, 5), 16);
        const uuidLength = parseInt(msg.toString('hex', 5, 9), 16);

        const messageUuid = msg.toString('utf-8', 9, 9 + uuidLength);
        const isFinalMessage = msg[msg.length - 1] === 0x04;
        const str = msg.toString('utf-8', 10 + uuidLength, isFinalMessage ? msg.length - 1 : undefined);
        if (isFinalMessage && messageIndex === 1) {
            const obj = JSON.parse(
                messageIndex === 1
                    ? str
                    : Object.values(messageConstructorMap.get(messageUuid) as MessageConstructorObject).reduce(
                          (acc, curr) => acc + curr,
                          ''
                      ) + str
            );
            messageConstructorMap.delete(messageUuid);
            turtleEventEmitter.emit(messageUuid, obj);
            return;
        }

        if (!messageConstructorMap.has(messageUuid)) {
            messageConstructorMap.set(messageUuid, {});
        }

        const messageConstructorObject = messageConstructorMap.get(messageUuid) as MessageConstructorObject;
        messageConstructorObject[messageIndex] = str;
    };

    ws.on('message', messageConstructor);
    ws.on('error', (err) => {
        logger.error(err);
    });

    // Handshake
    (() => {
        const uuid = uuid4();
        logger.info('Initiating handshake...');
        ws.send(JSON.stringify({type: 'HANDSHAKE', uuid, logLevel: turtleLogLevel}));
        const handshake = (obj: {
            type: 'HANDSHAKE';
            message: {
                id: number;
                label: string;
                fuel: {
                    level: number;
                    limit: number;
                };
                inventory: {
                    '1': ItemDetail;
                    '2': ItemDetail;
                    '3': ItemDetail;
                    '4': ItemDetail;
                    '5': ItemDetail;
                    '6': ItemDetail;
                    '7': ItemDetail;
                    '8': ItemDetail;
                    '9': ItemDetail;
                    '10': ItemDetail;
                    '11': ItemDetail;
                    '12': ItemDetail;
                    '13': ItemDetail;
                    '14': ItemDetail;
                    '15': ItemDetail;
                    '16': ItemDetail;
                };
                selectedSlot: number;
                peripherals: Peripherals;
            };
        }) => {
            const {message} = obj;
            const {id, label, fuel, selectedSlot, inventory, peripherals} = message;
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
                direction: null,
            };
            logger.info(`${name || '<unnamed>'} [${id}] has connected!`);
            turtleEventEmitter.off(uuid, handshake);
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
                peripherals,
                ws,
                turtleEventEmitter
            );

            const existingTurtlesMap = connectedTurtlesMap.get(serverId);
            if (existingTurtlesMap) {
                existingTurtlesMap.set(id, turtle);
            } else {
                const newMap = new Map<number, Turtle>();
                connectedTurtlesMap.set(serverId, newMap);
                newMap.set(id, turtle);
            }

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
                    peripherals,
                    error: null,
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

            turtle.updateAllAttachedPeripherals(peripherals);
        };

        turtleEventEmitter.on(uuid, handshake);
    })();
});

logger.info(`Turtle WebSocket listening on port \x1b[36m${turtleWssPort}\x1b[0m`);

const connectedTurtlesMap = new Map<number, Map<number, Turtle>>();
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
    #state: TurtleBaseState<StateDataTypes> | null = null;
    #location: Location | null;
    #direction: Direction | null;
    #peripherals: Peripherals;
    #error: string | null = null;

    // Private properties
    private readonly ws;
    private readonly turtleEventEmitter;
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
        peripherals: Peripherals,
        ws: WebSocket,
        eventEmitter: EventEmitter
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
        this.#location = location;
        this.#direction = direction;
        this.#peripherals = peripherals;

        this.ws = ws;
        this.turtleEventEmitter = eventEmitter;
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

        this.state = this.getRecoveredState(state);
        this.turtleEventEmitter.on('update', (obj: {type: string; message: unknown}) => {
            const {type, message} = obj;
            switch (type) {
                case 'INVENTORY_UPDATE':
                    this.inventory = message as Inventory;
                    break;
                case 'PERIPHERAL_ATTACHED':
                    const peripherals = message as Peripherals;
                    const existingPeripherals = this.peripherals;

                    // Check if anything changed
                    if (
                        Object.entries(peripherals).every(([side, {types}]) => {
                            const existingTypes = existingPeripherals[side]?.types;
                            if (!existingTypes) return false;
                            return types.every((type, i) => existingTypes[i] === type);
                        })
                    )
                        break;

                    this.updateAllAttachedPeripherals(peripherals);
                    this.peripherals = peripherals;
                    break;
                case 'PERIPHERAL_DETACHED':
                    this.peripherals = (({[message as string]: _, ...peripherals}) => peripherals)(this.peripherals);
                    break;
                default:
                    logger.warning(`Unknown update type: ${obj.type}`);
                    break;
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
            try {
                await this.state?.act();
            } catch (err) {
                logger.error(err);
                this.state = null;
            }
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
        this.#error = null;
        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                state: this.state ?? null,
                error: null,
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

    public get error() {
        return this.#error;
    }

    public set error(error: string | null) {
        this.#error = error;

        if (error !== null) {
            this.state = null;
        }

        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                error: this.error,
            },
        });
    }

    public get location() {
        return this.#location;
    }

    public get chunk(): [number, number] | null {
        const location = this.location;
        if (location === null) return null;

        const {x, y, z} = location;
        return [Math.floor(x / 16), Math.floor(z / 16)];
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

    public get peripherals() {
        return this.#peripherals;
    }

    public set peripherals(peripherals: Peripherals) {
        this.#peripherals = peripherals;

        globalEventEmitter.emit('tupdate', {
            id: this.id,
            serverId: this.serverId,
            data: {
                peripherals: this.peripherals,
            },
        });
    }

    /**
     * Moves the turtle forward by one block.
     *
     * This method asynchronously executes the 'turtle.forward()' command and updates the turtle's state based on the result.
     */
    async forward(): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'Movement obstructed'
                  | 'Out of fuel'
                  | 'Movement failed'
                  | 'Too low to move'
                  | 'Too high to move'
                  | 'Cannot leave the world'
                  | 'Cannot leave loaded world'
                  | 'Cannot pass the world border'
              ),
          ]
    > {
        const forward = await this.#exec<
            | [true, undefined]
            | [
                  false,
                  (
                      | 'Movement obstructed'
                      | 'Out of fuel'
                      | 'Movement failed'
                      | 'Too low to move'
                      | 'Too high to move'
                      | 'Cannot leave the world'
                      | 'Cannot leave loaded world'
                      | 'Cannot pass the world border'
                  ),
              ]
        >('turtle.forward()');
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
     */
    async back(): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'Movement obstructed'
                  | 'Out of fuel'
                  | 'Movement failed'
                  | 'Too low to move'
                  | 'Too high to move'
                  | 'Cannot leave the world'
                  | 'Cannot leave loaded world'
                  | 'Cannot pass the world border'
              ),
          ]
    > {
        const back = await this.#exec<
            | [true, undefined]
            | [
                  false,
                  (
                      | 'Movement obstructed'
                      | 'Out of fuel'
                      | 'Movement failed'
                      | 'Too low to move'
                      | 'Too high to move'
                      | 'Cannot leave the world'
                      | 'Cannot leave loaded world'
                      | 'Cannot pass the world border'
                  ),
              ]
        >('turtle.back()');
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
     */
    async up(): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'Movement obstructed'
                  | 'Out of fuel'
                  | 'Movement failed'
                  | 'Too low to move'
                  | 'Too high to move'
                  | 'Cannot leave the world'
                  | 'Cannot leave loaded world'
                  | 'Cannot pass the world border'
              ),
          ]
    > {
        const up = await this.#exec<
            | [true, undefined]
            | [
                  false,
                  (
                      | 'Movement obstructed'
                      | 'Out of fuel'
                      | 'Movement failed'
                      | 'Too low to move'
                      | 'Too high to move'
                      | 'Cannot leave the world'
                      | 'Cannot leave loaded world'
                      | 'Cannot pass the world border'
                  ),
              ]
        >('turtle.up()');
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
     */
    async down(): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'Movement obstructed'
                  | 'Out of fuel'
                  | 'Movement failed'
                  | 'Too low to move'
                  | 'Too high to move'
                  | 'Cannot leave the world'
                  | 'Cannot leave loaded world'
                  | 'Cannot pass the world border'
              ),
          ]
    > {
        const down = await this.#exec<
            | [true, undefined]
            | [
                  false,
                  (
                      | 'Movement obstructed'
                      | 'Out of fuel'
                      | 'Movement failed'
                      | 'Too low to move'
                      | 'Too high to move'
                      | 'Cannot leave the world'
                      | 'Cannot leave loaded world'
                      | 'Cannot pass the world border'
                  ),
              ]
        >('turtle.down()');
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
     */
    async turnLeft(): Promise<[true, undefined] | [false, 'Unknown direction']> {
        const turnLeft = await this.#exec<[true, undefined] | [false, 'Unknown direction']>('turtle.turnLeft()');
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
     */
    async turnRight(): Promise<[true, undefined] | [false, 'Unknown direction']> {
        const turnRight = await this.#exec<[true, undefined] | [false, 'Unknown direction']>('turtle.turnRight()');
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
     */
    async dig(): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'Cannot break unbreakable block'
                  | 'Cannot break block with this tool'
                  | 'No tool to dig with'
                  | 'Turtle location is null'
              ),
          ]
    > {
        if (this.location === null) return [false, 'Turtle location is null'];

        const dig = await this.#exec<
            | [true, undefined]
            | [false, 'Cannot break unbreakable block' | 'Cannot break block with this tool' | 'No tool to dig with']
        >('turtle.dig()');
        const [didDig] = dig;
        if (didDig) {
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
     */
    async digUp(): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'Cannot break unbreakable block'
                  | 'Cannot break block with this tool'
                  | 'No tool to dig with'
                  | 'Turtle location is null'
              ),
          ]
    > {
        if (this.location === null) return [false, 'Turtle location is null'];

        const digUp = await this.#exec<
            | [true, undefined]
            | [false, 'Cannot break unbreakable block' | 'Cannot break block with this tool' | 'No tool to dig with']
        >('turtle.digUp()');
        const [didDig] = digUp;
        if (didDig) {
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
     */
    async digDown(): Promise<
        | [true, undefined]
        | [false, 'Cannot break unbreakable block' | 'Cannot break block with this tool' | 'Turtle location is null']
    > {
        if (this.location === null) return [false, 'Turtle location is null'];

        const digDown = await this.#exec<
            [true, undefined] | [false, 'Cannot break unbreakable block' | 'Cannot break block with this tool']
        >('turtle.digDown()');
        const [didDig] = digDown;
        if (didDig) {
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
     * @returns {Promise<Block | null | undefined>} A Promise resolving to an object representing the inspected block or undefined if inspection fails.
     * The details object includes the following properties:
     *   - `state` - An object containing details about the block state if there is any
     *   - `name` - The name of the block
     *   - `tags` - Tags used by Minecraft for block sorting and grouping
     */
    async inspect(): Promise<Block | null | undefined> {
        if (this.location === null) return undefined;
        if (this.direction === null) return undefined;

        const {x, y, z} = this.location;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.direction);
        const [didInspect, block] = await this.#exec<[true, Block] | [false, 'No block to inspect']>(
            'turtle.inspect()'
        );
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
            return null;
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
            globalEventEmitter.emit('wupdate', {
                serverId: this.serverId,
                blocks: [
                    {
                        x: x + xChange,
                        y,
                        z: z + zChange,
                        name: (block as Block).name,
                        state: (block as Block).state,
                        tags: (block as Block).tags,
                    },
                ],
            });
        }
        return block;
    }

    /**
     * Get information about the block above the turtle.
     *
     * This method asynchronously executes the 'turtle.inspectUp()' command and interacts with the world database based on the result.
     *
     * @returns {Promise<Block | null | undefined>} A Promise resolving to an object representing the inspected block or undefined if inspection fails.
     * The details object includes the following properties:
     *   - `state` - An object containing details about the block state if there is any
     *   - `name` - The name of the block
     *   - `tags` - Tags used by Minecraft for block sorting and grouping
     */
    async inspectUp(): Promise<Block | null | undefined> {
        if (this.location === null) return undefined;
        if (this.direction === null) return undefined;

        const {x, y, z} = this.location;
        const [didInspect, block] = await this.#exec<[true, Block] | [false, 'No block to inspect']>(
            'turtle.inspectUp()'
        );
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
            return null;
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
            globalEventEmitter.emit('wupdate', {
                serverId: this.serverId,
                blocks: [
                    {
                        x,
                        y: y + 1,
                        z,
                        name: (block as Block).name,
                        state: (block as Block).state,
                        tags: (block as Block).tags,
                    },
                ],
            });
        }
        return block;
    }

    /**
     * Get information about the block below the turtle.
     *
     * This method asynchronously executes the 'turtle.inspectDown()' command and interacts with the world database based on the result.
     *
     * @returns {Promise<Block | null | undefined>} A Promise resolving to an object representing the inspected block or undefined if inspection fails.
     * The details object includes the following properties:
     *   - `state` - An object containing details about the block state if there is any
     *   - `name` - The name of the block
     *   - `tags` - Tags used by Minecraft for block sorting and grouping
     */
    async inspectDown(): Promise<Block | null | undefined> {
        if (this.location === null) return undefined;
        if (this.direction === null) return undefined;

        const {x, y, z} = this.location;
        const [didInspect, block] = await this.#exec<[true, Block] | [false, 'No block to inspect']>(
            'turtle.inspectDown()'
        );
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
            return null;
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
            globalEventEmitter.emit('wupdate', {
                serverId: this.serverId,
                blocks: [
                    {
                        x,
                        y: y - 1,
                        z,
                        name: (block as Block).name,
                        state: (block as Block).state,
                        tags: (block as Block).tags,
                    },
                ],
            });
        }
        return block;
    }

    /**
     * Place a block or item into the world in front of the turtle.
     *
     * "Placing" an item allows it to interact with blocks and entities in front of the turtle. For instance, buckets can pick up and place down fluids,
     * and wheat can be used to breed cows. However, you cannot use place to perform arbitrary block interactions, such as clicking buttons or
     * flipping levers.
     *
     * @param {string | undefined} text - When placing a sign, set its contents to this text.
     */
    async place(
        text?: string
    ): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'No items to place'
                  | 'Cannot place block here'
                  | 'Cannot place item here'
                  | 'Cannot place in protected area'
              ),
          ]
    > {
        const place = await this.#exec<
            | [true, undefined]
            | [
                  false,
                  (
                      | 'No items to place'
                      | 'Cannot place block here'
                      | 'Cannot place item here'
                      | 'Cannot place in protected area'
                  ),
              ]
        >(text ? `turtle.place("${text}")` : 'turtle.place()');
        const [didPlace] = place;
        if (didPlace) {
            await this.inspect();
        }

        return place;
    }

    /**
     * Place a block or item into the world above the turtle.
     *
     * "Placing" an item allows it to interact with blocks and entities in front of the turtle. For instance, buckets can pick up and place down fluids,
     * and wheat can be used to breed cows. However, you cannot use place to perform arbitrary block interactions, such as clicking buttons or
     * flipping levers.
     *
     * @param {string | undefined} text - When placing a sign, set its contents to this text.
     */
    async placeUp(
        text?: string
    ): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'No items to place'
                  | 'Cannot place block here'
                  | 'Cannot place item here'
                  | 'Cannot place in protected area'
              ),
          ]
    > {
        const placeUp = await this.#exec<
            | [true, undefined]
            | [
                  false,
                  (
                      | 'No items to place'
                      | 'Cannot place block here'
                      | 'Cannot place item here'
                      | 'Cannot place in protected area'
                  ),
              ]
        >(text ? `turtle.placeUp("${text}")` : 'turtle.placeUp()');
        const [didPlace] = placeUp;
        if (didPlace) {
            await this.inspectUp();
        }

        return placeUp;
    }

    /**
     * Place a block or item into the world below the turtle.
     *
     * "Placing" an item allows it to interact with blocks and entities in front of the turtle. For instance, buckets can pick up and place down fluids,
     * and wheat can be used to breed cows. However, you cannot use place to perform arbitrary block interactions, such as clicking buttons or
     * flipping levers.
     *
     * @param {string | undefined} text - When placing a sign, set its contents to this text.
     */
    async placeDown(
        text?: string
    ): Promise<
        | [true, undefined]
        | [
              false,
              (
                  | 'No items to place'
                  | 'Cannot place block here'
                  | 'Cannot place item here'
                  | 'Cannot place in protected area'
              ),
          ]
    > {
        const placeDown = await this.#exec<
            | [true, undefined]
            | [
                  false,
                  (
                      | 'No items to place'
                      | 'Cannot place block here'
                      | 'Cannot place item here'
                      | 'Cannot place in protected area'
                  ),
              ]
        >(text ? `turtle.placeDown("${text}")` : 'turtle.placeDown()');
        const [didPlace] = placeDown;
        if (didPlace) {
            await this.inspectDown();
        }

        return placeDown;
    }

    /**
     * Drop the currently selected stack into the inventory in front of the turtle, or as an item into the world if there is no inventory.
     *
     * @param {number | undefined} count - The number of items to drop. If not given, the entire stack will be dropped.
     */
    async drop(count?: number): Promise<[true, undefined] | [false, 'No space for items' | 'No items to drop']> {
        const drop = await this.#exec<[true, undefined] | [false, 'No space for items' | 'No items to drop']>(
            count ? `turtle.drop(${count})` : 'turtle.drop()'
        );

        if (this.peripherals['front']?.types?.includes('inventory')) {
            await this.connectToInventory('front').catch(() => {});
        }

        return drop;
    }

    /**
     * Drop the currently selected stack into the inventory above the turtle, or as an item into the world if there is no inventory.
     *
     * @param {number | undefined} count - The number of items to drop. If not given, the entire stack will be dropped.
     */
    async dropUp(count?: number): Promise<[true, undefined] | [false, 'No space for items' | 'No items to drop']> {
        const dropUp = await this.#exec<[true, undefined] | [false, 'No space for items' | 'No items to drop']>(
            count ? `turtle.dropUp(${count})` : 'turtle.dropUp()'
        );

        if (this.peripherals['top']?.types?.includes('inventory')) {
            await this.connectToInventory('top').catch(() => {});
        }

        return dropUp;
    }

    /**
     * Drop the currently selected stack into the inventory below the turtle, or as an item into the world if there is no inventory.
     *
     * @param {number | undefined} count - The number of items to drop. If not given, the entire stack will be dropped.
     */
    async dropDown(count?: number): Promise<[true, undefined] | [false, 'No space for items' | 'No items to drop']> {
        const dropDown = await this.#exec<[true, undefined] | [false, 'No space for items' | 'No items to drop']>(
            count ? `turtle.dropDown(${count})` : 'turtle.dropDown()'
        );

        if (this.peripherals['below']?.types?.includes('inventory')) {
            await this.connectToInventory('below').catch(() => {});
        }

        return dropDown;
    }

    /**
     * Change the currently selected slot.
     *
     * The selected slot determines what slot actions like drop or getItemCount act on.
     * @param {number} slot - The slot to select (defaults to 1).
     */
    async select(slot: number = 1): Promise<[boolean, string | undefined]> {
        const select = await this.#exec<[boolean, string | undefined]>(`turtle.select(${slot})`);
        const [didSelect] = select;
        if (didSelect) {
            this.selectedSlot = Number(slot);
        }
        return select;
    }

    /**
     * Suck an item from the inventory in front of the turtle, or from an item floating in the world.
     * This will pull items into the first acceptable slot, starting at the currently selected one.
     * @param {number | undefiend} count - The number of items to suck. If not given, up to a stack of items will be picked up.
     */
    async suck(
        count?: number
    ): Promise<[true, undefined] | [false, 'No space for items' | 'No items to drop' | 'No items to take']> {
        return await this.#exec<
            [true, undefined] | [false, 'No space for items' | 'No items to drop' | 'No items to take']
        >(`turtle.suck(${count ?? ''})`);
    }

    /**
     * Suck an item from the inventory above the turtle, or from an item floating in the world.
     * This will pull items into the first acceptable slot, starting at the currently selected one.
     * @param {number | undefiend} count - The number of items to suck. If not given, up to a stack of items will be picked up.
     */
    async suckUp(
        count?: number
    ): Promise<[true, undefined] | [false, 'No space for items' | 'No items to drop' | 'No items to take']> {
        return await this.#exec<
            [true, undefined] | [false, 'No space for items' | 'No items to drop' | 'No items to take']
        >(`turtle.suckUp(${count ?? ''})`);
    }

    /**
     * Suck an item from the inventory below the turtle, or from an item floating in the world.
     * This will pull items into the first acceptable slot, starting at the currently selected one.
     *
     * @param {number | undefiend} count - The number of items to suck. If not given, up to a stack of items will be picked up.
     */
    async suckDown(
        count?: number
    ): Promise<[true, undefined] | [false, 'No space for items' | 'No items to drop' | 'No items to take']> {
        return await this.#exec<
            [true, undefined] | [false, 'No space for items' | 'No items to drop' | 'No items to take']
        >(`turtle.suckDown(${count ?? ''})`);
    }

    /**
     * Refuel this turtle.
     *
     * While most actions a turtle can perform (such as digging or placing blocks) are free, moving consumes fuel from the turtle's internal
     * buffer. If a turtle has no fuel, it will not move.
     *
     * refuel refuels the turtle, consuming fuel items (such as coal or lava buckets) from the currently selected slot and converting them into
     * energy. This finishes once the turtle is fully refuelled or all items have been consumed.
     *
     * @param {number | undefined} count - The maximum number of items to consume. One can pass 0 to check if an item is combustable or not.
     */
    async refuel(
        count?: number
    ): Promise<[true, undefined] | [false, 'No items to combust' | 'Items not combustible']> {
        const refuel = await this.#exec<[true, undefined] | [false, 'No items to combust' | 'Items not combustible']>(
            count ? `turtle.refuel(${count})` : 'turtle.refuel()'
        );
        const [didRefuel] = refuel;
        if (didRefuel) {
            const [updatedFuelLevel] = await this.getFuelLevel();
            this.#fuelLevel = typeof updatedFuelLevel === 'string' ? Number.POSITIVE_INFINITY : updatedFuelLevel;

            updateTurtleFuel(this.serverId, this.id, this.fuelLevel);
            globalEventEmitter.emit('tupdate', {
                id: this.id,
                serverId: this.serverId,
                data: {
                    fuelLevel: this.fuelLevel,
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
    async transferTo(slot: number, count?: number): Promise<[true, undefined] | [false, 'No space for items']> {
        const selectedSlot = this.selectedSlot;
        if (slot === selectedSlot) return [true, undefined];
        // NOTE:
        // CC:Tweaked documentation is wrong for turtle.transferTo,
        // it returns [true] only if ALL items successfully transfer and returns [false] otherwise
        return count
            ? await this.#exec<[true, undefined] | [false, 'No space for items']>(
                  `turtle.transferTo(${slot}, ${count})`
              )
            : await this.#exec<[true, undefined] | [false, 'No space for items']>(`turtle.transferTo(${slot})`);
    }

    /**
     * Equip (or unequip) an item on the left side of this turtle.
     *
     * This finds the item in the currently selected slot and attempts to equip it to the left side of the turtle. The previous upgrade is removed and
     * placed into the turtle's inventory. If there is no item in the slot, the previous upgrade is removed, but no new one is equipped.
     */
    async equipLeft() {
        return await this.#exec<[true, undefined] | [false, 'Not a valid upgrade']>('turtle.equipLeft()');
    }

    /**
     * Equip (or unequip) an item on the right side of this turtle.
     *
     * This finds the item in the currently selected slot and attempts to equip it to the right side of the turtle. The previous upgrade is removed
     * and placed into the turtle's inventory. If there is no item in the slot, the previous upgrade is removed, but no new one is equipped.
     */
    async equipRight() {
        return await this.#exec<[true, undefined] | [false, 'Not a valid upgrade']>('turtle.equipRight()');
    }

    /**
     * Get the currently selected slot.
     */
    async getSelectedSlot(): Promise<[number]> {
        const [selectedSlot] = await this.#exec<string>('turtle.getSelectedSlot()');
        const transformedSelectedSlot = Number(selectedSlot);
        this.selectedSlot = transformedSelectedSlot;
        return [transformedSelectedSlot];
    }

    /**
     * Get the maximum amount of fuel this turtle can hold.
     *
     * By default, normal turtles have a limit of 20,000 and advanced turtles of 100,000.
     */
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

        const [didCraft, craftMessage] = await this.#exec<[true, undefined] | [false, 'No matching recipes']>(
            'peripheral.find("workbench").craft()'
        );
        if (!didCraft) {
            this.error = craftMessage as string;
        }
    }

    async hasPeripheralWithName(peripheralName: string): Promise<[boolean]> {
        return await this.#exec<[boolean]>(`peripheral.find("${peripheralName}") ~= nil`);
    }

    async usePeripheralWithName<R>(peripheralName: string, method: string, ...args: string[]): Promise<R> {
        return await this.#exec<R>(`peripheral.find("${peripheralName}").${method}(${args?.join(', ')})`);
    }

    async hasPeripheralWithSide(side: string): Promise<[boolean]> {
        return await this.#exec<[boolean]>(`peripheral.isPresent("${side}")`);
    }

    async usePeripheralWithSide<R>(side: string, method: string, ...args: (string | number | null)[]): Promise<R> {
        if (args.length > 0) {
            return await this.#exec<R>(
                `peripheral.call("${side}", "${method}", ${args
                    .map((arg) => {
                        if (arg === null) return 'nil';

                        if (typeof arg === 'string') {
                            return `"${arg}"`;
                        }

                        return arg;
                    })
                    .join(', ')})`
            );
        } else {
            return await this.#exec<R>(`peripheral.call("${side}", "${method}")`);
        }
    }

    async gpsLocate(): Promise<[number, number, number] | [null, null, null]> {
        const locate = await this.#exec<[number, number, number] | [null, null, null]>(
            '(function(x, y, z) return x and y and z and x, y, z or textutils.json_null end)(gps.locate())'
        );
        const [x, y, z] = locate;
        if (x !== null && y !== null && z !== null) {
            this.location = {x, y, z};
        }

        return locate;
    }

    /**
     * Check if there is a solid block in front of the turtle. In this case, solid refers to any non-air or liquid block.
     */
    async detect() {
        return await this.#exec<[boolean]>('turtle.detect()');
    }

    /**
     * Check if there is a solid block above the turtle. In this case, solid refers to any non-air or liquid block.
     */
    async detectUp() {
        return await this.#exec<[boolean]>('turtle.detectUp()');
    }

    /**
     * Check if there is a solid block below the turtle. In this case, solid refers to any non-air or liquid block.
     */
    async detectDown() {
        return await this.#exec<[boolean]>('turtle.detectDown()');
    }

    /**
     * Detects whether or not the block in front of
     * the turtle is the same as the one in the currently selected slot
     */
    async compare(): Promise<[boolean]> {
        return await this.#exec<[boolean]>('turtle.compare()');
    }

    /**
     * Detects whether or not the block above the turtle
     * is the same as the one in the currently selected slot
     */
    async compareUp(): Promise<[boolean]> {
        return await this.#exec<[boolean]>('turtle.compareUp()');
    }

    /**
     * Detects whether or not the block below the turtle
     * is the same as the one in the currently selected slot
     */
    async compareDown(): Promise<[boolean]> {
        return await this.#exec<[boolean]>('turtle.compareDown()');
    }

    /**
     * Detects whether or not the item in the specified slot is the
     * same as the item in the currently selected slot
     *
     * @param {number} slot
     */
    async compareTo(slot: number): Promise<[boolean]> {
        return await this.#exec<[boolean]>(`turtle.compareTo(${slot})`);
    }

    /**
     * Attack the entity in front of the turtle.
     */
    async attack(): Promise<[true, undefined] | [false, 'Nothing to attack here' | 'No tool to attack with']> {
        return await this.#exec<[true, undefined] | [false, 'Nothing to attack here' | 'No tool to attack with']>(
            `turtle.attack()`
        );
    }

    /**
     * Attack the entity above the turtle.
     */
    async attackUp(): Promise<[true, undefined] | [false, 'Nothing to attack here' | 'No tool to attack with']> {
        return await this.#exec<[true, undefined] | [false, 'Nothing to attack here' | 'No tool to attack with']>(
            `turtle.attackUp()`
        );
    }

    /**
     * Attack the entity below the turtle.
     */
    async attackDown(): Promise<[true, undefined] | [false, 'Nothing to attack here' | 'No tool to attack with']> {
        return await this.#exec<[true, undefined] | [false, 'Nothing to attack here' | 'No tool to attack with']>(
            `turtle.attackDown()`
        );
    }

    /**
     * Get the number of items in the given slot.
     *
     * @param {number} slot - The slot we wish to check. Defaults to the selected slot.
     */
    async getItemCount(slot = this.selectedSlot) {
        return await this.#exec(`turtle.getItemCount(${slot})`);
    }

    /**
     * Get the remaining number of items which may be stored in this stack.
     *
     * For instance, if a slot contains 13 blocks of dirt, it has room for another 51.
     *
     * @param {number} slot - The slot we wish to check. Defaults to the selected slot.
     */
    async getItemSpace(slot = this.selectedSlot) {
        return await this.#exec(`turtle.getItemSpace(${slot})`);
    }

    /**
     * Get the maximum amount of fuel this turtle currently holds.
     */
    async getFuelLevel(): Promise<[number]> {
        const [updatedFuelLevel] = await this.#exec<[number | string]>('turtle.getFuelLevel()');
        this.fuelLevel = typeof updatedFuelLevel === 'string' ? Number.POSITIVE_INFINITY : updatedFuelLevel;
        return [this.fuelLevel];
    }

    /**
     * Set the label of this computer.
     */
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

    async updateAllAttachedPeripherals(peripherals: Peripherals): Promise<void> {
        let hasAnyPeripheralsToCheck = false;
        const {inventorySides, modemSides, peripheralHubSides} = Object.keys(peripherals).reduce(
            (acc, side) => {
                for (const type of peripherals[side].types) {
                    switch (type) {
                        case 'inventory':
                            acc.inventorySides.push(side);
                            hasAnyPeripheralsToCheck = true;
                            return acc;
                        case 'modem':
                            hasAnyPeripheralsToCheck = true;
                            acc.modemSides.push(side);
                            break;
                        case 'peripheral_hub':
                            hasAnyPeripheralsToCheck = true;
                            acc.peripheralHubSides.push(side);
                            break;
                        default:
                            break;
                    }
                }

                return acc;
            },
            {
                inventorySides: [] as string[],
                modemSides: [] as string[],
                peripheralHubSides: [] as string[],
            }
        );

        // There are no peripherals to check
        if (!hasAnyPeripheralsToCheck) return;

        // Ensures they're queued together
        const [updatedPeripherals] = await this.#exec<
            [{[key: string]: {data?: unknown}}]
        >(`(function(inventorySides, modemSides, peripheralHubSides)
            local peripherals = {}
            local functions = {}
            local fIndex = 1
            for i, side in pairs(inventorySides) do
                peripherals[side] = {data = {}}
                functions[fIndex] = (function() peripherals[side]["data"]["size"] = peripheral.call(side, "size") end)
                fIndex = fIndex + 1
                functions[fIndex] = (function() peripherals[side]["data"]["content"] = (function(list) return next(list) == nil and textutils.json_null or list end)(peripheral.call(side, "list")) end)
                fIndex = fIndex + 1
            end

            for i, side in pairs(modemSides) do
                peripherals[side] = {data = {}}
                functions[fIndex] = (function() peripherals[side]["data"]["isWireless"] = peripheral.call(side, "isWireless") end)
                fIndex = fIndex + 1
            end

            for i, side in pairs(peripheralHubSides) do
                peripherals[side] = {data = {}}
                functions[fIndex] = (function() sleep(0.08) peripherals[side]["data"]["localName"] = peripheral.call(side, "getNameLocal") end)
                fIndex = fIndex + 1
                functions[fIndex] = (function() peripherals[side]["data"]["remoteNames"] = peripheral.call(side, "getNamesRemote") end)
                fIndex = fIndex + 1
            end

            parallel.waitForAll(table.unpack(functions))
            return peripherals
        end)({${inventorySides.map((side) => `"${side}"`).join(',')}}, {${modemSides
            .map((side) => `"${side}"`)
            .join(',')}}, {${peripheralHubSides.map((side) => `"${side}"`).join(',')}})`);

        const newPeripherals = {
            ...this.peripherals,
        };
        const sides = Object.keys(updatedPeripherals);
        for (const side of sides) {
            newPeripherals[side].data = updatedPeripherals[side].data;
        }

        this.peripherals = newPeripherals;
    }

    async connectToInventory(side: string): Promise<void> {
        // Ensures they're queued together
        const [[size], [content]] = await Promise.all([
            this.usePeripheralWithSide<[number]>(side, 'size'),
            this.#exec<[Inventory | null]>(
                `(function(list) return next(list) == nil and textutils.json_null or list end)(peripheral.call("${side}", "list"))`
            ),
        ]);

        const newPeripherals = {
            ...this.peripherals,
            [side]: {
                ...this.peripherals[side],
                data: {
                    size,
                    content,
                },
            },
        };

        this.peripherals = newPeripherals;
    }

    #exec<R>(f: string): Promise<R> {
        return this.#execRaw(`return ${f}`);
    }

    #execRaw<R>(f: string): Promise<R> {
        const uuid = uuid4();
        this.lastPromise = new Promise<R>((resolve, reject) =>
            this.lastPromise
                .catch(() => {})
                .finally(() => {
                    const listener = (obj: {type: string; message: R}) => {
                        if (obj.type === 'ERROR') {
                            this.turtleEventEmitter.off(uuid, listener);
                            return reject(obj.message);
                        } else if (obj.type !== 'EVAL') {
                            return reject(
                                `Unknown response type "${obj.type}" from turtle with message "${obj.message}"`
                            );
                        }

                        this.turtleEventEmitter.off(uuid, listener);
                        return resolve(obj.message);
                    };
                    this.turtleEventEmitter.on(uuid, listener);
                    this.ws.send(JSON.stringify({type: 'EVAL', uuid, function: f}));
                })
        );

        return this.lastPromise as Promise<R>;
    }
}

export const getOnlineTurtles = () => {
    const servers = connectedTurtlesMap.values();
    const turtles: Turtle[] = [];
    for (const server of servers) {
        turtles.push(...server.values());
    }

    return turtles;
};
export const getOnlineTurtleById = (serverId: number, id: number) => {
    const server = connectedTurtlesMap.get(serverId);
    if (server === undefined) return undefined;
    return server.get(id);
};
