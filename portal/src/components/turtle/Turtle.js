import React, { Component } from 'react';
import styled from 'styled-components';
import { Container, Row, Col } from 'react-bootstrap';
import FuelInfo from '../FuelInfo';
import TurtleMap from './TurtleMap';
import Inventory from './Inventory';

const canvasSize = 160;
const canvasRadius = 0.5 * canvasSize;

class Turtle extends Component {
    directionToString(direction) {
        return ['W', 'N', 'E', 'S'][direction - 1];
    }

    render() {
        const turtle = this.props.turtles ? this.props.turtles[this.props.selectedTurtle] || undefined : undefined;
        return (
            <Container fluid>
                <br />
                <Row>
                    <Col>
                        <h3>
                            {(turtle && turtle.name) || 'Unknown Turtle'}
                            {turtle && turtle.isOnline ? <GreenOnlineBox /> : <GreyOnlineBox />}
                        </h3>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <FuelInfo {...(turtle ? turtle : {})} />
                    </Col>
                    <Col md="auto">
                        <LocationText>
                            {(turtle && turtle.direction && `${this.directionToString(turtle.direction)}`) || '_'} (
                            {(turtle && turtle.location && `${turtle.location.x}, ${turtle.location.y}, ${turtle.location.z}`) || '?, ?, ?'}
                            )
                        </LocationText>
                    </Col>
                </Row>
                <hr />
                <Row>
                    <Inventory turtle={turtle} action={this.props.action} areas={this.props.areas}></Inventory>
                    <TurtleMap
                        style={{ border: '1px solid #fff', borderRadius: canvasRadius }}
                        canvasSize={canvasSize}
                        turtles={this.props.turtles}
                        selectedTurtle={this.props.selectedTurtle}
                        world={this.props.world}
                        areas={this.props.areas}
                        action={this.props.action}
                    />
                </Row>
            </Container>
        );
    }
}

const OnlineBox = styled.div`
    float: left;
    height: 6px;
    width: 6px;
    border-radius: 3px;
    border: solid 1px #000;
`;

const GreenOnlineBox = styled(OnlineBox)`
    background-color: #6bc158;
`;

const GreyOnlineBox = styled(OnlineBox)`
    background-color: #8b8b8b;
`;

const LocationText = styled.small`
    color: #8b8b8b;
`;

export default Turtle;
