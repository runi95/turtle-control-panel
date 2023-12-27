import styled from 'styled-components';
import {Container, Row, Col, Form, Button, InputGroup, Modal} from 'react-bootstrap';
import FuelInfo from '../FuelInfo';
import Inventory from './Inventory';
import {useParams} from 'react-router-dom';
import {useCallback, useEffect, useState} from 'react';
import LocationModal from './LocationModal';
import {Action, Servers} from '../../App';

export interface TurtleProps {
    servers: Servers;
    action: Action;
}

function Turtle(props: TurtleProps) {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const [editNameState, setEditNameState] = useState(false);
    const [isModalShown, setIsModalShown] = useState(false);

    const escFunc = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditNameState(false);
        }
    }, []);
    useEffect(() => {
        document.addEventListener('keydown', escFunc, false);

        return () => document.removeEventListener('keydown', escFunc, false);
    });

    const directionToString = (direction: number) => {
        return ['W', 'N', 'E', 'S'][direction - 1];
    };
    const {servers, action} = props;
    const turtles = servers?.[serverId]?.turtles;
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
                                    action({
                                        type: 'ACTION',
                                        action: 'rename',
                                        data: {
                                            id: turtle.id,
                                            newName: ((e.target as HTMLFormElement)[0] as HTMLInputElement).value,
                                        },
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
                                <h3
                                    style={{
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        setEditNameState(true);
                                    }}
                                >
                                    {turtle?.isOnline ? <GreenOnlineBox /> : <GreyOnlineBox />}
                                    {turtle?.name ?? 'Unknown Turtle'}
                                </h3>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <FuelInfo fuelLevel={turtle?.fuelLevel} fuelLimit={turtle?.fuelLimit} />
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
            <Inventory turtles={turtles} turtle={turtle} areas={areas} action={action}></Inventory>
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
