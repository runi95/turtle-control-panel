import {useCallback, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Navbar, Nav} from 'react-bootstrap';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Turtle from './components/turtle/Turtle';
import useWebSocket, {ReadyState} from 'react-use-websocket';

export enum Direction {
    West = 1,
    North = 2,
    East = 3,
    South = 4,
}

export interface Inventory {
    [key: number]: ItemDetail | undefined;
}

export interface BaseState {
    id: number;
    error?: string;
    name: string;
    [key: string]: unknown;
}

export interface Location {
    x: number;
    y: number;
    z: number;
}

export interface Enchantment {
    level: number;
    name: string;
    displayName: string;
}

export interface ItemDetail {
    enchantments?: Enchantment[];
    durability: number;
    maxDamage: number;
    damage: number;
    nbt: string;
    name: string;
    tags: {
        [key: string]: string;
    };
    count: number;
    maxCount: string;
    displayName: string;
}

export interface BlockState {
    [key: string]: string;
}

export interface BlockTags {
    [key: string]: string;
}

export interface Turtle {
    serverId: number;
    id: number;
    name: string;
    isOnline: boolean;
    fuelLevel: number;
    fuelLimit: number;
    selectedSlot: number;
    inventory: Inventory;
    stepsSinceLastRecharge: number;
    state?: BaseState;
    location: Location;
    direction: Direction;
}

export interface Turtles {
    [key: string]: Turtle;
}

export interface Block {
    state: BlockState;
    name: string;
    tags: BlockTags;
    x: number;
    y: number;
    z: number;
}

export interface Blocks {
    [key: string]: Block;
}

export interface Area {
    id: number;
    color: string;
    area: Location[];
}

export interface Areas {
    [key: string]: Area;
}

export interface Server {
    id: number;
    name?: string;
    remoteAddress: string;
    turtles: Turtles;
    blocks: Blocks;
    areas: Areas;
}

export interface Servers {
    [key: string]: Server;
}

export interface ActionMessage {
    type: 'HANDSHAKE' | 'ACTION' | 'AREA' | 'SERVER';
    action: string;
    data: {
        [key: string]: unknown;
    };
}

export type Action = (msg: ActionMessage) => void;

export interface Dashboard {
    id: number;
    name?: string;
    remoteAddress: string;
    turtles: Turtle[];
    blocks: Block[];
    areas: Area[];
}

export interface OnlineStatuses {
    serverId: number;
    id: number;
    onlineStatus: boolean;
}

const wssServerUrl = process.env.REACT_APP_WSS_SERVER_URL ?? 'ws://localhost:6868';

function App() {
    const navigate = useNavigate();
    const location = useLocation();

    // Public API that will echo messages sent to it back to the client
    const [servers, setServers] = useState<Servers>({});
    const {sendMessage, readyState} = useWebSocket(wssServerUrl, {
        onOpen: () => {
            console.info('[open] Connection established');
            sendMessage(JSON.stringify({type: 'HANDSHAKE'}));
            setTimeout(() => {
                if (location.pathname === '/') {
                    navigate('/dashboard');
                }
            }, 2500);
        },
        onMessage: (msg) => {
            const obj = JSON.parse(msg.data);
            switch (obj.type) {
                case 'HANDSHAKE':
                    setServers(
                        (obj.message.dashboard as Dashboard[]).reduce(
                            (acc: {[key: string]: Server}, server) => (
                                (acc[server.id.toString()] = {
                                    ...server,
                                    turtles: server.turtles.reduce(
                                        (acc, curr) => (
                                            (acc[curr.id] = {
                                                ...curr,
                                                isOnline: (obj.message.onlineStatuses as OnlineStatuses[]).some(
                                                    ({serverId, id}) => serverId === server.id && id === curr.id
                                                ),
                                            }),
                                            acc
                                        ),
                                        {} as {[key: string]: Turtle}
                                    ),
                                    areas: server.areas.reduce(
                                        (acc, curr) => ((acc[curr.id] = curr), acc),
                                        {} as {[key: string]: Area}
                                    ),
                                    blocks: server.blocks.reduce(
                                        (acc, curr) => ((acc[`${curr.x.toString()},${curr.y},${curr.z}`] = curr), acc),
                                        {} as {[key: string]: Block}
                                    ),
                                }),
                                acc
                            ),
                            {}
                        )
                    );
                    break;
                case 'TCONNECT':
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.serverId]: {
                            ...servers[obj.message.serverId],
                            turtles: {
                                ...servers[obj.message.serverId].turtles,
                                [obj.message.id]: obj.message.turtle,
                            },
                        },
                    }));
                    break;
                case 'TLOCATION':
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.serverId]: {
                            ...servers[obj.message.serverId],
                            turtles: {
                                ...servers[obj.message.serverId].turtles,
                                [obj.message.id]: {
                                    ...servers[obj.message.serverId].turtles[obj.message.id],
                                    location: obj.message.location,
                                    fuel_level: obj.message.fuel_level,
                                },
                            },
                        },
                    }));
                    break;
                case 'TDISCONNECT':
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.serverId]: {
                            ...servers[obj.message.serverId],
                            turtles: {
                                ...servers[obj.message.serverId].turtles,
                                [obj.message.id]: {
                                    ...servers[obj.message.serverId].turtles[obj.message.id],
                                    is_online: obj.message.is_online,
                                },
                            },
                        },
                    }));
                    break;
                case 'TUPDATE':
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.serverId]: {
                            ...servers[obj.message.serverId],
                            turtles: {
                                ...servers[obj.message.serverId].turtles,
                                [obj.message.id]: {
                                    ...servers[obj.message.serverId].turtles[obj.message.id],
                                    ...obj.message.data,
                                },
                            },
                        },
                    }));
                    break;
                case 'WINIT':
                    // TODO: Implement?
                    break;
                case 'WUPDATE':
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.serverId]: {
                            ...servers[obj.message.serverId],
                            blocks: {
                                ...servers[obj.message.serverId].blocks,
                                [`${obj.message.x},${obj.message.y},${obj.message.z}`]: obj.message.block,
                            },
                        },
                    }));
                    break;
                case 'WDELETE':
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.serverId]: {
                            ...servers[obj.message.serverId],
                            blocks: {
                                ...servers[obj.message.serverId].blocks,
                                [`${obj.message.x},${obj.message.y},${obj.message.z}`]: obj.message.block,
                            },
                        },
                    }));
                    break;
                case 'SUPDATE':
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.id]: {
                            ...servers[obj.message.id],
                            name: obj.message.name,
                        },
                    }));
                    break;
                default:
                    console.error('Could not parse websocket message', obj);
                    break;
            }
        },
        shouldReconnect: () => true,
    });
    const handleSendMessage = useCallback((msg: string) => sendMessage(msg), [sendMessage]);

    return (
        <Routes>
            <Route
                path='/'
                element={
                    <LandingPage
                        shouldFadeOut={readyState === ReadyState.OPEN}
                        isLoading={readyState === ReadyState.CONNECTING}
                        isConnected={readyState === ReadyState.OPEN}
                        message={
                            readyState === ReadyState.CLOSED
                                ? 'Failed to connect'
                                : readyState === ReadyState.OPEN
                                  ? 'Connected...'
                                  : ''
                        }
                    />
                }
            />
            <Route
                path='/dashboard'
                element={
                    <div>
                        <Navbar style={{backgroundColor: '#27293d'}} variant='dark'>
                            <Navbar.Brand
                                className='mr-auto'
                                style={{cursor: 'pointer'}}
                                onClick={() => navigate('/dashboard')}
                            >
                                <img
                                    alt='Logo'
                                    src='/logo.svg'
                                    width='32'
                                    height='32'
                                    className='d-inline-block align-top'
                                />{' '}
                                Dashboard
                            </Navbar.Brand>
                            {readyState !== ReadyState.OPEN && (
                                <Nav>
                                    <img
                                        className='blinking'
                                        alt='No signal'
                                        src='/nosignal.svg'
                                        width='32'
                                        height='32'
                                    />
                                </Nav>
                            )}
                        </Navbar>
                        <Dashboard
                            servers={servers}
                            action={(msg: ActionMessage) => {
                                handleSendMessage(JSON.stringify(msg));
                            }}
                        />
                    </div>
                }
            />
            <Route
                path='/servers/:serverId/turtles/:id'
                element={
                    <div>
                        <Navbar style={{backgroundColor: '#27293d'}} variant='dark'>
                            <Navbar.Brand
                                className='mr-auto'
                                style={{cursor: 'pointer'}}
                                onClick={() => navigate('/dashboard')}
                            >
                                <img
                                    alt='Logo'
                                    src='/logo.svg'
                                    width='32'
                                    height='32'
                                    className='d-inline-block align-top'
                                />{' '}
                                Dashboard
                            </Navbar.Brand>
                            {readyState !== ReadyState.OPEN && (
                                <Nav>
                                    <img
                                        className='blinking'
                                        alt='No signal'
                                        src='/nosignal.svg'
                                        width='32'
                                        height='32'
                                    />
                                </Nav>
                            )}
                        </Navbar>
                        <Turtle
                            servers={servers}
                            action={(msg: ActionMessage) => {
                                handleSendMessage(JSON.stringify(msg));
                            }}
                        />
                    </div>
                }
            />
        </Routes>
    );
}

export default App;
