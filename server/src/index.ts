import {WebSocketServer} from 'ws';
import {getOnlineTurtleById, getOnlineTurtles} from './entities/turtle';
import globalEventEmitter from './globalEventEmitter';
import logger from './logger/server';
import {addArea, getDashboard, renameServer} from './db';
import {Turtle} from './db/turtle.type';
import {Block} from './db/block.type';

logger.info('Starting server...');

const wssPort = process.env.WSS_PORT ? Number(process.env.WSS_PORT) : 6868;
const wssWebsite = new WebSocketServer({port: wssPort});
wssWebsite.on('connection', (ws) => {
    ws.on('message', (msg: string) => {
        try {
            const obj = JSON.parse(msg);
            switch (obj.type) {
                case 'HANDSHAKE':
                    ws.send(
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
                            turtle.state = {id: 1, name: 'refueling'};
                            break;
                        case 'mine':
                            turtle.state = {
                                id: 2,
                                name: 'mining',
                                data: {
                                    mineType: obj.data.mineType,
                                    mineTarget: obj.data.mineTarget
                                },
                            };
                            break;
                        case 'move':
                            turtle.state = {
                                id: 3,
                                name: 'moving',
                                data: {
                                    x: obj.data.x,
                                    y: obj.data.y,
                                    z: obj.data.z,
                                }
                            };
                            break;
                        case 'farm':
                            turtle.state = {
                                id: 4,
                                name: 'farming',
                                data: {
                                    areaId: obj.data.areaId,
                                    currentAreaFarmIndex: 0,
                                    noopTiles: 0,
                                }
                            };
                            break;
                        case 'stop':
                            turtle.state = null;
                            break;
                        case 'refresh-inventory':
                            turtle.state = {
                                id: 7,
                                name: 'refreshing inventory',
                                data: {
                                    nextState: turtle.state,
                                }
                            };
                            break;
                        case 'craft':
                            turtle.state = {
                                id: 8,
                                name: 'craft',
                                data: {
                                    nextState: turtle.state?.id === 8 ? undefined : turtle.state,
                                }
                            };
                            break;
                        case 'drop':
                            turtle.state = {
                                id: 9,
                                name: 'drop',
                                data: {
                                    nextState: turtle.state,
                                }
                            };
                            break;
                        case 'select':
                            turtle.select(obj.data.slot + 1);
                            break;
                        case 'rename':
                            turtle.rename(obj.data.newName);
                            break;
                        case 'update-location':
                            turtle.location = obj.data.location;
                            turtle.direction = obj.data.direction;
                            break;
                        case 'scan':
                            turtle.state = {
                                id: 10,
                                name: 'scan',
                                data: {
                                    nextState: turtle.state
                                }
                            }
                            break;
                        default:
                            logger.error(`Invalid action [${obj.action}] attempted on turtle [${obj.data.id}]`);
                            break;
                    }
                    break;
                case 'AREA':
                    switch (obj.action) {
                        case 'create':
                            addArea(obj.data.serverId, obj.data.color, obj.data.area);
                            break;
                        default:
                            logger.warn(`Received invalid AREA action [${obj.action}]`);
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
                            logger.warn(`Received invalid SERVER action [${obj.action}]`);
                            break;
                    }
                    break;
                default:
                    logger.warn(`Received invalid message type [${obj.type}]`);
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
    }) => ws.send(JSON.stringify({type: 'TCONNECT', message: obj}));
    globalEventEmitter.on('tconnect', tconnect);
    const tdisconnect = (obj: {
        id: number;
        serverId: number;
    }) => ws.send(JSON.stringify({type: 'TDISCONNECT', message: obj}));
    globalEventEmitter.on('tdisconnect', tdisconnect);
    const tupdate = (obj: {
        id: number;
        serverId: number;
        data: Partial<Turtle>;
    }) => ws.send(JSON.stringify({type: 'TUPDATE', message: obj}));
    globalEventEmitter.on('tupdate', tupdate);
    const wupdate = (obj: {
        serverId: number;
        blocks: Block[];
    }) => ws.send(JSON.stringify({type: 'WUPDATE', message: obj}));
    globalEventEmitter.on('wupdate', wupdate);
    const wdelete = (obj: {
        serverId: number;
        x: number;
        y: number;
        z: number;
    }) => ws.send(JSON.stringify({type: 'WDELETE', message: obj}));
    globalEventEmitter.on('wdelete', wdelete);
    const supdate = (obj: {
        id: number;
        name: string;
    }) => ws.send(JSON.stringify({type: 'SUPDATE', message: obj}));
    globalEventEmitter.on('supdate', supdate);

    ws.on('close', () => {
        globalEventEmitter.off('tconnect', tconnect);
        globalEventEmitter.off('tdisconnect', tdisconnect);
        globalEventEmitter.off('tupdate', tupdate);
        globalEventEmitter.off('wupdate', wupdate);
        globalEventEmitter.off('wdelete', wdelete);
        globalEventEmitter.off('supdate', supdate);
    });
});

logger.info(`Portal WebSocket listening on port \x1b[36m${wssPort}\x1b[0m`);
