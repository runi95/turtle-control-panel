import { useCallback, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav } from 'react-bootstrap';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Turtle from './components/turtle/Turtle';
import useWebSocket, { ReadyState } from 'react-use-websocket';

function App() {
    const navigate = useNavigate();
    const location = useLocation()

    //Public API that will echo messages sent to it back to the client
    const [state, setState] = useState({
        turtles: {},
        world: {},
        areas: undefined,
    });
    const { sendMessage, readyState } = useWebSocket('ws://localhost:6868', {
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
                    setState({ turtles: obj.message.turtles, world: obj.message.world, areas: obj.message.areas });
                    break;
                case 'TCONNECT':
                    setState({ ...state, turtles: { ...state.turtles, [obj.message.turtle.id]: obj.message.turtle } });
                    break;
                case 'TLOCATION':
                    setState({
                        ...state,
                        turtles: {
                            ...this.state.turtles,
                            [obj.message.id]: {
                                ...state.turtles[obj.message.id],
                                location: obj.message.location,
                                fuelLevel: obj.message.fuelLevel
                            }
                        }
                    });
                    break;
                case 'TDISCONNECT':
                    setState({
                        ...state,
                        turtles: {
                            ...state.turtles,
                            [obj.message.id]: {
                                ...state.turtles[obj.message.id],
                                isOnline: false
                            }
                        }
                    });
                    break;
                case 'WINIT':
                    // TODO: Implement?
                    break;
                case 'WUPDATE':
                    setState({
                        ...state,
                        world: {
                            ...state.world,
                            [`${obj.message.x},${obj.message.y},${obj.message.z}`]: obj.message.block
                        }
                    });
                    break;
                case 'WDELETE':
                    setState({
                        ...state,
                        world: {
                            ...state.world,
                            [`${obj.message.x},${obj.message.y},${obj.message.z}`]: obj.message.block
                        }
                    });
                    break;
                default:
                    console.error('Could not parse websocket message', obj);
                    break;
            }
        }
    });
    const handleSendMessage = useCallback((msg) => sendMessage(msg), [sendMessage]);

    return (
        <Routes>
            <Route
                path="/"
                element={<LandingPage
                    shouldFadeOut={readyState === ReadyState.OPEN}
                    isLoading={readyState === ReadyState.CONNECTING}
                    isConnected={readyState === ReadyState.OPEN}
                    message={readyState === ReadyState.CLOSED ? 'Failed to connect' : readyState === ReadyState.OPEN ? 'Connected...' : ''}
                />}
            />
            <Route path="/dashboard" element={<div>
                <Navbar style={{ backgroundColor: '#27293d' }} variant="dark">
                        <Navbar.Brand className="mr-auto" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                            <img alt="Logo" src="/logo.svg" width="32" height="32" className="d-inline-block align-top" /> Dashboard
                        </Navbar.Brand>
                        {readyState !== ReadyState.OPEN && (
                            <Nav>
                                <img className="blinking" alt="No signal" src="/nosignal.svg" width="32" height="32" />
                            </Nav>
                        )}
                    </Navbar>
                    <Dashboard turtles={state.turtles} />
                </div>} />
            <Route
                path="/dashboard/:id"
                element={<div>
                    <Navbar style={{ backgroundColor: '#27293d' }} variant="dark">
                            <Navbar.Brand className="mr-auto" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                                <img alt="Logo" src="/logo.svg" width="32" height="32" className="d-inline-block align-top" /> Dashboard
                            </Navbar.Brand>
                            {readyState !== ReadyState.OPEN && (
                                <Nav>
                                    <img className="blinking" alt="No signal" src="/nosignal.svg" width="32" height="32" />
                                </Nav>
                            )}
                        </Navbar>
                        <Turtle
                            turtles={state.turtles}
                            world={state.world}
                            areas={state.areas}
                            action={(msg) => {
                                handleSendMessage(JSON.stringify(msg));
                            }}
                        />
                    </div>}
            />
        </Routes>
    );
}

export default App;
