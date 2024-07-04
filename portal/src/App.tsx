import {Route, Routes, useNavigate} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Navbar, Nav} from 'react-bootstrap';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Turtle from './components/turtle/Turtle';
import {Location, Turtle as APITurtle} from './api/UseTurtle';
import {ConnectionStatus, useWebSocket, useWebSocketConnectionStatus} from './api/UseWebSocket';
import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';

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
    const {socket} = useWebSocket();
    const connectionStatus = useWebSocketConnectionStatus();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (socket == null) return;

        function onMessage(msg: string) {
            const obj = JSON.parse(msg);

            switch (obj.type) {
                case 'TUPDATE':
                    queryClient.setQueryData(
                        ['turtles', obj.message.serverId.toString(), obj.message.id.toString()],
                        (oldData: APITurtle) => ({
                            ...oldData,
                            ...obj.message.data,
                        })
                    );
                    queryClient.setQueryData(['turtles', obj.message.serverId.toString()], (oldData: APITurtle[]) =>
                        oldData?.reduce((acc, curr) => {
                            if (curr.id === obj.message.id) {
                                acc.push({
                                    ...curr,
                                    ...obj.message.data,
                                });
                            } else {
                                acc.push({
                                    ...curr,
                                });
                            }

                            return acc;
                        }, [] as APITurtle[])
                    );
                    break;
                case 'WUPDATE':
                    // TODO: Support quick rerender instead of full rerender on each update
                    queryClient.setQueriesData(
                        {
                            queryKey: ['blocks', obj.message.serverId.toString()],
                        },
                        (oldData: Blocks | undefined) => {
                            const newData = {...oldData};

                            (obj.message.deletedBlocks as Location[])?.forEach(
                                ({x, y, z}: Location) => delete newData[`${x},${y},${z}`]
                            );

                            (obj.message.blocks as Block[])?.forEach(
                                (block) => (newData[`${block.x},${block.y},${block.z}`] = block)
                            );

                            return newData;
                        }
                    );
            }
        }

        socket.on('message', onMessage);

        return () => {
            socket.off('message', onMessage);
        };
    }, [socket]);

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
