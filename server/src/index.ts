import Fastify from 'fastify';
import fastifyWebsocketPlugin from '@fastify/websocket';
import fastifyCorsPlugin from '@fastify/cors'
import {getOnlineTurtleById, getOnlineTurtles} from './entities/turtle';
import globalEventEmitter from './globalEventEmitter';
import logger from './logger/server';
import {addArea, deleteTurtle, getBlocks, getDashboard, renameServer} from './db';
import {Turtle} from './db/turtle.type';
import {Block} from './db/block.type';
import {TurtleFarmingState} from './entities/states/farming';
import {TurtleRefuelingState} from './entities/states/refueling';
import {TurtleMoveState} from './entities/states/move';
import {TurtleMiningState} from './entities/states/mining';
import {TurtleScanState} from './entities/states/scan';
import Database from 'better-sqlite3';
import {Area} from './db/area.type';

logger.info('Starting server...');

const wssPort = process.env.WSS_PORT ? Number(process.env.WSS_PORT) : 6868;

const server = Fastify();
server.register(fastifyCorsPlugin).register(fastifyWebsocketPlugin).then(() => {
    server.get('/servers/:id/blocks', (req, res) => {
        const {params, query} = req;
        const {id} = params as {id: string};
        const {fromX, toX, fromY, toY, fromZ, toZ} = query as Record<string, string | undefined>;
        res.send(getBlocks(Number(id), {
            fromX: Number(fromX),
            toX: Number(toX),
            fromY: Number(fromY),
            toY: Number(toY),
            fromZ: Number(fromZ),
            toZ: Number(toZ)
        }));
    });
    
    server.get('/', {websocket: true}, (connection, _req) => {
        connection.socket.on('message', (msg: string) => {
            try {
                const obj = JSON.parse(msg);
                switch (obj.type) {
                    case 'HANDSHAKE':
                        connection.socket.send(
                            JSON.stringify({
                                type: 'HANDSHAKE',
                                message: {
                                    dashboard: getDashboard(),
                                    onlineStatuses: Array.from(getOnlineTurtles()).map((turtle) => ({
                                        serverId: turtle.serverId,
                                        id: turtle.id,
                                        isOnline: turtle.isOnline,
                                    })),
                                },
                            })
                        );
                        break;
                    case 'ACTION':
                        const turtle = getOnlineTurtleById(obj.data.id);
                        if (turtle === undefined) {
                            logger.error(`Attempted to [${obj.action}] on invalid turtle [${obj.data.id}]`);
                            return;
                        }
    
                        switch (obj.action) {
                            case 'refuel':
                                turtle.state = new TurtleRefuelingState(turtle);
                                break;
                            case 'mine':
                                turtle.state = new TurtleMiningState(turtle, {
                                    areaId: Number(obj.data.mineTarget),
                                    currentAreaFarmIndex: 0
                                });
                                break;
                            case 'move':
                                turtle.state = new TurtleMoveState(turtle, {
                                    x: obj.data.x,
                                    y: obj.data.y,
                                    z: obj.data.z
                                });
                                break;
                            case 'farm':
                                turtle.state = new TurtleFarmingState(turtle, {
                                    areaId: Number(obj.data.areaId),
                                    currentAreaFarmIndex: 0
                                });
                                break;
                            case 'stop':
                                turtle.state = null;
                                break;
                            case 'refresh-inventory':
                                turtle.refreshInventoryState();
                                break;
                            case 'craft':
                                turtle.craft();
                                break;
                            case 'drop':
                                turtle.drop();
                                break;
                            case 'select':
                                turtle.select(obj.data.slot);
                                break;
                            case 'rename':
                                turtle.rename(obj.data.newName);
                                break;
                            case 'update-location':
                                turtle.location = obj.data.location;
                                turtle.direction = obj.data.direction;
                                break;
                            case 'scan':
                                turtle.state = new TurtleScanState(turtle);
                                break;
                            case 'inventory-transfer':
                                turtle.inventoryTransfer(obj.data.fromSlot, obj.data.toSlot);
                                break;
                            case 'locate':
                                turtle.gpsLocate();
                                break;
                            default:
                                logger.error(`Invalid action [${obj.action}] attempted on turtle [${obj.data.id}]`);
                                break;
                        }
                        break;
                    case 'AREA':
                        switch (obj.action) {
                            case 'create':
                                const runResult: Database.RunResult = addArea(obj.data.serverId, obj.data.name, obj.data.color, obj.data.area);
                                globalEventEmitter.emit('aupdate', {
                                    serverId: obj.data.serverId,
                                    data: {
                                        ...obj.data,
                                        id: runResult.lastInsertRowid
                                    }
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
                                const turtle = getOnlineTurtleById(obj.data.id);
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
    
        const tconnect = (obj: {
            id: number;
            serverId: number;
            turtle: Turtle;
        }) => connection.socket.send(JSON.stringify({type: 'TCONNECT', message: obj}));
        globalEventEmitter.on('tconnect', tconnect);
        const tdisconnect = (obj: {
            id: number;
            serverId: number;
        }) => connection.socket.send(JSON.stringify({type: 'TDISCONNECT', message: obj}));
        globalEventEmitter.on('tdisconnect', tdisconnect);
        const tupdate = (obj: {
            id: number;
            serverId: number;
            data: Partial<Turtle>;
        }) => connection.socket.send(JSON.stringify({type: 'TUPDATE', message: obj}));
        globalEventEmitter.on('tupdate', tupdate);
        const tdelete = (obj: {
            id: number;
            serverId: number;
        }) => connection.socket.send(JSON.stringify({type: 'TDELETE', message: obj}));
        globalEventEmitter.on('tdelete', tdelete);
        const wupdate = (obj: {
            serverId: number;
            blocks: Block[];
        }) => connection.socket.send(JSON.stringify({type: 'WUPDATE', message: obj}));
        globalEventEmitter.on('wupdate', wupdate);
        const wdelete = (obj: {
            serverId: number;
            x: number;
            y: number;
            z: number;
        }) => connection.socket.send(JSON.stringify({type: 'WDELETE', message: obj}));
        globalEventEmitter.on('wdelete', wdelete);
        const supdate = (obj: {
            id: number;
            name: string;
        }) => connection.socket.send(JSON.stringify({type: 'SUPDATE', message: obj}));
        globalEventEmitter.on('supdate', supdate);
        const aupdate = (obj: {
            serverId: number;
            data: Partial<Area>;
        }) => connection.socket.send(JSON.stringify({type: 'AUPDATE', message: obj}))
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
    
    server.listen({
        port: wssPort
    }, (err, address) => {
        if (err) {
            logger.error(err);
            process.exit(1);
        }
    
        logger.info(`Server listening to \x1b[36m${address}\x1b[0m`);
    }); 
});
