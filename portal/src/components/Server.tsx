import styled from 'styled-components';
import {Accordion, Table} from 'react-bootstrap';
import {useNavigate} from 'react-router-dom';
import {CSSProperties} from 'react';
import FuelInfo from './FuelInfo';
import {Server as APIServer} from '../api/UseServers';

export interface ServerProps {
    server: APIServer;
    action: Action;
}

function Server(props: ServerProps) {
    const navigate = useNavigate();
    const {server, action} = props;

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
                                <th style={{width: 28}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(server.turtles).map((turtle) => (
                                <tr key={`${server.id}-${turtle.id}`}>
                                    <td onClick={() => navigate(`/servers/${server.id}/turtles/${turtle.id}`)}>
                                        {turtle.id}
                                    </td>
                                    <td onClick={() => navigate(`/servers/${server.id}/turtles/${turtle.id}`)}>
                                        {turtle.isOnline ? <GreenText>Online</GreenText> : <GreyText>Offline</GreyText>}
                                    </td>
                                    <td onClick={() => navigate(`/servers/${server.id}/turtles/${turtle.id}`)}>
                                        {turtle.name}
                                    </td>
                                    <td onClick={() => navigate(`/servers/${server.id}/turtles/${turtle.id}`)}>
                                        {turtle.state ? turtle.state.name : 'idle'}
                                    </td>
                                    <td
                                        style={{verticalAlign: 'middle'}}
                                        onClick={() => navigate(`/servers/${server.id}/turtles/${turtle.id}`)}
                                    >
                                        <FuelInfo {...turtle} />
                                    </td>
                                    <td onClick={() => navigate(`/servers/${server.id}/turtles/${turtle.id}`)}>
                                        {turtle.error ? (
                                            <span className='text-danger'>{turtle.error}</span>
                                        ) : turtle.state?.warning ? (
                                            <span className='text-warning'>{turtle.state.warning as string}</span>
                                        ) : null}
                                    </td>
                                    {!turtle.isOnline ? (
                                        <td
                                            onClick={() => {
                                                action({
                                                    type: 'TURTLE',
                                                    action: 'delete',
                                                    data: {
                                                        serverId: server.id,
                                                        id: turtle.id,
                                                    },
                                                });
                                            }}
                                        >
                                            <span className='text-secondary'>✖</span>
                                        </td>
                                    ) : (
                                        <td></td>
                                    )}
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
