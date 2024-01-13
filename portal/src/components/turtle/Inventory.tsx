import styled from 'styled-components';
import {Col, Row, Button, Modal} from 'react-bootstrap';
import FarmModal from './farm/FarmModal';
import MineModal from './mine/MineModal';
import {useState} from 'react';
import './Inventory.css';
import {Action} from '../../App';
import TurtleMap from './TurtleMap';
import Peripheral from './Peripheral';
import Item from './Item';
import InventoryPeripheral, {InventoryPeripheralContent} from './InventoryPeripheral';
import {Turtle, useTurtle} from '../../api/UseTurtle';
import {useParams} from 'react-router-dom';

export interface InventoryProps {
    action: Action;
}

const canvasSize = 208;
const canvasRadius = 0.5 * canvasSize;

function Inventory(props: InventoryProps) {
    const {action} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const [state, setState] = useState<{isModalShown: boolean; modalState: string | undefined}>({
        isModalShown: false,
        modalState: undefined,
    });
    const {data: turtle} = useTurtle(serverId, id);

    const renderModal = (turtle: Turtle) => {
        switch (state.modalState) {
            case 'farm':
                return (
                    <FarmModal
                        turtle={turtle}
                        action={action}
                        hideModal={() => setState({...state, isModalShown: false})}
                    />
                );
            case 'mine':
                return (
                    <MineModal
                        turtle={turtle}
                        action={action}
                        hideModal={() => setState({...state, isModalShown: false})}
                    />
                );
            default:
                return undefined;
        }
    };

    if (turtle === undefined) {
        return null;
    }

    const {inventory, selectedSlot, peripherals} = turtle;
    const inventorySides =
        peripherals !== null ? Object.entries(peripherals).filter(([_, {types}]) => types.includes('inventory')) : [];

    return (
        <Row data-bs-theme='light'>
            <Col key='inventory-grid' md='auto'>
                <Modal show={state.isModalShown} onHide={() => setState({...state, isModalShown: false})}>
                    {renderModal(turtle)}
                </Modal>
                <div className='inventory-container'>
                    <InventoryGrid>
                        <ButtonSlot style={{gridColumn: 'span 3'}} key='craft-btn'>
                            <button
                                className='text-muted inventory-button'
                                onClick={() =>
                                    props.action({type: 'ACTION', action: 'craft', data: {serverId, id: turtle.id}})
                                }
                                disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                            >
                                <b>Craft</b>
                            </button>
                        </ButtonSlot>
                        <ButtonSlot key='drop-btn'>
                            <button
                                className='text-danger inventory-button'
                                onClick={() =>
                                    props.action({type: 'ACTION', action: 'drop', data: {serverId, id: turtle.id}})
                                }
                                disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                            >
                                <b>Drop</b>
                            </button>
                        </ButtonSlot>
                        {Array.from(Array(16), (_, i) => i).map((i) => {
                            const itemIndex = i + 1;
                            const itemDetail = inventory[itemIndex];
                            const isEmpty = itemDetail === null || itemDetail === undefined;

                            return (
                                <Item
                                    key={itemIndex}
                                    displayName={isEmpty ? 'Empty' : itemDetail.displayName}
                                    isSelected={itemIndex === selectedSlot}
                                    index={itemIndex}
                                    side=''
                                    item={isEmpty ? null : {name: itemDetail.name, count: itemDetail.count}}
                                    onDrop={(fromSide: string, fromSlot: number, toSlot: number) => {
                                        if (fromSide === '') {
                                            // This is an internal item transfer within the Turtle
                                            props.action({
                                                type: 'ACTION',
                                                action: 'inventory-transfer',
                                                data: {
                                                    serverId,
                                                    id: turtle.id,
                                                    fromSlot,
                                                    toSlot,
                                                },
                                            });
                                        } else {
                                            // This is an external item transfer from a nearby peripheral
                                            props.action({
                                                type: 'ACTION',
                                                action: 'inventory-push-items',
                                                data: {
                                                    serverId,
                                                    id: turtle.id,
                                                    fromSide,
                                                    toSide: '',
                                                    fromSlot,
                                                    toSlot,
                                                },
                                            });
                                        }
                                    }}
                                    onClick={() => {
                                        props.action({
                                            type: 'ACTION',
                                            action: 'select',
                                            data: {serverId, id: turtle.id, slot: itemIndex},
                                        });
                                    }}
                                />
                            );
                        })}
                    </InventoryGrid>
                </div>
            </Col>
            <Col key='inventory-actions' md='auto'>
                <Row>
                    <div style={{display: 'flex'}}>
                        <h5>
                            Activity: <ins style={{textTransform: 'capitalize'}}>{turtle?.state?.name || 'idle'}</ins>
                            {turtle.error ? (
                                <span>
                                    {' '}
                                    (<span className='text-danger'>{turtle.error}</span>)
                                </span>
                            ) : turtle.state?.warning ? (
                                <span>
                                    {' '}
                                    (<span className='text-warning'>{turtle.state.warning as string}</span>)
                                </span>
                            ) : null}
                        </h5>
                        <div style={{marginLeft: 25}}>
                            <Button
                                onClick={() =>
                                    props.action({type: 'ACTION', action: 'stop', data: {serverId, id: turtle.id}})
                                }
                                variant='outline-danger'
                                size='sm'
                                disabled={!turtle.isOnline}
                            >
                                Stop
                            </Button>
                        </div>
                    </div>
                </Row>
                <br />
                <h5>Actions</h5>
                <Row>
                    <div style={{display: 'flex', gap: 5}}>
                        <div>
                            <Button
                                onClick={() => setState({...state, isModalShown: true, modalState: 'mine'})}
                                variant='outline-info'
                                size='sm'
                                disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                            >
                                Mine
                            </Button>
                        </div>
                        <div>
                            <Button
                                onClick={() => setState({...state, isModalShown: true, modalState: 'farm'})}
                                variant='outline-info'
                                size='sm'
                                disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                            >
                                Farm
                            </Button>
                        </div>
                        <div>
                            <Button
                                onClick={() =>
                                    props.action({type: 'ACTION', action: 'refuel', data: {serverId, id: turtle.id}})
                                }
                                variant='outline-info'
                                size='sm'
                                disabled={!turtle.isOnline}
                            >
                                Refuel
                            </Button>
                        </div>
                    </div>
                </Row>
                <br />
                <h6>Peripherals</h6>
                <Row style={{marginTop: 5}}>
                    <div style={{display: 'flex', gap: 5}}>
                        {peripherals !== null
                            ? Object.values(peripherals).map((peripheral, i) => (
                                  <Peripheral key={i} action={action} turtle={turtle} peripheral={peripheral} />
                              ))
                            : null}
                    </div>
                </Row>
                <Row>
                    <div style={{marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10}}>
                        {inventorySides.map((inventoryPeripheral, i) => {
                            const [side, {data}] = inventoryPeripheral;
                            if (!data) return null;
                            const {size, content} = data as {
                                size: number;
                                content: InventoryPeripheralContent;
                            };
                            return (
                                <InventoryPeripheral
                                    key={i}
                                    side={side}
                                    action={action}
                                    size={size ?? null}
                                    content={content ?? null}
                                    connected={false}
                                />
                            );
                        })}
                    </div>
                </Row>
            </Col>
            <TurtleMap
                style={{border: '1px solid #fff', borderRadius: canvasRadius}}
                canvasSize={canvasSize}
                action={action}
            />
        </Row>
    );
}

const InventoryGrid = styled.div`
    width: 276px;
    display: inline-grid;
    grid-template-rows: auto auto auto auto;
    grid-template-columns: auto auto auto auto;
    grid-gap: 2px;
`;

const ButtonSlot = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2px;
    width: 64px;
    height: 40px;
`;

export default Inventory;
