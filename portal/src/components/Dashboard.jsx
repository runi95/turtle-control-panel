import styled from 'styled-components';
import {Table} from 'react-bootstrap';
import FuelInfo from './FuelInfo';
import './Dashboard.css';
import {useNavigate} from 'react-router-dom';

function Dashboard(props) {
    const navigate = useNavigate();

    return (
        <div className='container-fluid'>
            <Table
                hover
                style={{'--bs-table-bg': 'inherit', '--bs-table-color': 'inherit', '--bs-table-hover-color': 'inherit'}}
            >
                <thead>
                    <tr>
                        <th style={{width: 40}}>ID</th>
                        <th style={{width: 80}}>Status</th>
                        <th style={{width: 120}}>Name</th>
                        <th style={{width: 80}}>Activity</th>
                        <th style={{width: 220}}>Fuel</th>
                        <th>Error</th>
                    </tr>
                </thead>
                <tbody>
                    {!!props.turtles &&
                        Object.keys(props.turtles).map((key) => (
                            <tr key={key} onClick={() => navigate(`/dashboard/${key}`)}>
                                <td>{key}</td>
                                <td>
                                    {props.turtles[key].isOnline ? (
                                        <GreenText>Online</GreenText>
                                    ) : (
                                        <GreyText>Offline</GreyText>
                                    )}
                                </td>
                                <td>{props.turtles[key].name}</td>
                                <td>{props.turtles[key].state ? props.turtles[key].state.name : 'idle'}</td>
                                <td style={{verticalAlign: 'middle'}}>
                                    <FuelInfo {...props.turtles[key]} />
                                </td>
                                <td>
                                    <span className='text-danger'>{props.turtles[key].state?.error}</span>
                                </td>
                            </tr>
                        ))}
                </tbody>
            </Table>
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
