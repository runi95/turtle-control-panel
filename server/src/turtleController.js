const Coordinates = require('./dlite/Coordinates');
const DStarLite = require('./dlite');
const worldDB = require('./db/worldDB');
const areasDB = require('./db/areasDB');
const {blockToFarmingDetailsMapObject, farmingSeedNames} = require('./helpers/farming');
const {getLocalCoordinatesForDirection} = require('./helpers/coordinates');
const globalEventEmitter = require('./globalEventEmitter');
const logger = require('./logger/server');

const turtleMap = new Map();

class TurtleController {
    #turtle;

    constructor(turtle) {
        this.#turtle = turtle;
    }

    async *ai() {
        while (true) {
            if (this.#turtle.state?.error) {
                yield;
                continue;
            }
            if (this.#turtle.state?.id === undefined) {
                if (this.#turtle.location === undefined) {
                    this.#turtle.state = {id: 5, name: 'locating'};
                } else if (
                    this.#turtle.fuelLevel < this.#turtle.fuelLimit * 0.1 ||
                    this.#turtle.stepsSinceLastRecharge >=
                        this.#turtle.fuelLimit - this.#turtle.fuelLevel + this.#turtle.fuelLimit * 0.1
                ) {
                    this.#turtle.state = {id: 1, name: 'refueling'};
                } else if (!this.#turtle.direction) {
                    this.#turtle.state = {id: 6, name: 'recalibrating'};
                }
            }

            const stateId = this.#turtle.state?.id;
            switch (stateId) {
                case 1:
                    await this.#moveAndRefuel();
                    break;
                case 2:
                    await this.#mine();
                    break;
                case 3:
                    await this.#moveTo(this.#turtle.state.x, this.#turtle.state.y, this.#turtle.state.z);
                    break;
                case 4:
                    await this.#farm();
                    break;
                case 5:
                    await this.#locate();
                    break;
                case 6:
                    await this.#recalibrate();
                    break;
                case 7:
                    await this.#refreshInventoryState();
                    break;
                case 8:
                    await this.#craft();
                    break;
                case 9:
                    await this.#drop();
                    break;
            }

            yield;
        }
    }

    #hasSpaceForItem(name, count = 1) {
        const inventoryEntries = Object.entries(this.#turtle.inventory);
        if (inventoryEntries.length < 16) return true;

        return (
            inventoryEntries.reduce((remainingCount, [_, item]) => {
                if (!item) return 0;
                if (item.name !== name) return remainingCount;
                if (!item.maxCount || !item.maxCount) return remainingCount;

                return remainingCount - (item.maxCount - item.count);
            }, count) <= 0
        );
    }

    async #refreshInventoryState() {
        await this.#turtle.refreshInventoryState();
        this.#turtle.state = this.#turtle.state?.nextState?.id === 7 ? undefined : this.#turtle.state?.nextState;
        globalEventEmitter.emit('tupdate', {
            id: this.#turtle.id,
            serverId: this.#turtle.serverId,
            data: {
                state: this.#turtle.state,
            },
        });
    }

    async #craft() {
        await this.#turtle.craft();
        this.#turtle.state = this.#turtle.state?.nextState?.id === 8 ? undefined : this.#turtle.state?.nextState;
    }

    async #drop() {
        await this.#turtle.drop();
        this.#turtle.state = this.#turtle.state?.nextState?.id === 9 ? undefined : this.#turtle.state?.nextState;
    }

    async #turnToDirection(direction) {
        const turn = (direction - this.#turtle.direction + 4) % 4;
        if (turn === 1) {
            await this.#turtle.turnRight();
        } else if (turn === 2) {
            await this.#turtle.turnLeft();
            await this.#turtle.turnLeft();
        } else if (turn === 3) {
            await this.#turtle.turnLeft();
        }
    }

    async #selectItemOfType(name) {
        const itemOfType = Object.entries(this.#turtle.inventory).find(([_, item]) => item?.name === name);
        if (itemOfType === undefined) return false;

        const [key] = itemOfType;
        await this.#turtle.select(key);
        return true;
    }

    async #sleep(ms) {
        await new Promise((resolve) => setTimeout(() => resolve(), ms));
    }

    async #mineToYLevel(mineTarget) {
        if (Number.isNaN(mineTarget)) {
            throw new Error('Invalid mine target');
        }

        const diffInYLevels = mineTarget - this.#turtle.location.y;
        if (diffInYLevels !== 0) {
            if (diffInYLevels < 0) {
                const [didDigDown, digDownMessage] = await this.#turtle.digDown();
                if (!didDigDown && digDownMessage !== 'Nothing to dig here') {
                    this.#turtle.error = digDownMessage;
                    return;
                }
                const [didSuckDown, suckDownMessage] = await this.#turtle.suckDown();
                if (!didSuckDown && suckDownMessage !== 'No items to take') {
                    this.#turtle.error = suckDownMessage;
                    return;
                }
                const [didMoveDown, moveDownMessage] = await this.#turtle.down();
                if (!didMoveDown) {
                    this.#turtle.error = moveDownMessage;
                    return;
                }
            } else if (diffInYLevels > 0) {
                const [didDigUp, digUpMessage] = await this.#turtle.digUp();
                if (!didDigUp && digUpMessage !== 'Nothing to dig here') {
                    this.#turtle.error = digUpMessage;
                    return;
                }
                const [didSuckUp, suckUpMessage] = await this.#turtle.suckUp();
                if (!didSuckUp && suckUpMessage !== 'No items to take') {
                    this.#turtle.error = suckUpMessage;
                    return;
                }
                const [didMoveUp, moveUpMessage] = await this.#turtle.up();
                if (!didMoveUp) {
                    this.#turtle.error = moveUpMessage;
                    return;
                }
            }
        } else {
            this.#turtle.state = undefined;
        }
    }

    async #mineInDirection(mineTarget) {
        switch (mineTarget) {
            case 'Up':
                await this.#turtle.digUp();
                await this.#turtle.suckUp();
                break;
            case 'Down':
                await this.#turtle.digDown();
                await this.#turtle.suckDown();
                break;
            case 'North':
            case 'East':
            case 'South':
            case 'West':
                await this.#turnToDirection({North: 2, East: 3, South: 4, West: 1}[mineTarget]);
                await this.#turtle.dig();
                await this.#turtle.suck();
                break;
            default:
                throw new Error('Invalid mine target');
        }

        this.#turtle.state = undefined;
    }

    async #mine() {
        const {mineType, mineTarget} = this.#turtle.state;
        if (mineType === 'direction') {
            return await this.#mineInDirection(mineTarget);
        }

        const item = await this.#turtle.getItemDetail(16);
        if (item !== undefined) {
            this.#turtle.error = 'Inventory is full';
            return;
        }

        if (mineType === 'ylevel') {
            return await this.#mineToYLevel(Number(mineTarget));
        } else if (mineType === 'area') {
            const currentIndex = this.#turtle.state.index || 0;
            const mineArea = await areasDB.getArea(this.#turtle.serverId, mineTarget);
            if (mineArea === undefined) {
                throw new Error('Given mining area does not exist');
            }

            const mineTargetArea = mineArea.area[currentIndex];
            await this.#moveToAndMineObstacles(mineTargetArea.x, mineTargetArea.y, mineTargetArea.z, mineArea.area);

            const newIndex = currentIndex + 1;
            if (newIndex < mineArea.area.length) {
                this.#turtle.state = {
                    ...this.#turtle.state,
                    index: newIndex,
                };
            } else {
                this.#turtle.state = undefined;
            }
        } else {
            throw new Error('Invalid mine type');
        }
    }

    async #moveAndRefuel() {
        // Turtle already has enough fuel (80% or above)
        const currentFuelLevel = this.#turtle.fuelLevel;
        if (currentFuelLevel > 0.8 * this.#turtle.fuelLimit) {
            this.#turtle.state = undefined;
            return;
        }

        // Attempt to refuel with whatever is currently in the inventory
        const currentlySelectedSlot = this.#turtle.selectedSlot;
        for (let i = 0; i < 15; i++) {
            await this.#turtle.select(((currentlySelectedSlot + i + 1) % 16) + 1);
            await this.#turtle.refuel();
        }

        // TODO: Attempt to locate a fuel station if possible

        // Refuel successful! (refuelled to 10% or above)
        if (this.#turtle.fuelLevel > this.#turtle.fuelLimit * 0.1) {
            this.#turtle.state = undefined;
            return;
        }

        // Failed to refuel, request help
        this.#turtle.error = 'Out of fuel';
    }

    async #farmBlock(seedTypeName) {
        const initialItemCount = Object.values(this.#turtle.inventory).reduce(
            (acc, curr) => acc + (curr?.count || 0),
            0
        );
        const [didDigDown] = await this.#turtle.digDown();
        if (didDigDown) {
            const currentItemCount = Object.values(this.#turtle.inventory).reduce(
                (acc, curr) => acc + (curr?.count || 0),
                0
            );
            if (currentItemCount === initialItemCount) {
                this.#turtle.error = 'Inventory is full';
                return;
            }

            const didSelectSeed = await this.#selectItemOfType(seedTypeName);
            if (didSelectSeed) {
                await this.#turtle.placeDown();
            }
        }
    }

    async #selectAnySeedInInventory() {
        const inventoryEntry = Object.entries(this.#turtle.inventory).find(([_, item]) =>
            farmingSeedNames.includes(item?.name)
        );
        if (inventoryEntry === undefined) return false;

        const [slot, seed] = inventoryEntry;
        const item = await this.#turtle.getItemDetail(slot);
        if (item?.name !== seed.name) return false;

        await this.#turtle.select(slot);
        return true;
    }

    async #farm(moveContinously = false) {
        const {areaId, currentAreaFarmIndex} = this.#turtle.state;
        const farmArea = await areasDB.getArea(this.#turtle.serverId, areaId);
        if (farmArea.area.length > 4 && this.#turtle.state.noopTiles >= farmArea.area.length) {
            const didSelect = await this.#selectAnySeedInInventory();
            if (!didSelect) {
                this.#turtle.error = 'No seeds in inventory';
                return;
            }

            this.#turtle.error = 'Nothing to farm in area';
            return;
        }

        await this.#moveTo(
            farmArea.area[currentAreaFarmIndex].x,
            farmArea.area[currentAreaFarmIndex].y + 1,
            farmArea.area[currentAreaFarmIndex].z
        );
        const block = await this.#turtle.inspectDown();

        // Sow if possible
        if (block === undefined) {
            await this.#turtle.digDown();

            const didSelect = await this.#selectAnySeedInInventory();
            if (didSelect) {
                const [didPlace] = await this.#turtle.placeDown();
                if (didPlace) {
                    this.#turtle.state = {
                        ...this.#turtle.state,
                        noopTiles: 0,
                    };
                } else {
                    this.#turtle.state = {
                        ...this.#turtle.state,
                        noopTiles: this.#turtle.state.noopTiles + 1,
                    };
                }
            } else {
                this.#turtle.state = {
                    ...this.#turtle.state,
                    noopTiles: this.#turtle.state.noopTiles + 1,
                };
            }

            this.#turtle.state = {
                ...this.#turtle.state,
                currentAreaFarmIndex: (currentAreaFarmIndex + 1) % farmArea.area.length,
            };
        } else {
            const farmingBlockToFarmingDetails = blockToFarmingDetailsMapObject[block.name];
            let shouldMoveForward = !farmingBlockToFarmingDetails;
            if (farmingBlockToFarmingDetails) {
                if (!this.#hasSpaceForItem(farmingBlockToFarmingDetails.harvest)) {
                    this.#turtle.error = 'Inventory is full';
                    return;
                }

                if (block.state.age === farmingBlockToFarmingDetails.maxAge) {
                    await this.#farmBlock(farmingBlockToFarmingDetails.seed);
                    shouldMoveForward = true;
                }
                if (this.#turtle.state.noopTiles !== 0) {
                    this.#turtle.state = {
                        ...this.#turtle.state,
                        noopTiles: 0,
                    };
                }
            } else {
                this.#turtle.state = {
                    ...this.#turtle.state,
                    noopTiles: this.#turtle.state.noopTiles + 1,
                };
            }

            if (moveContinously || shouldMoveForward) {
                this.#turtle.state = {
                    ...this.#turtle.state,
                    currentAreaFarmIndex: (currentAreaFarmIndex + 1) % farmArea.area.length,
                };
            }
        }
    }

    async #recalibrate() {
        const [hasModem] = await this.#turtle.hasPeripheralWithName('modem');
        if (!hasModem) {
            this.#turtle.error = 'No wireless modem attached';
            return;
        }

        let movedBackwards = false;
        const [didMoveForwards] = await this.#turtle.forward();
        if (!didMoveForwards) {
            movedBackwards = true;
            const [didMoveBackwards] = await this.#turtle.back();
            if (!didMoveBackwards) {
                movedBackwards = false;
                const [didTurnLeft] = await this.#turtle.turnLeft();
                if (!didTurnLeft) {
                    const [didTurnRight] = await this.#turtle.turnRight();
                    if (!didTurnRight) {
                        this.#turtle.error = 'Cannot move or turn around';
                        return;
                    }
                }
                const [didMoveForwards] = await this.#turtle.forward();
                if (!didMoveForwards) {
                    movedBackwards = true;
                    const [didMoveBackwards] = await this.#turtle.back();
                    if (!didMoveBackwards) {
                        this.#turtle.error = 'Stuck';
                        return;
                    }
                }
            }
        }

        const location = await this.#turtle.gpsLocate();
        const x = location?.[0];
        const y = location?.[1];
        const z = location?.[2];
        if (movedBackwards) {
            await this.#turtle.forward();
        } else {
            await this.#turtle.back();
        }

        if (x === undefined || y === undefined || z === undefined) {
            this.#turtle.error = 'Could not determine position';
            return;
        }

        let diff = [this.#turtle.location.x - x, this.#turtle.location.y - y, this.#turtle.location.z - z];
        if (!movedBackwards) {
            diff = [-diff[0], -diff[1], -diff[2]];
        }

        const direction = diff[0] + Math.abs(diff[0]) * 2 + diff[2] + Math.abs(diff[2]) * 3;
        this.#turtle.direction = direction;
        this.#turtle.state = undefined;
    }

    async #locate() {
        const [hasModem] = await this.#turtle.hasPeripheralWithName('modem');
        if (!hasModem) {
            this.#turtle.error = 'No wireless modem attached';
            return;
        }

        const location = await this.#turtle.gpsLocate();
        const x = location?.[0];
        const y = location?.[1];
        const z = location?.[2];
        if (x === undefined || y === undefined || z === undefined) {
            this.#turtle.error = 'Could not determine position';
            return;
        }

        this.#turtle.location = {x, y, z};
        this.#turtle.state = undefined;
    }

    async #digSuckItemAndMoveForward() {
        let hasNotMovedForward = true;
        let attempts = 0;
        while (hasNotMovedForward) {
            const [didDig, digMessage] = await this.#turtle.dig();
            if (!didDig) {
                if (attempts > 5) throw digMessage;
                attempts++;
                continue;
            }

            const [didMoveForward, forwardMessage] = await this.#turtle.forward();
            if (!didMoveForward) {
                if (attempts > 5) throw forwardMessage;
                attempts++;
                continue;
            }

            hasNotMovedForward = false;
        }
    }

    async #moveToAndMineObstacles(targetX, targetY, targetZ, minableBlocksWhitelist) {
        const mineableObstaclesMap = minableBlocksWhitelist.reduce((acc, curr) => {
            acc[`${curr.x},${curr.y},${curr.z}`] = true;
            return acc;
        }, {});

        let {x: px, y: py, z: pz} = this.#turtle.location;
        if (!(px === targetX && py === targetY && pz === targetZ)) {
            let moves = 0;
            const obstacles = [];
            const obstaclesHash = {};
            const env = {
                moveTo: async (s) => {
                    moves++;
                    px = s.x;
                    py = s.y;
                    pz = s.z;

                    const {x, y, z} = this.#turtle.location;
                    if (py - y > 0) {
                        const [didMoveUp] = await this.#turtle.up();
                        if (!didMoveUp) {
                            const upLocation = `${x},${y + 1},${z}`;
                            if (mineableObstaclesMap[upLocation]) {
                                await this.#turtle.digUp();
                                await this.#turtle.suckUp();
                                await this.#turtle.up();
                                return true;
                            } else {
                                obstaclesHash[upLocation] = true;
                                obstacles.push(new Coordinates(x, y + 1, z));
                                return false;
                            }
                        }
                    } else if (py - y < 0) {
                        const [didMoveDown] = await this.#turtle.down();
                        if (didMoveDown) {
                            return true;
                        }

                        const downLocation = `${x},${y - 1},${z}`;
                        if (mineableObstaclesMap[downLocation]) {
                            await this.#turtle.digDown();
                            await this.#turtle.suckDown();
                            const [didMoveDown] = await this.#turtle.down();
                            if (!didMoveDown) {
                                return false;
                            }
                            return true;
                        } else {
                            obstaclesHash[downLocation] = true;
                            obstacles.push(new Coordinates(x, y - 1, z));
                            return false;
                        }
                    } else {
                        const heading = {x: px - x, y: py - y, z: pz - z};
                        const direction = heading.x + Math.abs(heading.x) * 2 + (heading.z + Math.abs(heading.z) * 3);
                        await this.#turnToDirection(direction);

                        const [didMoveForwar] = await this.#turtle.forward();
                        if (didMoveForwar) return true;

                        const [xChange, zChange] = getLocalCoordinatesForDirection(this.#turtle.direction);
                        const forwardLocation = `${x + xChange},${y},${z + zChange}`;
                        if (mineableObstaclesMap[forwardLocation]) {
                            await this.#digSuckItemAndMoveForward();
                            return true;
                        } else {
                            obstaclesHash[forwardLocation] = true;
                            obstacles.push(new Coordinates(x + xChange, y, z + zChange));
                            return false;
                        }
                    }
                },
                getInitialObstacles: async () => {
                    const allBlocks = await worldDB.getBlocks(this.#turtle.serverId);
                    return Object.keys(allBlocks)
                        .filter((key) => !mineableObstaclesMap[key])
                        .map((key) => {
                            const keySplit = key.split(',');
                            return {
                                x: keySplit[0],
                                y: keySplit[1],
                                z: keySplit[2],
                            };
                        });
                },
                getObstaclesInVision: async () => {
                    const {x, y, z} = this.#turtle.location;
                    const coordinatesInFront = getLocalCoordinatesForDirection(this.#turtle.direction);
                    const inFrontX = x + coordinatesInFront[0];
                    const inFrontZ = z + coordinatesInFront[1];
                    const frontLocation = `${inFrontX},${y},${inFrontZ}`;
                    if (obstaclesHash[frontLocation] === undefined) {
                        if (await this.#turtle.inspect()) {
                            if (mineableObstaclesMap[frontLocation]) {
                                await this.#turtle.dig();
                                await this.#turtle.suck();
                            } else {
                                obstaclesHash[frontLocation] = true;
                                obstacles.push(new Coordinates(inFrontX, y, inFrontZ));
                            }
                        }
                    }

                    const upLocation = `${x},${y + 1},${z}`;
                    if (obstaclesHash[upLocation] === undefined) {
                        if (await this.#turtle.inspectUp()) {
                            if (mineableObstaclesMap[upLocation]) {
                                await this.#turtle.digUp();
                                await this.#turtle.suckUp();
                            } else {
                                obstaclesHash[upLocation] = true;
                                obstacles.push(new Coordinates(x, y + 1, z));
                            }
                        }
                    }

                    const downLocation = `${x},${y - 1},${z}`;
                    if (obstaclesHash[downLocation] === undefined) {
                        if (await this.#turtle.inspectDown()) {
                            if (mineableObstaclesMap[downLocation]) {
                                await this.#turtle.digDown();
                                await this.#turtle.suckDown();
                            } else {
                                obstaclesHash[downLocation] = true;
                                obstacles.push(new Coordinates(x, y - 1, z));
                            }
                        }
                    }

                    return obstacles;
                },
            };

            const dStarLite = new DStarLite();
            try {
                await dStarLite.runDStarLite(px, py, pz, targetX, targetY, targetZ, env);
                logger.debug(`Moves: ${moves}`);
            } catch (err) {
                logger.error(err);
            }
        }

        if (this.#turtle.state?.id === 3) {
            this.#turtle.state = undefined;
        }
    }

    async #moveTo(targetX, targetY, targetZ) {
        return await this.#moveToAndMineObstacles(targetX, targetY, targetZ, []);
    }
}

const runAll = async () => {
    await Promise.all(Array.from(turtleMap).map(([_, turtleController]) => turtleController.ai()?.next()));
    setTimeout(runAll, 1);
};

setTimeout(runAll, 1);

module.exports = {
    addTurtle: (turtle) => {
        if (!turtle?.id) return false;
        if (turtleMap.has(turtle.id)) return true;
        turtleMap.set(turtle.id, new TurtleController(turtle));
        return true;
    },
    removeTurtle: (turtle) => {
        return turtleMap.delete(turtle.id);
    },
};
