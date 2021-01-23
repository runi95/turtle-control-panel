import { Component } from 'react';
import { Route, HashRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar } from 'react-bootstrap';
import { w3cwebsocket as W3CWebSocket } from 'websocket';
import Dashboard from './components/Dashboard';
import Turtle from './components/Turtle';

const client = new W3CWebSocket('ws://localhost:6868');

class Main extends Component {
    state = {
        turtles: {},
        world: {},
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

    componentDidMount() {
        client.onopen = () => {
            console.info('[open] Connection established');
            client.send(JSON.stringify({ type: 'HANDSHAKE' }));
        };

        client.onmessage = (msg) => {
            const obj = JSON.parse(msg.data);
            // console.debug(obj);
            switch (obj.type) {
                case 'HANDSHAKE':
                    this.setState({ turtles: obj.message.turtles, world: obj.message.world });
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
        };
    }

    render() {
        return (
            <div>
                <Navbar style={{ backgroundColor: '#27293d' }} variant="dark">
                    <Navbar.Brand href="/#/">
                        <img alt="" src="/logo.svg" width="32" height="32" className="d-inline-block align-top" /> Dashboard
                    </Navbar.Brand>
                </Navbar>
                <HashRouter>
                    <div>
                        <Route exact path="/" render={() => <Dashboard {...this.state} />} />
                        <Route
                            exact
                            path="/turtles/:id"
                            render={(props) => (
                                <Turtle selectedTurtle={props.match.params.id} turtles={this.state.turtles} world={this.state.world} />
                            )}
                        />
                    </div>
                </HashRouter>
            </div>
        );
    }
}

export default Main;
