import styled from 'styled-components';
import {Accordion, Table} from 'react-bootstrap';
import {useNavigate} from 'react-router-dom';
import {CSSProperties} from 'react';
import {Server as APIServer} from '../App';
import FuelInfo from './FuelInfo';

export interface ServerProps {
    server: APIServer;
}

function Server(props: ServerProps) {
    const navigate = useNavigate();
    const {server} = props;

    return (
        <Accordion defaultActiveKey='0'>
            <Accordion.Item eventKey='0'>
                <Accordion.Header>{server.name ?? server.remoteAddress}</Accordion.Header>
                <Accordion.Body>
                    <Table
                        hover
                        style={
                            {
                                '--bs-table-bg': 'inherit',
                                '--bs-table-color': 'inherit',
                                '--bs-table-hover-color': 'inherit',
                            } as CSSProperties
                        }
                    >
                        <thead>
                            <tr>
                                <th style={{width: 40}}>ID</th>
                                <th style={{width: 80}}>Status</th>
                                <th style={{width: 120}}>Name</th>
                                <th style={{width: 100}}>Activity</th>
                                <th style={{width: 220}}>Fuel</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(server.turtles).map((turtle) => (
                                <tr
                                    key={`${server.id}-${turtle.id}`}
                                    onClick={() => navigate(`/servers/${server.id}/turtles/${turtle.id}`)}
                                >
                                    <td>{turtle.id}</td>
                                    <td>
                                        {turtle.isOnline ? <GreenText>Online</GreenText> : <GreyText>Offline</GreyText>}
                                    </td>
                                    <td>{turtle.name}</td>
                                    <td>{turtle.state ? turtle.state.name : 'idle'}</td>
                                    <td style={{verticalAlign: 'middle'}}>
                                        <FuelInfo {...turtle} />
                                    </td>
                                    <td>
                                        <span className='text-danger'>{turtle.state?.error}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Accordion.Body>
            </Accordion.Item>
        </Accordion>
    );
}

const GreenText = styled.span`
    color: #61d447;
`;

const GreyText = styled.span`
    color: #707070;
`;

export default Server;
