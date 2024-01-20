import Fastify from 'fastify';
import fastifyWebsocketPlugin from '@fastify/websocket';
import fastifyCorsPlugin from '@fastify/cors';
import {getOnlineTurtleById, getOnlineTurtles} from './entities/turtle';
import globalEventEmitter from './globalEventEmitter';
import logger from './logger/server';
import {
    addArea,
    deleteTurtle,
    getAreas,
    getBlocks,
    getChunk,
    getDashboard,
    getTurtle,
    renameServer,
    upsertChunk,
} from './db';
import {Turtle} from './db/turtle.type';
import {Block} from './db/block.type';
import {TurtleFarmingState} from './entities/states/farming';
import {TurtleRefuelingState} from './entities/states/refueling';
import {TurtleMoveState} from './entities/states/move';
import {TurtleMiningState} from './entities/states/mining';
import {TurtleScanState} from './entities/states/scan';
import Database from 'better-sqlite3';
import {Area} from './db/area.type';
import {TurtleGoHomeState} from './entities/states/gohome';
import {TurtleExtractionState} from './entities/states/extraction';

logger.info('Starting server...');

const wssPort = process.env.WSS_PORT ? Number(process.env.WSS_PORT) : 6868;

const server = Fastify();
server
    .register(fastifyCorsPlugin)
    .register(fastifyWebsocketPlugin)
    .then(() => {
        server.get('/servers/:id/blocks', (req, res) => {
            const {params, query} = req;
            const {id} = params as {id: string};
            const {fromX, toX, fromY, toY, fromZ, toZ} = query as Record<string, string | undefined>;
            res.send(
                getBlocks(Number(id), {
                    fromX: Number(fromX),
                    toX: Number(toX),
                    fromY: Number(fromY),
                    toY: Number(toY),
                    fromZ: Number(fromZ),
                    toZ: Number(toZ),
                })
            );
        });

        server.get('/servers/:id/areas', (req, res) => {
            const {params} = req;
            const {id} = params as {id: string};
            res.send(getAreas(Number(id)));
        });

        server.get('/servers/:id/chunks', (req, res) => {
            const {params, query} = req;
            const {id} = params as {id: string};
            const {x, z} = query as {x: string; z: string};
            res.send(getChunk(Number(id), Number(x), Number(z)));
        });

        server.get('/servers/:serverId/turtles/:id', (req, res) => {
            const {params} = req;
            const {serverId, id} = params as {serverId: string; id: string};
            const turtle = getOnlineTurtleById(Number(serverId), Number(id));
            if (turtle !== undefined) {
                const {
                    name,
                    fuelLevel,
                    fuelLimit,
                    selectedSlot,
                    inventory,
                    stepsSinceLastRefuel,
                    state,
                    location,
                    direction,
                    peripherals,
                    home,
                    error,
                } = turtle;
                res.send({
                    serverId,
                    id,
                    name,
                    isOnline: true,
                    fuelLevel,
                    fuelLimit,
                    selectedSlot,
                    inventory,
                    stepsSinceLastRefuel,
                    state: state?.data ?? null,
                    location,
                    direction,
                    peripherals,
                    home,
                    error,
                });
                return;
            }

            const dbTurtle = getTurtle(Number(serverId), Number(id));
            if (dbTurtle === null) {
                res.callNotFound();
                return;
            }

            const {
                name,
                fuelLevel,
                fuelLimit,
                selectedSlot,
                inventory,
                stepsSinceLastRefuel,
                state,
                location,
                direction,
                home,
            } = dbTurtle;
            res.send({
                serverId,
                id,
                name,
                isOnline: false,
                fuelLevel,
                fuelLimit,
                selectedSlot,
                inventory,
                stepsSinceLastRefuel,
                state,
                location,
                direction,
                peripherals: null,
                home,
                error: null,
            });
        });

        server.get('/', {websocket: true}, (connection, _req) => {
            connection.socket.on('message', async (msg: string) => {
                try {
                    const obj = JSON.parse(msg);
                    switch (obj.type) {
                        case 'HANDSHAKE':
                            connection.socket.send(
                                JSON.stringify({
                                    type: 'HANDSHAKE',
                                    message: {
                                        dashboard: getDashboard(),
                                        onlineStatuses: getOnlineTurtles().map((turtle) => ({
                                            serverId: turtle.serverId,
                                            id: turtle.id,
                                            isOnline: turtle.isOnline,
                                        })),
                                    },
                                })
                            );
                            break;
                        case 'ACTION':
                            const turtle = getOnlineTurtleById(Number(obj.data.serverId), Number(obj.data.id));
                            if (turtle === undefined) {
                                logger.error(
                                    `Attempted to [${obj.action}] on invalid server [${obj.data.serverId}] or invalid turtle [${obj.data.id}]`
                                );
                                return;
                            }

                            switch (obj.action) {
                                case 'refuel':
                                    turtle.state = new TurtleRefuelingState(turtle);
                                    break;
                                case 'mine':
                                    turtle.state = new TurtleMiningState(turtle, {
                                        area: obj.data.area,
                                        fromYLevel: obj.data.fromYLevel,
                                        toYLevel: obj.data.toYLevel,
                                        isExcludeMode: obj.data.isExcludeMode,
                                        includeOrExcludeList: obj.data.includeOrExcludeList
                                    });
                                    break;
                                case 'extract':
                                    turtle.state = new TurtleExtractionState(turtle, {
                                        area: obj.data.area,
                                        fromYLevel: obj.data.fromYLevel,
                                        toYLevel: obj.data.toYLevel,
                                        isExcludeMode: obj.data.isExcludeMode,
                                        includeOrExcludeList: obj.data.includeOrExcludeList
                                    });
                                    break;
                                case 'move':
                                    turtle.state = new TurtleMoveState(turtle, {
                                        x: obj.data.x,
                                        y: obj.data.y,
                                        z: obj.data.z,
                                    });
                                    break;
                                case 'farm':
                                    turtle.state = new TurtleFarmingState(turtle, {
                                        areaId: Number(obj.data.areaId),
                                        currentAreaFarmIndex: 0,
                                    });
                                    break;
                                case 'stop':
                                    turtle.state = null;
                                    break;
                                case 'refresh-inventory':
                                    await turtle.refreshInventoryState();
                                    break;
                                case 'craft':
                                    await turtle.craft();
                                    break;
                                case 'drop':
                                    await turtle.drop();
                                    break;
                                case 'select':
                                    await turtle.select(obj.data.slot);
                                    break;
                                case 'rename':
                                    await turtle.rename(obj.data.newName);
                                    break;
                                case 'update-location':
                                    turtle.location = obj.data.location;
                                    turtle.direction = obj.data.direction;
                                    break;
                                case 'scan':
                                    turtle.state = new TurtleScanState(turtle);
                                    break;
                                case 'analyze':
                                    const [hasPeripheral] = await turtle.hasPeripheralWithName('geoScanner');
                                    if (hasPeripheral) {
                                        const [analysis, analysisFailMessage] = await turtle.usePeripheralWithName<
                                            [{[key: string]: number}, undefined] | [null, string]
                                        >('geoScanner', 'chunkAnalyze');
                                        if (analysis !== null) {
                                            const chunk = turtle.chunk;
                                            if (chunk !== null) {
                                                const [x, z] = chunk;
                                                upsertChunk(turtle.serverId, x, z, analysis);
                                            }
                                        }
                                    }
                                    break;
                                case 'inventory-transfer':
                                    await turtle.inventoryTransfer(obj.data.fromSlot, obj.data.toSlot);
                                    break;
                                case 'locate':
                                    await turtle.gpsLocate();
                                    break;
                                case 'connect-to-inventory':
                                    await turtle.connectToInventory(obj.data.side);
                                    break;
                                case 'inventory-push-items':
                                    let fromSide = obj.data.fromSide;
                                    let toSide = obj.data.toSide;

                                    if (fromSide === '' && toSide === '') {
                                        await turtle.inventoryTransfer(obj.data.fromSlot, obj.data.toSlot);
                                        break;
                                    }

                                    let fromTurtle = false;
                                    if (fromSide === '') {
                                        fromTurtle = true;
                                        const hub = Object.entries(turtle.peripherals).find(([_side, {types, data}]) => {
                                            if ((data as any)?.remoteNames === undefined) return false;
                                            if ((data as any)?.localName === undefined) return false;
                                            if (types.includes('peripheral_hub')) {
                                                return (data as {remoteNames: string[]}).remoteNames.includes(toSide);
                                            }
                                        });
                                        if (hub === undefined) {
                                            throw new Error(`Cannot inventory-push-items from <turtle> to [${toSide}]`);
                                        }

                                        const [_hubSide, {data}] = hub;
                                        fromSide = (data as {localName: string}).localName;
                                    }
                                    
                                    if (toSide === '') {
                                        const hub = Object.entries(turtle.peripherals).find(([_side, {types, data}]) => {
                                            if ((data as any)?.remoteNames === undefined) return false;
                                            if ((data as any)?.localName === undefined) return false;
                                            if (types.includes('peripheral_hub')) {
                                                return (data as {remoteNames: string[]}).remoteNames.includes(fromSide);
                                            }
                                        });
                                        if (hub === undefined) {
                                            throw new Error(`Cannot inventory-push-items from [${fromSide}] to <turtle>`);
                                        }

                                        const [_hubSide, {data}] = hub;
                                        toSide = (data as {localName: string}).localName;
                                    }

                                    const [transferredItems] = fromTurtle ? await turtle.usePeripheralWithSide<[number]>(
                                        toSide,
                                        'pullItems',
                                        fromSide,
                                        obj.data.fromSlot,
                                        null,
                                        obj.data.toSlot
                                    ) : await turtle.usePeripheralWithSide<[number]>(
                                        fromSide,
                                        'pushItems',
                                        toSide,
                                        obj.data.fromSlot,
                                        null,
                                        obj.data.toSlot
                                    );

                                    if (transferredItems > 0) {
                                        if (obj.data.fromSide !== '') {
                                            await turtle.connectToInventory(obj.data.fromSide);
                                        }

                                        if (obj.data.fromSide !== obj.data.toSide && obj.data.toSide !== '') {
                                            await turtle.connectToInventory(obj.data.toSide);
                                        }
                                    }
                                    break;
                                case 'set-home':
                                    if (turtle.location !== null) {
                                        turtle.home = {
                                            ...turtle.location
                                        };
                                    }
                                    break;
                                case 'go-home':
                                    turtle.state = new TurtleGoHomeState(turtle);
                                    break;
                                default:
                                    logger.error(`Invalid action [${obj.action}] attempted on turtle [${obj.data.id}]`);
                                    break;
                            }
                            break;
                        case 'AREA':
                            switch (obj.action) {
                                case 'create':
                                    const runResult: Database.RunResult = addArea(
                                        obj.data.serverId,
                                        obj.data.name,
                                        obj.data.color,
                                        obj.data.area
                                    );
                                    globalEventEmitter.emit('aupdate', {
                                        serverId: obj.data.serverId,
                                        data: {
                                            ...obj.data,
                                            id: runResult.lastInsertRowid,
                                        },
                                    });
                                    break;
                                default:
                                    logger.warning(`Received invalid AREA action [${obj.action}]`);
                                    break;
                            }
                            break;
                        case 'SERVER':
                            switch (obj.action) {
                                case 'rename':
                                    renameServer(obj.data.id, obj.data.newName);
                                    globalEventEmitter.emit('supdate', {id: obj.data.id, name: obj.data.newName});
                                    break;
                                default:
                                    logger.warning(`Received invalid SERVER action [${obj.action}]`);
                                    break;
                            }
                            break;
                        case 'TURTLE':
                            switch (obj.action) {
                                case 'delete':
                                    const turtle = getOnlineTurtleById(obj.data.serverId, obj.data.id);
                                    if (turtle !== undefined) {
                                        turtle.state = null;
                                    }

                                    deleteTurtle(obj.data.serverId, obj.data.id);
                                    globalEventEmitter.emit('tdelete', {
                                        serverId: obj.data.serverId,
                                        id: obj.data.id,
                                    });

                                    break;
                                default:
                                    logger.warning(`Received invalid TURTLE action [${obj.action}]`);
                            }
                            break;
                        default:
                            logger.warning(`Received invalid message type [${obj.type}]`);
                            break;
                    }
                } catch (err) {
                    logger.error(err);
                }
            });

            const tconnect = (obj: {id: number; serverId: number; turtle: Turtle}) =>
                connection.socket.send(JSON.stringify({type: 'TCONNECT', message: obj}));
            globalEventEmitter.on('tconnect', tconnect);
            const tdisconnect = (obj: {id: number; serverId: number}) =>
                connection.socket.send(JSON.stringify({type: 'TDISCONNECT', message: obj}));
            globalEventEmitter.on('tdisconnect', tdisconnect);
            const tupdate = (obj: {id: number; serverId: number; data: Partial<Turtle>}) =>
                connection.socket.send(JSON.stringify({type: 'TUPDATE', message: obj}));
            globalEventEmitter.on('tupdate', tupdate);
            const tdelete = (obj: {id: number; serverId: number}) =>
                connection.socket.send(JSON.stringify({type: 'TDELETE', message: obj}));
            globalEventEmitter.on('tdelete', tdelete);
            const wupdate = (obj: {serverId: number; blocks: Block[]}) =>
                connection.socket.send(JSON.stringify({type: 'WUPDATE', message: obj}));
            globalEventEmitter.on('wupdate', wupdate);
            const wdelete = (obj: {serverId: number; x: number; y: number; z: number}) =>
                connection.socket.send(JSON.stringify({type: 'WDELETE', message: obj}));
            globalEventEmitter.on('wdelete', wdelete);
            const supdate = (obj: {id: number; name: string}) =>
                connection.socket.send(JSON.stringify({type: 'SUPDATE', message: obj}));
            globalEventEmitter.on('supdate', supdate);
            const aupdate = (obj: {serverId: number; data: Partial<Area>}) =>
                connection.socket.send(JSON.stringify({type: 'AUPDATE', message: obj}));
            globalEventEmitter.on('aupdate', aupdate);

            connection.socket.on('close', () => {
                globalEventEmitter.off('tconnect', tconnect);
                globalEventEmitter.off('tdisconnect', tdisconnect);
                globalEventEmitter.off('tupdate', tupdate);
                globalEventEmitter.off('tdelete', tdelete);
                globalEventEmitter.off('wupdate', wupdate);
                globalEventEmitter.off('wdelete', wdelete);
                globalEventEmitter.off('supdate', supdate);
                globalEventEmitter.off('aupdate', aupdate);
            });
        });

        server.listen(
            {
                port: wssPort,
            },
            (err, address) => {
                if (err) {
                    logger.error(err);
                    process.exit(1);
                }

                logger.info(`Server listening to \x1b[36m${address}\x1b[0m`);
            }
        );
    });
