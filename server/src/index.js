const ws = require('ws');
const readline = require('readline');
const TurtleWS = require('./entities/turtleWS');
const {EventEmitter} = require('events');
const TurtlesDB = require('./db/turtlesDB');
const WorldDB = require('./db/worldDB');
const AreasDB = require('./db/areasDB');
const TurtleController = require('./turtleController');
const Turtle = require('./entities/turtle');

console.info('Starting up...');

const updateEmitter = new EventEmitter();
const turtlesDB = new TurtlesDB();
const worldDB = new WorldDB();
const areasDB = new AreasDB();

const setAllTurtlesToOffline = () => {
    turtlesDB.getTurtles().then((turtles) => {
        Object.keys(turtles).forEach((key) => {
            turtlesDB.updateOnlineStatus(key, false);
        });
    });
};

setAllTurtlesToOffline();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

const turtleAIList = [];
const wss = new ws.Server({port: 5757});
wss.on('connection', (ws) => {
    console.info('Incoming connection...');
    ws.on('error', (err) => {
        console.error(err);
    });
    const websocketTurtle = new TurtleWS(ws);
    const handshake = async (turtleFromWS) => {
        const turtleFromDB = (await turtlesDB.getTurtle(turtleFromWS.id)) || {};
        const {
            id,
            name = turtleFromDB.name,
            isOnline,
            fuelLevel,
            fuelLimit,
            selectedSlot,
            inventory,
            stepsSinceLastRecharge = turtleFromDB.stepsSinceLastRecharge,
            state = turtleFromDB.state,
        } = turtleFromWS;
        const turtle = new Turtle(
            id,
            name,
            isOnline,
            fuelLevel,
            fuelLimit,
            selectedSlot,
            inventory,
            (stepsSinceLastRecharge || 0) + 1,
            state,
            turtleFromDB.location,
            turtleFromDB.direction
        );

        turtlesDB.addTurtle(turtle);
        updateEmitter.emit('update', 'tconnect', {turtle});
        websocketTurtle.off('handshake', handshake);
        const turtleController = new TurtleController(turtlesDB, worldDB, areasDB, websocketTurtle, turtle);
        turtleController.on('update', (type, obj) => {
            updateEmitter.emit('update', type, obj);
        });

        turtleAIList.push(turtleController.ai());
    };
    websocketTurtle.on('handshake', handshake);

    const tDisconnect = (id) => {
        turtlesDB.updateOnlineStatus(id, false);
        updateEmitter.emit('tdisconnect', {id});
        websocketTurtle.off('disconnect', tDisconnect);
    };
    websocketTurtle.on('disconnect', tDisconnect);

    rl.on('line', (line) => {
        if (line === 'disconnect') {
            ws.send(JSON.stringify({type: 'DISCONNECT'}));
        } else if (line === 'reboot') {
            ws.send(JSON.stringify({type: 'REBOOT'}));
        } else {
            ws.send(JSON.stringify({type: 'EVAL', function: `return ${line}`}));
        }
    });
});

const wssWebsite = new ws.Server({port: 6868});
wssWebsite.on('connection', (ws) => {
    ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        switch (obj.type) {
            case 'HANDSHAKE':
                Promise.all([turtlesDB.getTurtles(), worldDB.getAllBlocks(), areasDB.getAreas()]).then(
                    ([turtles, world, areas]) => {
                        ws.send(
                            JSON.stringify({
                                type: 'HANDSHAKE',
                                message: {
                                    turtles,
                                    world,
                                    areas,
                                },
                            })
                        );
                    }
                );
                break;
            case 'ACTION':
                turtlesDB.getTurtle(obj.data.id).then((turtle) => {
                    if (turtle === undefined) {
                        console.error(`Attempted to [${obj.action}] invalid turtle [${obj.data.id}]`);
                        return;
                    }

                    switch (obj.action) {
                        case 'refuel':
                            turtlesDB.updateState(turtle.id, {id: 1, name: 'refueling'});
                            break;
                        case 'mine':
                            turtlesDB.updateState(turtle.id, {
                                id: 2,
                                name: 'mining',
                                mineType: obj.data.mineType,
                                mineTarget: obj.data.mineTarget,
                            });
                            break;
                        case 'move':
                            turtlesDB.updateState(turtle.id, {
                                id: 3,
                                name: 'moving',
                                x: obj.data.x,
                                y: obj.data.y,
                                z: obj.data.z,
                            });
                            break;
                        case 'farm':
                            turtlesDB.updateState(turtle.id, {
                                id: 4,
                                name: 'farming',
                                areaId: obj.data.areaId,
                                currentAreaFarmIndex: 0,
                                noopTiles: 0,
                            });
                            break;
                        case 'stop':
                            turtlesDB.updateState(turtle.id, undefined);
                            break;
                        case 'refresh-inventory':
                            turtlesDB.updateState(turtle.id, {
                                id: 7,
                                name: 'refreshing inventory',
                                nextState: turtle.state,
                            });
                            break;
                        case 'craft':
                            turtlesDB.updateState(turtle.id, {
                                id: 8,
                                name: 'craft',
                                nextState: turtle.state?.id === 8 ? undefined : turtle.state,
                            });
                            break;
                    }
                });
                break;
            case 'AREA':
                switch (obj.action) {
                    case 'create':
                        areasDB.addArea(obj.data);
                        break;
                }
                break;
        }
    });

    const update = (type, obj) => {
        switch (type) {
            case 'tconnect':
                return ws.send(JSON.stringify({type: 'TCONNECT', message: obj}));
            case 'tdisconnect':
                return ws.send(JSON.stringify({type: 'TDISCONNECT', message: obj}));
            case 'tlocation':
                return ws.send(JSON.stringify({type: 'TLOCATION', message: obj}));
            case 'tupdate':
                return ws.send(JSON.stringify({type: 'TUPDATE', message: obj}));
            case 'wupdate':
                return ws.send(JSON.stringify({type: 'WUPDATE', message: obj}));
            case 'wdelete':
                return ws.send(JSON.stringify({type: 'WDELETE', message: obj}));
        }
    };
    updateEmitter.on('update', update);

    ws.on('close', () => {
        updateEmitter.off('update', update);
    });
});

function* aiIterator() {
    let i = 0;
    while (true) {
        if (i >= turtleAIList.length) {
            i = 0;
        }

        if (turtleAIList.length > 0) {
            yield turtleAIList[i];
        } else {
            yield;
        }
        i++;
    }
}

const runAI = async () => {
    await Promise.all(turtleAIList.map((ai) => ai?.next()));

    setTimeout(runAI, 1);
};

runAI();

console.info('Server started!');
