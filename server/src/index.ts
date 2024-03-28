import Fastify from 'fastify';
import fastifyCorsPlugin from '@fastify/cors';
import {getOnlineTurtleById, getOnlineTurtles} from './entities/turtle';
import logger from './logger/server';
import {getAreas, getBlocks, getBlocksSimple, getChunk, getDashboard, getTurtle, getTurtlesByServerId} from './db';
import {createWebSocketServer} from './webSocket';

logger.info('Starting server...');

const wssPort = process.env.WSS_PORT ? Number(process.env.WSS_PORT) : 6868;

const fastify = Fastify();
fastify
    .register(fastifyCorsPlugin, {
        origin: '*',
    })
    .then(() => {
        // Instantiates the WebSocket server
        createWebSocketServer(fastify.server);

        fastify.get('/servers', (_req, res) => {
            res.send({
                dashboard: getDashboard(),
                onlineStatuses: getOnlineTurtles().map((turtle) => ({
                    serverId: turtle.serverId,
                    id: turtle.id,
                    isOnline: turtle.isOnline,
                })),
            });
        });

        fastify.get('/servers/:id/blocks', (req, res) => {
            const {params, query} = req;
            const {id} = params as {id: string};
            const {fromX, toX, fromY, toY, fromZ, toZ, simple} = query as Record<string, string | undefined>;
            res.send(
                (simple != null ? getBlocksSimple : getBlocks )(Number(id), {
                    fromX: Number(fromX),
                    toX: Number(toX),
                    fromY: Number(fromY),
                    toY: Number(toY),
                    fromZ: Number(fromZ),
                    toZ: Number(toZ),
                })
            );
        });

        fastify.get('/servers/:id/areas', (req, res) => {
            const {params} = req;
            const {id} = params as {id: string};
            res.send(getAreas(Number(id)));
        });

        fastify.get('/servers/:id/chunks', (req, res) => {
            const {params, query} = req;
            const {id} = params as {id: string};
            const {x, z} = query as {x: string; z: string};
            res.send(getChunk(Number(id), Number(x), Number(z)));
        });

        fastify.get('/servers/:serverId/turtles', (req, res) => {
            const {params} = req;
            const {serverId} = params as {serverId: string};
            const turtles = getTurtlesByServerId(Number(serverId));
            res.send(turtles.map((turtle) => ({
                ...turtle,
                isOnline: getOnlineTurtleById(Number(serverId), turtle.id) == null
            })));
        });

        fastify.get('/servers/:serverId/turtles/:id', (req, res) => {
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

        fastify.listen(
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
