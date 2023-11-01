const ws = require('ws');
const readline = require('readline');
const TurtleWS = require('./entities/turtleWS');
const { EventEmitter } = require('events');
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
    const turtles = turtlesDB.getTurtles();
    Object.keys(turtles).forEach((key) => {
        turtlesDB.updateOnlineStatus(key, false);
    });
};

setAllTurtlesToOffline();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

const turtleAIList = [];
const wss = new ws.Server({ port: 5757 });
wss.on('connection', (ws) => {
    console.info('Incoming connection...');
    const websocketTurtle = new TurtleWS(ws);
    const handshake = async (turtleFromWS) => {
        const turtleFromDB = turtlesDB.getTurtle(turtleFromWS.id) || {};
        const {
            id,
            name = turtleFromDB.name,
            isOnline,
            fuelLevel,
            fuelLimit,
            location,
            direction,
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
            location,
            direction,
            selectedSlot,
            inventory,
            (stepsSinceLastRecharge || 0) + 1,
            state,
        );

        turtlesDB.addTurtle(turtle);
        updateEmitter.emit('update', 'tconnect', { turtle });
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
        updateEmitter.emit('tdisconnect', { id });
        websocketTurtle.off('disconnect', tDisconnect);
    };
    websocketTurtle.on('disconnect', tDisconnect);

    rl.on('line', (line) => {
        if (line === 'disconnect') {
            ws.send(JSON.stringify({ type: 'DISCONNECT' }));
        } else if (line === 'reboot') {
            ws.send(JSON.stringify({ type: 'REBOOT' }));
        } else {
            ws.send(JSON.stringify({ type: 'EVAL', function: `return ${line}` }));
        }
    });
});

const wssWebsite = new ws.Server({ port: 6868 });
wssWebsite.on('connection', (ws) => {
    ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        switch (obj.type) {
            case 'HANDSHAKE':
                ws.send(
                    JSON.stringify({
                        type: 'HANDSHAKE',
                        message: { turtles: turtlesDB.getTurtles(), world: worldDB.getAllBlocks(), areas: areasDB.getAreas() },
                    }),
                );
                break;
            case 'ACTION':
                const turtle = turtlesDB.getTurtle(obj.data.id);
                switch (obj.action) {
                    case 'refuel':
                        if (turtle !== undefined) {
                            turtlesDB.updateState(turtle.id, { id: 1, name: 'refueling', dropAllItems: true });
                        }
                        break;
                    case 'mine':
                        if (turtle !== undefined) {
                            turtlesDB.updateState(turtle.id, {
                                id: 2,
                                name: 'mining',
                                mineType: obj.data.mineType,
                                mineTarget: obj.data.mineTarget,
                            });
                        }
                        break;
                    case 'move':
                        if (turtle !== undefined) {
                            turtlesDB.updateState(turtle.id, { id: 3, name: 'moving', x: obj.data.x, y: obj.data.y, z: obj.data.z });
                        }
                        break;
                    case 'farm':
                        if (turtle !== undefined) {
                            turtlesDB.updateState(turtle.id, { id: 4, name: 'farming', areaId: obj.data.areaId, currentAreaFarmIndex: 0 });
                        }
                        break;
                    case 'stop':
                        if (turtle !== undefined) {
                            turtlesDB.updateState(turtle.id, undefined);
                        }
                        break;
                }
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
                ws.send(JSON.stringify({ type: 'TCONNECT', message: obj }));
                break;
            case 'tdisconnect':
                ws.send(JSON.stringify({ type: 'TDISCONNECT', message: obj }));
                break;
            case 'tlocation':
                ws.send(JSON.stringify({ type: 'TLOCATION', message: obj }));
                break;
            case 'wupdate':
                ws.send(JSON.stringify({ type: 'WUPDATE', message: obj }));
                break;
            case 'wdelete':
                ws.send(JSON.stringify({ type: 'WDELETE', message: obj }));
                break;
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

const aiIt = aiIterator();
const runAI = async () => {
    const ai = aiIt.next().value;
    if (ai !== undefined) {
        await ai.next();
    }
    setTimeout(() => runAI(), 1);
};

runAI();

console.info('Server started!');
