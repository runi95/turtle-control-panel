import { Component } from 'react';
import styled from 'styled-components';
import { Table } from 'react-bootstrap';
import history from '../utils/history';
import './Dashboard.css';
import FuelInfo from './FuelInfo';

const stateToString = (state) => {
    if (state === undefined) {
        return 'idle';
    }

    return state.name;
};

class Dashboard extends Component {
    render() {
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
                        {this.props.turtles &&
                            Object.keys(this.props.turtles).map((key) => (
                                <tr key={key} onClick={() => history.push(`/dashboard/${key}`)}>
                                    <td>{key}</td>
                                    <td>
                                        {this.props.turtles[key].isOnline ? <GreenText>Online</GreenText> : <GreyText>Offline</GreyText>}
                                    </td>
                                    <td>{this.props.turtles[key].name}</td>
                                    <td>{stateToString(this.props.turtles[key].state)}</td>
                                    <td style={{ verticalAlign: 'middle' }}>
                                        <FuelInfo {...this.props.turtles[key]} />
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </Table>
            </div>
        );
    }
}

const GreenText = styled.span`
    color: #61d447;
`;

const GreyText = styled.span`
    color: #707070;
`;

export default Dashboard;
