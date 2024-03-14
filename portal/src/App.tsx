import {Route, Routes, useNavigate} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Navbar, Nav} from 'react-bootstrap';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Turtle from './components/turtle/Turtle';
import {Location} from './api/UseTurtle';
import {ConnectionStatus, useWebSocketConnectionStatus} from './api/UseWebSocket';

export interface BlockState {
    [key: string]: string;
}

export interface BlockTags {
    [key: string]: string;
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

export interface ActionMessage {
    type: 'HANDSHAKE' | 'ACTION' | 'AREA' | 'SERVER' | 'TURTLE';
    action: string;
    data: {
        [key: string]: unknown;
    };
}

export type Action = (msg: ActionMessage) => void;

function App() {
    const navigate = useNavigate();
    const connectionStatus = useWebSocketConnectionStatus();

    return (
        <Routes>
            <Route path='/' element={<LandingPage />} />
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
                            {connectionStatus !== ConnectionStatus.CONNECTED && (
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
                        <Dashboard />
                    </div>
                }
            />
            <Route path='/servers/:serverId/turtles/:id' element={<Turtle />} />
        </Routes>
    );
}

export default App;
