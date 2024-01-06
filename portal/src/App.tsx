import {useCallback, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Navbar, Nav} from 'react-bootstrap';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Turtle from './components/turtle/Turtle';
import useWebSocket, {ReadyState} from 'react-use-websocket';
import {wssServerUrl} from './api';
import {BaseState, Location, Turtle as APITurtle} from './api/UseTurtle';
import {useQueryClient} from '@tanstack/react-query';

export interface BlockState {
    [key: string]: string;
}

export interface BlockTags {
    [key: string]: string;
}

export interface DashboardTurtle {
    serverId: number;
    id: number;
    name: string;
    isOnline: boolean;
    fuelLevel: number;
    fuelLimit: number;
    state?: BaseState;
    error: string | null;
}

export interface DashboardTurtles {
    [key: string]: DashboardTurtle;
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
    name: string;
    area: Location[];
}

export interface Areas {
    [key: string]: Area;
}

export interface Server {
    id: number;
    name?: string;
    remoteAddress: string;
    turtles: DashboardTurtles;
}

export interface Servers {
    [key: string]: Server;
}

export interface ActionMessage {
    type: 'HANDSHAKE' | 'ACTION' | 'AREA' | 'SERVER' | 'TURTLE';
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
    turtles: DashboardTurtle[];
}

export interface OnlineStatuses {
    serverId: number;
    id: number;
    isOnline: boolean;
}

function App() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Public API that will echo messages sent to it back to the client
    const [servers, setServers] = useState<Servers>({});
    const {sendMessage, readyState} = useWebSocket(`${wssServerUrl}/`, {
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
                                                    ({serverId, id, isOnline}) =>
                                                        serverId === server.id && id === curr.id && isOnline
                                                ),
                                            }),
                                            acc
                                        ),
                                        {} as {[key: string]: DashboardTurtle}
                                    ),
                                }),
                                acc
                            ),
                            {}
                        )
                    );
                    break;
                case 'TCONNECT':
                    queryClient.setQueryData(
                        ['turtles', obj.message.serverId.toString(), obj.message.id.toString()],
                        (oldData: APITurtle) => ({
                            ...oldData,
                            ...obj.message.turtle,
                        })
                    );
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
                case 'TDISCONNECT':
                    queryClient.invalidateQueries({
                        queryKey: ['turtles', obj.message.serverId.toString(), obj.message.id.toString()],
                    });
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
                    queryClient.setQueryData(
                        ['turtles', obj.message.serverId.toString(), obj.message.id.toString()],
                        (oldData: APITurtle) => ({
                            ...oldData,
                            ...obj.message.data,
                        })
                    );
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
                case 'TDELETE':
                    queryClient.invalidateQueries({
                        queryKey: ['turtles', obj.message.serverId.toString(), obj.message.id.toString()],
                    });
                    setServers((servers) => ({
                        ...servers,
                        [obj.message.serverId]: {
                            ...servers[obj.message.serverId],
                            turtles: Object.keys(servers[obj.message.serverId].turtles).reduce((acc, curr) => {
                                if (curr === obj.message.id.toString()) return acc;
                                acc[curr] = servers[obj.message.serverId].turtles[curr];
                                return acc;
                            }, {} as DashboardTurtles),
                        },
                    }));
                    break;
                case 'WINIT':
                    // TODO: Implement?
                    break;
                case 'WUPDATE':
                    break;
                case 'WDELETE':
                    break;
                case 'AUPDATE':
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
