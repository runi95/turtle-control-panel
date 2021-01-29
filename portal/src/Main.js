import { Component } from 'react';
import { Route, Router } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav } from 'react-bootstrap';
import { w3cwebsocket as W3CWebSocket } from 'websocket';
import history from './utils/history';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Turtle from './components/turtle/Turtle';

class Main extends Component {
    state = {
        socket: undefined,
        turtles: {},
        world: {},
        isLoading: true,
        isConnected: false,
        shouldFadeOut: false,
        message: '',
        attempts: 0,
    };

    tLocation(turtle) {
        const updatedTurtle = { ...this.state.turtles[turtle.id] };
        updatedTurtle.location = turtle.location;
        updatedTurtle.fuelLevel = turtle.fuelLevel;
        this.setState({ turtles: { ...this.state.turtles, [turtle.id]: updatedTurtle } });
    }

    tConnect(turtle) {
        this.setState({ turtles: { ...this.state.turtles, [turtle.id]: turtle } });
    }

    tDisconnect(id) {
        const turtles = { ...this.state.turtles };
        const turtle = { ...turtles[id] };
        turtle.isOnline = false;
        turtles[id] = turtle;
        this.setState({ turtles });
    }

    wUpdate(world) {
        this.setState({ world: { ...this.state.world, [`${world.x},${world.y},${world.z}`]: world.block } });
    }

    wDelete(world) {
        this.wUpdate(world);
    }

    connect() {
        this.setState({ isLoading: true, message: '' });
        const client = new W3CWebSocket('ws://localhost:6868');
        this.setState({ socket: client });
        client.onopen = () => {
            console.info('[open] Connection established');
            client.send(JSON.stringify({ type: 'HANDSHAKE' }));
            this.setState({ isLoading: false, isConnected: true, shouldFadeOut: true, attempts: 0, message: 'Connected...' });
            setTimeout(() => {
                if (history.location.pathname === '/') {
                    history.push('/dashboard');
                }
            }, 2500);
        };

        client.onmessage = (msg) => {
            const obj = JSON.parse(msg.data);
            // console.debug(obj);
            switch (obj.type) {
                case 'HANDSHAKE':
                    this.setState({ turtles: obj.message.turtles, world: obj.message.world, areas: obj.message.areas });
                    break;
                case 'TCONNECT':
                    this.tConnect(obj.message.turtle);
                    break;
                case 'TLOCATION':
                    this.tLocation(obj.message.turtle);
                    break;
                case 'TDISCONNECT':
                    this.tDisconnect(obj.message.id);
                    break;
                case 'WINIT':
                    this.wInit(obj.message.world);
                    break;
                case 'WUPDATE':
                    this.wUpdate(obj.message.world);
                    break;
                case 'WDELETE':
                    this.wDelete(obj.message.world);
                    break;
                default:
                    console.error('Could not parse websocket message', obj);
                    break;
            }
        };

        client.onclose = (e) => {
            if (e.wasClean) {
                console.info(`[close] Connection closed cleanly, code=${e.code} reason=${e.reason}`);
            } else {
                console.warn('[close] Connection died');
            }

            const attempts = this.state.attempts;
            this.setState({ isLoading: false, isConnected: false, message: 'Failed to connect', attempts: attempts + 1 });
            setTimeout(() => {
                this.connect();
            }, 1000 + 1000 * Math.pow(2, Math.min(attempts, 8)));
        };
    }

    componentDidMount() {
        this.connect();
    }

    render() {
        return (
            <div>
                <Router history={history}>
                    <Route
                        exact
                        path="/"
                        render={() => (
                            <LandingPage
                                shouldFadeOut={this.state.shouldFadeOut}
                                isLoading={this.state.isLoading}
                                isConnected={this.state.isConnected}
                                message={this.state.message}
                            />
                        )}
                    />
                    <Route
                        path="/dashboard"
                        render={() => (
                            <Navbar style={{ backgroundColor: '#27293d' }} variant="dark">
                                <Navbar.Brand className="mr-auto" style={{ cursor: 'pointer' }} onClick={() => history.push('/dashboard')}>
                                    <img alt="Logo" src="/logo.svg" width="32" height="32" className="d-inline-block align-top" /> Dashboard
                                </Navbar.Brand>
                                {!this.state.isConnected && (
                                    <Nav>
                                        <img className="blinking" alt="No signal" src="/nosignal.svg" width="32" height="32" />
                                    </Nav>
                                )}
                            </Navbar>
                        )}
                    />
                    <Route exact path="/dashboard" render={() => <Dashboard turtles={this.state.turtles} />} />
                    <Route
                        exact
                        path="/dashboard/:id"
                        render={(props) => (
                            <Turtle
                                selectedTurtle={props.match.params.id}
                                turtles={this.state.turtles}
                                world={this.state.world}
                                areas={this.state.areas}
                                action={(msg) => {
                                    this.state.socket.send(JSON.stringify(msg));
                                }}
                            />
                        )}
                    />
                </Router>
            </div>
        );
    }
}

export default Main;
