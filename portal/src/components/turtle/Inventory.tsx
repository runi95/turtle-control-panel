import styled from 'styled-components';
import {Col, Row} from 'react-bootstrap';
import './Inventory.css';
import {Action} from '../../App';
import Item from './Item';
import {useTurtle} from '../../api/UseTurtle';
import {useParams} from 'react-router-dom';

export interface InventoryProps {
    action: Action;
}

function Inventory(props: InventoryProps) {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {data: turtle} = useTurtle(serverId, id);

    if (turtle === undefined) {
        return null;
    }

    const {inventory, selectedSlot} = turtle;

    return (
        <Row data-bs-theme='light'>
            <Col key='inventory-grid' md='auto'>
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
