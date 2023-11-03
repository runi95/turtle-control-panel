import styled from 'styled-components';
import {Container, Row, Col} from 'react-bootstrap';
import FuelInfo from '../FuelInfo';
import TurtleMap from './TurtleMap';
import Inventory from './Inventory';
import {useParams} from 'react-router-dom';

const canvasSize = 160;
const canvasRadius = 0.5 * canvasSize;

function Turtle(props) {
    let {id} = useParams();

    const directionToString = (direction) => {
        return ['W', 'N', 'E', 'S'][direction - 1];
    };
    const turtle = props.turtles ? props.turtles[id] || undefined : undefined;

    return (
        <Container fluid>
            <br />
            <Row>
                <Col>
                    <h3>
                        {turtle?.name || 'Unknown Turtle'}
                        {turtle?.isOnline ? <GreenOnlineBox /> : <GreyOnlineBox />}
                    </h3>
                </Col>
            </Row>
            <Row>
                <Col>
                    <FuelInfo {...(turtle ? turtle : {})} />
                </Col>
                <Col md='auto'>
                    <LocationText>
                        {!!turtle?.direction ? `${directionToString(turtle.direction)}` : '_'} (
                        {turtle?.location
                            ? `${turtle.location.x}, ${turtle.location.y}, ${turtle.location.z}`
                            : '?, ?, ?'}
                        )
                    </LocationText>
                </Col>
            </Row>
            <hr />
            <Row>
                <Inventory turtle={turtle} action={props.action} areas={props.areas}></Inventory>
                <TurtleMap
                    style={{border: '1px solid #fff', borderRadius: canvasRadius}}
                    canvasSize={canvasSize}
                    turtles={props.turtles}
                    selectedTurtle={id}
                    world={props.world}
                    areas={props.areas}
                    action={props.action}
                />
            </Row>
        </Container>
    );
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
