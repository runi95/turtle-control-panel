import {useCallback, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Navbar, Nav} from 'react-bootstrap';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Turtle from './components/turtle/Turtle';
import useWebSocket, {ReadyState} from 'react-use-websocket';

function App() {
    const navigate = useNavigate();
    const location = useLocation();

    //Public API that will echo messages sent to it back to the client
    const [servers, setServers] = useState({});
    const {sendMessage, readyState} = useWebSocket('ws://localhost:6868', {
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
                        obj.message.dashboard.reduce(
                            (acc, server) => (
                                (acc[server.id] = {
                                    ...server,
                                    turtles: server.turtles.reduce(
                                        (acc, curr) => (
                                            (acc[curr.id] = {
                                                ...curr,
                                                isOnline: obj.message.onlineStatuses.some(
                                                    ({serverId, id}) => serverId === server.id && id === curr.id
                                                ),
                                            }),
                                            acc
                                        ),
                                        {}
                                    ),
                                    areas: server.areas.reduce((acc, curr) => ((acc[curr.id] = curr), acc), {}),
                                    blocks: server.blocks.reduce(
                                        (acc, curr) => ((acc[`${curr.x},${curr.y},${curr.z}`] = curr), acc),
                                        {}
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
                default:
                    console.error('Could not parse websocket message', obj);
                    break;
            }
        },
        shouldReconnect: () => true,
    });
    const handleSendMessage = useCallback((msg) => sendMessage(msg), [sendMessage]);

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
                        <Dashboard servers={servers} />
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
                            action={(msg) => {
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
