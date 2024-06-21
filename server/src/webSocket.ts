import http from 'http';
import {Server} from 'socket.io';
import type {Server as HTTPSServer} from 'https';
import type {Http2SecureServer, Http2Server} from 'http2';
import {addArea, deleteTurtle, getDashboard, renameServer, upsertChunk} from './db';
import {getOnlineTurtleById, getOnlineTurtles} from './entities/turtle';
import {TurtleRefuelingState} from './entities/states/refueling';
import {TurtleMiningState} from './entities/states/mining';
import {TurtleExtractionState} from './entities/states/extraction';
import {TurtleMoveState} from './entities/states/move';
import {TurtleFarmingState} from './entities/states/farming';
import {TurtleScanState} from './entities/states/scan';
import {ItemDetail, Turtle} from './db/turtle.type';
import {PriorityQueue} from './dlite/PriorityQueue';
import {TurtleGoHomeState} from './entities/states/gohome';
import {TurtleBuildingState} from './entities/states/building';
import Database from 'better-sqlite3';
import logger from './logger/server';
import globalEventEmitter from './globalEventEmitter';
import {Area} from './db/area.type';
import {Block} from './db/block.type';
import {TurtleExploringState} from './entities/states/explore';
import {TurtleInventoryDumpState} from './entities/states/inventory-dump';

declare type TServerInstance = http.Server | HTTPSServer | Http2SecureServer | Http2Server;
export const createWebSocketServer = (server: TServerInstance) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        console.log('Connected:', socket.id);
        socket.on('message', async (msg) => {
            try {
                switch (msg.type) {
                    case 'HANDSHAKE':
                        socket.send(
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
                        const turtle = getOnlineTurtleById(Number(msg.data.serverId), Number(msg.data.id));
                        if (turtle === undefined) {
                            logger.error(
                                `Attempted to [${msg.action}] on invalid server [${msg.data.serverId}] or invalid turtle [${msg.data.id}]`
                            );
                            return;
                        }

                        switch (msg.action) {
                            case 'refuel':
                                turtle.state = new TurtleRefuelingState(turtle);
                                break;
                            case 'mine':
                                turtle.state = new TurtleMiningState(turtle, {
                                    area: msg.data.area,
                                    isExcludeMode: msg.data.isExcludeMode,
                                    includeOrExcludeList: msg.data.includeOrExcludeList,
                                });
                                break;
                            case 'extract':
                                turtle.state = new TurtleExtractionState(turtle, {
                                    area: msg.data.area,
                                    isExcludeMode: msg.data.isExcludeMode,
                                    includeOrExcludeList: msg.data.includeOrExcludeList,
                                });
                                break;
                            case 'move':
                                turtle.state = new TurtleMoveState(turtle, {
                                    x: msg.data.x,
                                    y: msg.data.y,
                                    z: msg.data.z,
                                });
                                break;
                            case 'farm':
                                turtle.state = new TurtleFarmingState(turtle, {
                                    area: msg.data.area,
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
                                await turtle.select(msg.data.slot);
                                break;
                            case 'rename':
                                await turtle.rename(msg.data.newName);
                                break;
                            case 'update-location':
                                turtle.location = msg.data.location;
                                turtle.direction = msg.data.direction;
                                break;
                            case 'update-config':
                                turtle.location = msg.data.location;
                                turtle.direction = msg.data.direction;
                                turtle.home = msg.data.home;
                                await turtle.rename(msg.data.newName);
                                break;
                            case 'scan':
                                turtle.state = new TurtleScanState(turtle);
                                break;
                            case 'explore':
                                if (turtle.location == null) {
                                    throw new Error('Unable to explore without knowing turtle location');
                                } else {
                                    turtle.state = new TurtleExploringState(turtle, {
                                        startChunk: {
                                            x: Math.floor(turtle.location.x / 16),
                                            z: Math.floor(turtle.location.z / 16),
                                        },
                                    });
                                }
                                break;
                            case 'analyze':
                                const [hasGeoScanner] = await turtle.hasPeripheralWithName('geoScanner');
                                if (hasGeoScanner) {
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
                                } else {
                                    const [hasUltimateSensor] = await turtle.hasPeripheralWithName('ultimate_sensor');
                                    if (hasUltimateSensor) {
                                        const [analysis, analysisFailMessage] = await turtle.usePeripheralWithName<
                                            | [{oresDistribution: {[key: string]: number}; isSlime: boolean}, undefined]
                                            | [null, string]
                                        >('ultimate_sensor', 'inspect', '"chunk"');
                                        if (analysis !== null) {
                                            const chunk = turtle.chunk;
                                            if (chunk !== null) {
                                                const [x, z] = chunk;
                                                upsertChunk(turtle.serverId, x, z, analysis.oresDistribution);
                                            }
                                        }
                                    }
                                }
                                break;
                            case 'inventory-transfer':
                                await turtle.inventoryTransfer(msg.data.fromSlot, msg.data.toSlot, msg.data.count);
                                break;
                            case 'inventory-dump':
                                turtle.state = new TurtleInventoryDumpState(turtle);
                            case 'locate':
                                await turtle.gpsLocate();
                                break;
                            case 'connect-to-inventory':
                                await turtle.connectToInventory(msg.data.side);
                                break;
                            case 'inventory-push-items':
                                let fromSide = msg.data.fromSide;
                                let toSide = msg.data.toSide;

                                if (fromSide === '' && toSide === '') {
                                    await turtle.inventoryTransfer(msg.data.fromSlot, msg.data.toSlot, msg.data.count);
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

                                const [transferredItems] = fromTurtle
                                    ? await turtle.usePeripheralWithSide<[number]>(
                                          toSide,
                                          'pullItems',
                                          fromSide,
                                          msg.data.fromSlot,
                                          msg.data.count ?? null,
                                          msg.data.toSlot
                                      )
                                    : await turtle.usePeripheralWithSide<[number]>(
                                          fromSide,
                                          'pushItems',
                                          toSide,
                                          msg.data.fromSlot,
                                          msg.data.count ?? null,
                                          msg.data.toSlot
                                      );

                                if (transferredItems > 0) {
                                    if (msg.data.fromSide !== '') {
                                        await turtle.connectToInventory(msg.data.fromSide);
                                    }

                                    if (msg.data.fromSide !== msg.data.toSide && msg.data.toSide !== '') {
                                        await turtle.connectToInventory(msg.data.toSide);
                                    }
                                }
                                break;
                            case 'sort-inventory':
                                const {side} = msg.data;
                                const peripheral = turtle.peripherals[side];
                                if (!peripheral) break;

                                const {data} = peripheral;
                                const {content} = data as {content: (ItemDetail | null)[] | null};
                                if (content == null) break;

                                // Stack all items
                                const availableItemSpaces = new Map<string, number>();
                                let movedAnyItems = false;
                                for (let i = 0; i < content.length; i++) {
                                    const item = content[i];
                                    if (item == null) continue;
                                    if (item.count < Number(item.maxCount)) {
                                        const existingStack = availableItemSpaces.get(item.name);
                                        if (existingStack === undefined) {
                                            availableItemSpaces.set(item.name, i);
                                        } else {
                                            const [movedItems] = await turtle.usePeripheralWithSide<[number]>(
                                                side,
                                                'pushItems',
                                                side,
                                                i,
                                                null,
                                                existingStack
                                            );

                                            if (movedItems > 0) {
                                                movedAnyItems = true;
                                            }

                                            if (movedItems < item.count) {
                                                availableItemSpaces.set(item.name, i);
                                            }
                                        }
                                    }
                                }

                                if (movedAnyItems) {
                                    await turtle.updateAllAttachedPeripherals({
                                        [side]: peripheral,
                                    });
                                    await turtle.sleep(0.1);
                                }

                                const compareItems = (a: ItemDetail, b: ItemDetail) => {
                                    if (a.name > b.name) {
                                        return 1;
                                    }

                                    if (a.name < b.name) {
                                        return -1;
                                    }

                                    return 0;
                                };
                                const sortingQueue = new PriorityQueue<ItemDetail>(compareItems);
                                const updatedPeripheral = turtle.peripherals[side];
                                if (!peripheral) break;

                                const {data: updatedData} = updatedPeripheral;
                                const {content: updatedContent, size} = updatedData as {
                                    content: (ItemDetail | null)[] | null;
                                    size: number;
                                };
                                if (updatedContent == null) break;

                                for (let i = 0; i < updatedContent.length; i++) {
                                    const item = updatedContent[i];
                                    if (item == null) continue;

                                    sortingQueue.add(item);
                                }

                                // Sort items...
                                let item: ItemDetail | null = null;
                                let currentSortIndex = 1;
                                while ((item = sortingQueue.poll()) !== null) {
                                    const itemIndex = updatedContent.findIndex(
                                        (contentItem, i) =>
                                            i + 2 > currentSortIndex &&
                                            contentItem !== null &&
                                            contentItem.name === (item as ItemDetail).name
                                    );
                                    if (!(itemIndex > -1)) continue;

                                    if (itemIndex + 1 === currentSortIndex) {
                                        currentSortIndex++;
                                        continue;
                                    }

                                    const itemInSlot = updatedContent[currentSortIndex - 1];
                                    if (itemInSlot != null) {
                                        if (itemInSlot.name === item.name) {
                                            currentSortIndex++;
                                            continue;
                                        }

                                        let availableSlot = -1;
                                        for (let i = 0; i < size; i++) {
                                            if (updatedContent[i] == null) {
                                                availableSlot = i + 1;
                                                break;
                                            }
                                        }

                                        if (!(availableSlot > -1)) {
                                            break;
                                        } else if (availableSlot !== currentSortIndex) {
                                            const [movedItems] = await turtle.usePeripheralWithSide<[number]>(
                                                side,
                                                'pushItems',
                                                side,
                                                currentSortIndex,
                                                null,
                                                availableSlot
                                            );
                                            if (!(movedItems > 0)) break;
                                            updatedContent[availableSlot - 1] = updatedContent[currentSortIndex - 1];
                                            updatedContent[currentSortIndex - 1] = null;
                                        }
                                    }

                                    const [movedItems] = await turtle.usePeripheralWithSide<[number]>(
                                        side,
                                        'pushItems',
                                        side,
                                        itemIndex + 1,
                                        null,
                                        currentSortIndex
                                    );
                                    if (!(movedItems > 0)) break;
                                    updatedContent[currentSortIndex - 1] = updatedContent[itemIndex];
                                    updatedContent[itemIndex] = null;

                                    currentSortIndex++;
                                }

                                (turtle.peripherals[side].data as {content: (ItemDetail | null)[]}).content =
                                    updatedContent;
                                globalEventEmitter.emit('tupdate', {
                                    id: turtle.id,
                                    serverId: turtle.serverId,
                                    data: {
                                        peripherals: turtle.peripherals,
                                    },
                                });
                                break;
                            case 'set-home':
                                if (turtle.location !== null) {
                                    turtle.home = {
                                        ...turtle.location,
                                    };
                                }
                                break;
                            case 'go-home':
                                turtle.state = new TurtleGoHomeState(turtle);
                                break;
                            case 'build':
                                turtle.state = new TurtleBuildingState(turtle, {
                                    blocks: msg.data.blocks,
                                });
                                break;
                            case 'equip':
                                switch (msg.data.side) {
                                    case 'left':
                                        await turtle.equipLeft();
                                        break;
                                    case 'right':
                                        await turtle.equipRight();
                                        break;
                                }
                                break;
                            case 'use-peripheral':
                                if (msg.data.side == null) {
                                    throw new Error('Cannot call use-peripheral without a <side>');
                                }

                                if (msg.data.method == null) {
                                    throw new Error('Cannot call use-peripheral without a <method>');
                                }

                                await turtle.usePeripheralWithSide(
                                    msg.data.side,
                                    msg.data.method,
                                    ...(msg.data.args ?? [])
                                );
                                break;
                            case 'drive-create-file':
                                await turtle.writeToFile(msg.data.file, msg.data.content);
                                break;
                            case 'suck':
                                await turtle.suck();
                                break;
                            default:
                                logger.error(`Invalid action [${msg.action}] attempted on turtle [${msg.data.id}]`);
                                break;
                        }
                        break;
                    case 'AREA':
                        switch (msg.action) {
                            case 'create':
                                const runResult: Database.RunResult = addArea(
                                    msg.data.serverId,
                                    msg.data.name,
                                    msg.data.color,
                                    msg.data.area
                                );
                                globalEventEmitter.emit('aupdate', {
                                    serverId: msg.data.serverId,
                                    data: {
                                        ...msg.data,
                                        id: runResult.lastInsertRowid,
                                    },
                                });
                                break;
                            default:
                                logger.warning(`Received invalid AREA action [${msg.action}]`);
                                break;
                        }
                        break;
                    case 'SERVER':
                        switch (msg.action) {
                            case 'rename':
                                renameServer(msg.data.id, msg.data.newName);
                                globalEventEmitter.emit('supdate', {id: msg.data.id, name: msg.data.newName});
                                break;
                            default:
                                logger.warning(`Received invalid SERVER action [${msg.action}]`);
                                break;
                        }
                        break;
                    case 'TURTLE':
                        switch (msg.action) {
                            case 'delete':
                                const turtle = getOnlineTurtleById(msg.data.serverId, msg.data.id);
                                if (turtle !== undefined) {
                                    turtle.state = null;
                                }

                                deleteTurtle(msg.data.serverId, msg.data.id);
                                globalEventEmitter.emit('tdelete', {
                                    serverId: msg.data.serverId,
                                    id: msg.data.id,
                                });

                                break;
                            default:
                                logger.warning(`Received invalid TURTLE action [${msg.action}]`);
                        }
                        break;
                    default:
                        logger.warning(`Received invalid message type [${msg.type}]`);
                        break;
                }
            } catch (err) {
                logger.error(err);
            }
        });

        const tconnect = (obj: {id: number; serverId: number; turtle: Turtle}) =>
            socket.send(JSON.stringify({type: 'TCONNECT', message: obj}));
        globalEventEmitter.on('tconnect', tconnect);
        const tdisconnect = (obj: {id: number; serverId: number}) =>
            socket.send(JSON.stringify({type: 'TDISCONNECT', message: obj}));
        globalEventEmitter.on('tdisconnect', tdisconnect);
        const tupdate = (obj: {id: number; serverId: number; data: Partial<Turtle>}) =>
            socket.send(JSON.stringify({type: 'TUPDATE', message: obj}));
        globalEventEmitter.on('tupdate', tupdate);
        const tdelete = (obj: {id: number; serverId: number}) =>
            socket.send(JSON.stringify({type: 'TDELETE', message: obj}));
        globalEventEmitter.on('tdelete', tdelete);
        const wupdate = (obj: {serverId: number; blocks: Block[]}) =>
            socket.send(JSON.stringify({type: 'WUPDATE', message: obj}));
        globalEventEmitter.on('wupdate', wupdate);
        const wdelete = (obj: {serverId: number; x: number; y: number; z: number}) =>
            socket.send(JSON.stringify({type: 'WDELETE', message: obj}));
        globalEventEmitter.on('wdelete', wdelete);
        const supdate = (obj: {id: number; name: string}) =>
            socket.send(JSON.stringify({type: 'SUPDATE', message: obj}));
        globalEventEmitter.on('supdate', supdate);
        const aupdate = (obj: {serverId: number; data: Partial<Area>}) =>
            socket.send(JSON.stringify({type: 'AUPDATE', message: obj}));
        globalEventEmitter.on('aupdate', aupdate);

        socket.on('close', () => {
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
};
