const {EventEmitter} = require('events');
const uuid4 = require('uuid4');
const nameList = require('../names.json');
const Turtle = require('./turtle');

module.exports = class TurtleWS extends EventEmitter {
    constructor(ws) {
        super();
        this.ws = ws;
        this.handshake();
    }

    handshake() {
        console.info('Initiating handshake...');
        const uuid = uuid4();
        const listener = (msg) => {
            const obj = JSON.parse(msg);
            if (obj.uuid !== uuid) {
                return;
            }

            if (obj.type === 'ERROR') {
                console.error(obj.message);
                return console.error(obj.message);
            }

            const {message} = obj;
            const {id, label, fuel, location, direction, selectedSlot, inventory} = message;
            this.ws.on('close', (code, message) => {
                console.info(`${id} has disconnected with code ${code} and message ${message.toString() || '<none>'}`);
                this.emit('disconnect', id);
            });

            const inventoryAsObject = Array.isArray(inventory) ? {} : inventory;
            const {level, limit} = fuel;
            console.info(`${label || 'Unnamed Turtle'} [${id}] has connected!`);
            let turtle = undefined;
            if (!label) {
                const name = nameList[Math.floor(Math.random() * (nameList.length - 1))];
                turtle = new Turtle(id, name, true, level, limit, location, direction, selectedSlot, inventoryAsObject);
                this.ws.send(JSON.stringify({type: 'RENAME', message: name}));
            } else {
                turtle = new Turtle(
                    id,
                    label,
                    true,
                    level,
                    limit,
                    location,
                    direction,
                    selectedSlot,
                    inventoryAsObject
                );
            }

            this.ws.off('message', listener);
            this.emit('handshake', turtle);
        };
        this.ws.on('message', listener);
        this.ws.send(JSON.stringify({type: 'HANDSHAKE', uuid}));
    }

    exec(f) {
        return this.execRaw(`return ${f}`);
    }

    execRaw(f) {
        const uuid = uuid4();
        return new Promise((resolve, reject) => {
            const listener = (msg) => {
                const obj = JSON.parse(msg);
                if (obj.uuid !== uuid) {
                    return;
                }

                if (obj.type === 'ERROR') {
                    console.error(obj.message);
                    return reject(obj.message);
                }

                if (obj.type !== 'EVAL') {
                    return reject(`Unknown response type "${obj.type}" from turtle with message "${obj.message}"`);
                }

                this.ws.off('message', listener);
                return resolve(obj.message);
            };
            this.ws.on('message', listener);
            this.ws.send(JSON.stringify({type: 'EVAL', uuid, function: f}));
        });
    }
};
