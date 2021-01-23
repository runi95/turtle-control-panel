import React from 'react';
import { useHistory } from 'react-router-dom';
import './Dashboard.css';
import styled from 'styled-components';
import { Table } from 'react-bootstrap';
import FuelInfo from './FuelInfo';

const stateToString = (state) => {
    if (state === undefined) {
        return 'idle';
    }

    return state.name;
};

function Dashboard(props) {
    const history = useHistory();

    return (
        <div className="container-fluid">
            <Table hover>
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>ID</th>
                        <th style={{ width: 80 }}>Status</th>
                        <th style={{ width: 120 }}>Name</th>
                        <th style={{ width: 80 }}>Activity</th>
                        <th>Fuel</th>
                    </tr>
                </thead>
                <tbody>
                    {props.turtles &&
                        Object.keys(props.turtles).map((key) => (
                            <tr key={key} onClick={() => history.push(`/turtles/${key}`)}>
                                <td>{key}</td>
                                <td>{props.turtles[key].isOnline ? <GreenText>Online</GreenText> : <GreyText>Offline</GreyText>}</td>
                                <td>{props.turtles[key].name}</td>
                                <td>{stateToString(props.turtles[key].state)}</td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <FuelInfo {...props.turtles[key]} />
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
