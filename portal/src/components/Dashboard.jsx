import styled from 'styled-components';
import {Table} from 'react-bootstrap';
import FuelInfo from './FuelInfo';
import './Dashboard.css';
import {useNavigate} from 'react-router-dom';

function Dashboard(props) {
    const navigate = useNavigate();
    const {turtles, servers} = props;
    const serverNameMap = Object.entries(servers).reduce(
        (acc, [serverId, {name}]) => ((acc[serverId] = name), acc),
        {}
    );

    return (
        <div className='container-fluid'>
            {!!turtles &&
                Object.entries(turtles).map(([serverId, turtleServer]) => (
                    <details key={serverId} open>
                        <summary>{serverNameMap[serverId] ?? serverId}:</summary>
                        <Table
                            hover
                            style={{
                                '--bs-table-bg': 'inherit',
                                '--bs-table-color': 'inherit',
                                '--bs-table-hover-color': 'inherit',
                            }}
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
                                {Object.values(turtleServer).map((turtle) => (
                                    <tr
                                        key={`${serverId}-${turtle.id}`}
                                        onClick={() => navigate(`/servers/${serverId}/turtles/${turtle.id}`)}
                                    >
                                        <td>{turtle.id}</td>
                                        <td>
                                            {turtle.isOnline ? (
                                                <GreenText>Online</GreenText>
                                            ) : (
                                                <GreyText>Offline</GreyText>
                                            )}
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
                    </details>
                ))}
        </div>
    );
}

const GreenText = styled.span`
    color: #61d447;
`;

const GreyText = styled.span`
    color: #707070;
`;

export default Dashboard;
