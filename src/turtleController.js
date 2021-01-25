const { EventEmitter } = require('events');
const Coordinates = require('./dlite/coordinates');
const DStarLite = require('./dlite');

const getLocalCoordinatesForDirection = (direction) => {
    return [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
    ][direction - 1];
};

const mineshaftEntrance = { x: 467, y: 87, z: -587 };
const rechargeStation = { x: 455, y: 87, z: -597 };

module.exports = class TurtleController extends (
    EventEmitter
) {
    constructor(turtlesDB, worldDB, wsTurtle, turtle) {
        super();

        this.turtlesDB = turtlesDB;
        this.worldDB = worldDB;
        this.wsTurtle = wsTurtle;
        this.turtle = turtle;
    }

    /**
     * Get information about the block in front of the turtle
     */
    async inspect() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspect()');
        const { x, y, z } = this.turtle.location;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
        if (!didInspect) {
            this.worldDB.deleteBlock(x + xChange, y, z + zChange);
            this.emit('wdelete', x + xChange, y, z + zChange);
            return undefined;
        }

        this.worldDB.updateBlock(x + xChange, y, z + zChange, block);
        this.emit('wupdate', x + xChange, y, z + zChange, block);
        return block;
    }

    /**
     * Get information about the block above the turtle
     */
    async inspectUp() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspectUp()');
        const { x, y, z } = this.turtle.location;
        if (!didInspect) {
            this.worldDB.deleteBlock(x, y + 1, z);
            this.emit('wdelete', x, y + 1, z);
            return undefined;
        }

        this.worldDB.updateBlock(x, y + 1, z, block);
        this.emit('wupdate', x, y + 1, z, block);
        return block;
    }

    /**
     * Get information about the block below the turtle
     */
    async inspectDown() {
        const [didInspect, block] = await this.wsTurtle.exec('turtle.inspectDown()');
        const { x, y, z } = this.turtle.location;
        if (!didInspect) {
            this.worldDB.deleteBlock(x, y - 1, z);
            this.emit('wdelete', x, y - 1, z);
            return undefined;
        }

        this.worldDB.updateBlock(x, y - 1, z, block);
        this.emit('wupdate', x, y - 1, z, block);
        return block;
    }

    async turnLeft() {
        const [didTurn, err] = await this.wsTurtle.exec('turtle.turnLeft()');
        if (!didTurn) {
            throw new Error(err);
        }

        this.turtle.direction = ((this.turtle.direction + 2) % 4) + 1;
        this.turtlesDB.addTurtle(this.turtle);
    }

    async turnRight() {
        const [didTurn, err] = await this.wsTurtle.exec('turtle.turnRight()');
        if (!didTurn) {
            throw new Error(err);
        }

        this.turtle.direction = (this.turtle.direction % 4) + 1;
        this.turtlesDB.addTurtle(this.turtle);
    }

    async turnToDirection(direction) {
        const turn = (direction - this.turtle.direction + 4) % 4;
        if (turn === 1) {
            await this.turnRight();
        } else if (turn === 2) {
            await this.turnLeft();
            await this.turnLeft();
        } else if (turn === 3) {
            await this.turnLeft();
        }
    }

    async forward() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.forward()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        this.turtle.stepsSinceLastRecharge++;
        const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x: x + xChange, y, z: z + zChange };
        this.emit('location', this.turtle.id, this.turtle.location);
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('wdelete', this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
    }

    async back() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.back()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        this.turtle.stepsSinceLastRecharge++;
        const [xChange, zChange] = getLocalCoordinatesForDirection((((this.turtle.direction % 4) + 1) % 4) + 1);
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x: x + xChange, y, z: z + zChange };
        this.emit('location', this.turtle.id, this.turtle.location, this.turtle.fuelLevel);
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('wdelete', this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
    }

    async up() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.up()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        this.turtle.stepsSinceLastRecharge++;
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x, y: y + 1, z };
        this.emit('location', this.turtle.id, this.turtle.location, this.turtle.fuelLevel);
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('wdelete', this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
    }

    async down() {
        const [didMove, err] = await this.wsTurtle.exec('turtle.down()');
        if (!didMove) {
            throw new Error(err);
        }

        this.turtle.fuelLevel--;
        const { x, y, z } = this.turtle.location;
        this.turtle.location = { x, y: y - 1, z };
        this.emit('location', this.turtle.id, this.turtle.location, this.turtle.fuelLevel);
        this.turtlesDB.addTurtle(this.turtle);
        this.worldDB.deleteBlock(this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
        this.emit('wdelete', this.turtle.location.x, this.turtle.location.y, this.turtle.location.z);
    }

    async detect() {
        return (await this.wsTurtle.exec('turtle.detect()'))[0];
    }

    async detectUp() {
        return (await this.wsTurtle.exec('turtle.detectUp()'))[0];
    }

    async detectDown() {
        return (await this.wsTurtle.exec('turtle.detectDown()'))[0];
    }

    async dig() {
        return await this.wsTurtle.exec('turtle.dig()');
    }

    async digUp() {
        return await this.wsTurtle.exec('turtle.digUp()');
    }

    async digDown() {
        return await this.wsTurtle.exec('turtle.digDown()');
    }

    async place() {
        return await this.wsTurtle.exec('turtle.place()');
    }

    async placeUp() {
        return await this.wsTurtle.exec('turtle.placeUp()');
    }

    async placeDown() {
        return await this.wsTurtle.exec('turtle.placeDown()');
    }

    async drop() {
        return await this.wsTurtle.exec('turtle.drop()');
    }

    async dropUp() {
        return await this.wsTurtle.exec('turtle.dropUp()');
    }

    async dropDown() {
        return await this.wsTurtle.exec('turtle.dropDown()');
    }

    async select(slot = 1) {
        const result = await this.wsTurtle.exec(`turtle.select(${slot})`);
        this.turtle.selectedSlot = slot;
        return result;
    }

    async sleep(ms) {
        await new Promise((resolve) => setTimeout(() => resolve(), ms));
    }

    async getItemDetail(slot = this.turtle.selectedSlot) {
        return await this.wsTurtle.exec(`turtle.getItemDetail(${slot})`);
    }

    async mine() {
        const { x, y, z } = this.turtle.location;
        if ((await this.getItemDetail(16)).length !== undefined) {
            const currentDirection = this.turtle.direction;
            await this.moveTo(mineshaftEntrance.x, mineshaftEntrance.y, mineshaftEntrance.z);
            await this.moveTo(rechargeStation.x, rechargeStation.y, rechargeStation.z);
            await this.dropAllItems();
            await this.moveTo(mineshaftEntrance.x, mineshaftEntrance.y, mineshaftEntrance.z);
            await this.moveTo(x, y, z);
            await this.turnToDirection(currentDirection);
        }

        if (y > 13) {
            if (x === mineshaftEntrance.x && z === mineshaftEntrance.z) {
                await this.digDown();
                await this.down();
            } else {
                await this.moveTo(mineshaftEntrance.x, mineshaftEntrance.y, mineshaftEntrance.z);
            }
        } else {
            const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
            if (x + xChange < 495 - this.turtle.state.row && x + xChange > 448 && z + zChange < -561 && z + zChange > -608) {
                await this.digDown();
                await this.dig();
                await this.digUp();

                try {
                    await this.forward();
                } catch (err) {
                    let digAttempts = 0;
                    while (digAttempts < 10) {
                        if (await this.detect()) {
                            await this.dig();
                        } else {
                            await this.forward();
                            break;
                        }
                        digAttempts++;
                    }
                }
            } else {
                if (x + xChange >= 494 - this.turtle.state.row) {
                    if (z + zChange <= -607) {
                        await this.turnLeft();
                        await this.digDown();
                        await this.dig();
                        await this.digUp();
                        await this.forward();
                        await this.turnLeft();
                        this.turtle.state.row++;
                    } else if (z + zChange >= -562) {
                        await this.turnRight();
                        await this.digDown();
                        await this.dig();
                        await this.digUp();
                        await this.forward();
                        await this.turnRight();
                        this.turtle.state.row++;
                    }
                }
            }
        }
    }

    async refuel() {
        await this.wsTurtle.exec('turtle.refuel()');
        const [updatedFuelLevel] = await this.wsTurtle.exec('turtle.getFuelLevel()');
        this.turtle.fuelLevel = updatedFuelLevel;
        this.turtlesDB.addTurtle(this.turtle);
    }

    async suckUp(count) {
        return await this.wsTurtle.exec(`turtle.suckUp(${count})`);
    }

    async checkPeripheral() {
        const list = (
            await this.wsTurtle.execRaw(
                `local list = peripheral.wrap('front').list()\nlocal result = {}\nfor k, v in pairs(list) do result[tostring(k)] = list[k]end\nreturn result`,
            )
        )['0'];

        // 1 coal === 80 fuel
        if (list === undefined) {
            throw new Error('Failed to refuel');
        }

        const keys = Object.keys(list);
        for (let i = 0; i < keys.length; i++) {
            if (list[keys[i]].name === 'minecraft:coal') {
                console.log('Found coal!');
            }
        }
    }

    async getSelectedSlot() {
        const [selectedSlot] = await this.wsTurtle.exec('turtle.getSelectedSlot()');
        this.turtle.selectedSlot = selectedSlot;
        this.turtlesDB.addTurtle(this.turtle);
        return selectedSlot;
    }

    async dropAllItems() {
        const currentlySelectedSlot = await this.getSelectedSlot();
        for (let i = 1; i < 17; i++) {
            await this.select(i);
            await this.drop();
        }

        await this.select(currentlySelectedSlot);
    }

    async moveAndRefuel() {
        if (this.turtle.fuelLevel > 0.8 * this.turtle.fuelLimit) {
            this.turtle.state = undefined;
            this.turtlesDB.addTurtle(this.turtle);
            return;
        }

        await this.moveTo(rechargeStation.x, rechargeStation.y, rechargeStation.z);

        if (this.turtle.state.dropAllItems) {
            await this.dropAllItems();
        }

        await this.suckUp(Math.min((this.turtle.fuelLimit - this.turtle.fuelLevel) / 80, 64));
        await this.refuel();

        this.turtle.stepsSinceLastRecharge = 0;
    }

    async *ai() {
        while (true) {
            if (
                // this.turtle.fuelLevel < this.turtle.fuelLimit * 0.1 ||
                this.turtle.stepsSinceLastRecharge >=
                this.turtle.fuelLimit - this.turtle.fuelLevel + this.turtle.fuelLimit * 0.1
            ) {
                this.turtle.state = { id: 1, name: 'refueling', dropAllItems: true };
                this.turtlesDB.addTurtle(this.turtle);
            }

            const stateId = (this.turtle.state || {}).id;
            switch (stateId) {
                case 1:
                    await this.moveAndRefuel();
                    break;
                case 2:
                    await this.mine();
                    break;
                case 3:
                    await this.moveTo(this.turtle.state.x, this.turtle.state.y, this.turtle.state.z);
            }

            yield;
        }
    }

    async moveTo(targetX, targetY, targetZ) {
        let px = this.turtle.location.x;
        let py = this.turtle.location.y;
        let pz = this.turtle.location.z;
        if (px === targetX && py === targetY && pz === targetZ) {
            return;
        }

        let moves = 0;
        const obstacles = [];
        const obstaclesHash = {};
        const env = {
            moveTo: async (s) => {
                moves++;
                px = s.x;
                py = s.y;
                pz = s.z;

                const { x, y, z } = this.turtle.location;
                if (py - y > 0) {
                    try {
                        await this.up();
                        return true;
                    } catch (err) {
                        obstaclesHash[`${x},${y + 1},${z}`] = true;
                        obstacles.push(new Coordinates(x, y + 1, z));
                        return false;
                    }
                } else if (py - y < 0) {
                    try {
                        await this.down();
                        return true;
                    } catch (err) {
                        obstaclesHash[`${x},${y - 1},${z}`] = true;
                        obstacles.push(new Coordinates(x, y - 1, z));
                        return false;
                    }
                } else {
                    const heading = { x: px - x, y: py - y, z: pz - z };
                    const direction = heading.x + Math.abs(heading.x) * 2 + (heading.z + Math.abs(heading.z) * 3);
                    await this.turnToDirection(direction);
                    try {
                        await this.forward();
                        return true;
                    } catch (err) {
                        const [xChange, zChange] = getLocalCoordinatesForDirection(this.turtle.direction);
                        obstaclesHash[`${x + xChange},${y},${z + zChange}`] = true;
                        obstacles.push(new Coordinates(x + xChange, y, z + zChange));
                        return false;
                    }
                }
            },
            getInitialObstacles: async () => {
                const allBlocks = this.worldDB.getAllBlocks();
                return Object.keys(allBlocks).map((key) => {
                    const keySplit = key.split(',');
                    return {
                        x: keySplit[0],
                        y: keySplit[1],
                        z: keySplit[2],
                    };
                });
            },
            getObstaclesInVision: async () => {
                const { x, y, z } = this.turtle.location;
                const coordinatesInFront = getLocalCoordinatesForDirection(this.turtle.direction);
                const inFrontX = x + coordinatesInFront[0];
                const inFrontZ = z + coordinatesInFront[1];
                if (obstaclesHash[`${inFrontX},${y},${inFrontZ}`] === undefined) {
                    if (await this.inspect()) {
                        obstaclesHash[`${inFrontX},${y},${inFrontZ}`] = true;
                        obstacles.push(new Coordinates(inFrontX, y, inFrontZ));
                    }
                }

                if (obstaclesHash[`${x},${y + 1},${z}`] === undefined) {
                    if (await this.inspectUp()) {
                        obstaclesHash[`${x},${y + 1},${z}`] = true;
                        obstacles.push(new Coordinates(x, y + 1, z));
                    }
                }

                if (obstaclesHash[`${x},${y - 1},${z}`] === undefined) {
                    if (await this.inspectDown()) {
                        obstaclesHash[`${x},${y - 1},${z}`] = true;
                        obstacles.push(new Coordinates(x, y - 1, z));
                    }
                }

                return obstacles;
            },
        };

        const dStarLite = new DStarLite();
        await dStarLite.runDStarLite(px, py, pz, targetX, targetY, targetZ, env);
        console.log(`Moves: ${moves}`);
    }
};
