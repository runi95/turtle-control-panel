import styled from 'styled-components';
import {Container, Row, Col, Form, Button, InputGroup, Modal} from 'react-bootstrap';
import FuelInfo from '../FuelInfo';
import TurtleMap from './TurtleMap';
import Inventory from './Inventory';
import {useParams} from 'react-router-dom';
import {useCallback, useEffect, useState} from 'react';
import LocationModal from './LocationModal';

const canvasSize = 160;
const canvasRadius = 0.5 * canvasSize;

function Turtle(props) {
    const {serverId, id} = useParams();
    const [editNameState, setEditNameState] = useState(false);
    const [isModalShown, setIsModalShown] = useState(false);

    const escFunc = useCallback((e) => {
        if (e.key === 'Escape') {
            setEditNameState(false);
        }
    });
    useEffect(() => {
        document.addEventListener('keydown', escFunc, false);

        return () => document.removeEventListener('keydown', escFunc, false);
    });

    const directionToString = (direction) => {
        return ['W', 'N', 'E', 'S'][direction - 1];
    };
    const {servers} = props;
    const turtles = servers?.[serverId]?.turtles;
    const blocks = servers?.[serverId]?.blocks;
    const turtle = turtles?.[id];
    const areas = servers?.[serverId]?.areas;

    return (
        <Container fluid>
            <br />
            <Row>
                <Col>
                    <div style={{display: 'flex'}}>
                        {editNameState ? (
                            <Form
                                style={{marginBottom: '.5rem'}}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    props.action({
                                        type: 'ACTION',
                                        action: 'rename',
                                        data: {id: turtle.id, newName: e.target[0].value},
                                    });
                                    setEditNameState(false);
                                }}
                            >
                                <InputGroup>
                                    <Form.Control
                                        name='name'
                                        type='text'
                                        size='sm'
                                        defaultValue={turtle.name}
                                        autoFocus
                                    />
                                    <Button
                                        style={{border: 'none'}}
                                        variant='outline-danger'
                                        onClick={() => {
                                            setEditNameState(false);
                                        }}
                                    >
                                        ✖
                                    </Button>
                                    <Button style={{border: 'none'}} type='submit' variant='outline-success'>
                                        ✔
                                    </Button>
                                </InputGroup>
                            </Form>
                        ) : (
                            <div style={{display: 'flex'}}>
                                <h3>
                                    {turtle?.isOnline ? <GreenOnlineBox /> : <GreyOnlineBox />}
                                    {turtle?.name ?? 'Unknown Turtle'}
                                </h3>
                                <div
                                    className='text-secondary'
                                    style={{marginLeft: 4, cursor: 'pointer'}}
                                    onClick={() => {
                                        setEditNameState(true);
                                    }}
                                >
                                    ✎
                                </div>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <FuelInfo {...(turtle ? turtle : {})} />
                </Col>
                <Col md='auto'>
                    <Modal show={isModalShown} onHide={() => setIsModalShown(false)}>
                        <LocationModal turtle={turtle} action={props.action} hideModal={() => setIsModalShown(false)} />
                    </Modal>
                    {(!turtle?.location || !turtle?.direction) && (
                        <span className='text-danger' style={{marginRight: 5}}>
                            Update turtle position:
                        </span>
                    )}
                    <LocationText
                        onClick={() => {
                            setIsModalShown(true);
                        }}
                    >
                        {turtle?.direction ? `${directionToString(turtle.direction)}` : '_'} (
                        {turtle?.location
                            ? `${turtle.location.x}, ${turtle.location.y}, ${turtle.location.z}`
                            : '?, ?, ?'}
                        )
                    </LocationText>
                </Col>
            </Row>
            <hr />
            <Row>
                <Inventory turtle={turtle} action={props.action} areas={areas}></Inventory>
                <TurtleMap
                    style={{border: '1px solid #fff', borderRadius: canvasRadius}}
                    canvasSize={canvasSize}
                    turtles={turtles}
                    blocks={blocks}
                    areas={areas}
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
    cursor: pointer;
    color: #8b8b8b;
`;

export default Turtle;
