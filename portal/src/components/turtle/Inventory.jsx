import styled from 'styled-components';
import {OverlayTrigger, Tooltip, Col, Row, Button, Modal} from 'react-bootstrap';
import FarmModal from './FarmModal';
import MineModal from './MineModal';
import SpriteTable from '../../SpriteTable.json';
import {useState} from 'react';
import './Inventory.css';

function Inventory(props) {
    const [state, setState] = useState({
        isModalShown: false,
        modalState: undefined,
    });

    const renderModal = (turtle) => {
        switch (state.modalState) {
            case 'farm':
                return (
                    <FarmModal
                        turtle={turtle}
                        action={props.action}
                        areas={Object.keys(props.areas || {}).map((key) => props.areas[key].id)}
                        hideModal={() => setState({...state, isModalShown: false})}
                    />
                );
            case 'mine':
                return (
                    <MineModal
                        turtle={turtle}
                        action={props.action}
                        areas={Object.keys(props.areas || {}).map((key) => props.areas[key].id)}
                        hideModal={() => setState({...state, isModalShown: false})}
                    />
                );
            default:
                return undefined;
        }
    };

    const {turtle} = props;
    if (turtle === undefined) {
        return null;
    }

    const {inventory, selectedSlot} = turtle;
    return [
        <Col key='inventory-grid' md='auto'>
            <Modal show={state.isModalShown} onHide={() => setState({...state, isModalShown: false})}>
                {renderModal(turtle)}
            </Modal>
            <div className='inventory-container'>
                <InventoryGrid>
                    <ButtonSlot key='refresh-btn'>
                        <button
                            className='text-muted inventory-button'
                            onClick={() =>
                                props.action({type: 'ACTION', action: 'refresh-inventory', data: {id: turtle.id}})
                            }
                            disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                        >
                            <b>Refresh</b>
                        </button>
                    </ButtonSlot>
                    <ButtonSlot style={{gridColumn: 'span 2'}} key='craft-btn'>
                        <button
                            className='text-muted inventory-button'
                            onClick={() => props.action({type: 'ACTION', action: 'craft', data: {id: turtle.id}})}
                            disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                        >
                            <b>Craft</b>
                        </button>
                    </ButtonSlot>
                    <ButtonSlot key='drop-btn'>
                        <button
                            className='text-danger inventory-button'
                            onClick={() => props.action({type: 'ACTION', action: 'drop', data: {id: turtle.id}})}
                            disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                        >
                            <b>Drop</b>
                        </button>
                    </ButtonSlot>
                    {Array.from(Array(16), (_, i) => i).map((i) => {
                        const itemIndex = i + 1;
                        const ItemSlotStyle = itemIndex === selectedSlot ? SelectedItemSlot : ItemSlot;
                        if (inventory[itemIndex] === undefined) {
                            return (
                                <OverlayTrigger key={i} placement='top' overlay={<Tooltip>Empty</Tooltip>}>
                                    <ItemSlotStyle
                                        onClick={() => {
                                            props.action({
                                                type: 'ACTION',
                                                action: 'select',
                                                data: {id: turtle.id, slot: i},
                                            });
                                        }}
                                    >
                                        <EmptyItemImage />
                                    </ItemSlotStyle>
                                </OverlayTrigger>
                            );
                        }

                        const {name, count, displayName} = inventory[itemIndex];
                        const nameSplit = name.split(':');
                        const itemNameFromSplit = nameSplit[nameSplit.length - 1];
                        const spritePosition =
                            SpriteTable[displayName] ?? SpriteTable[itemNameFromSplit] ?? SpriteTable['???'];
                        const spriteY = 32 * Math.floor(spritePosition / 32);
                        const spriteX = 32 * (spritePosition - spriteY - 1);

                        return (
                            <OverlayTrigger key={i} placement='top' overlay={<Tooltip>{displayName}</Tooltip>}>
                                <ItemSlotStyle
                                    onClick={() => {
                                        props.action({
                                            type: 'ACTION',
                                            action: 'select',
                                            data: {id: turtle.id, slot: i},
                                        });
                                    }}
                                >
                                    <ItemImage
                                        style={{
                                            backgroundImage: 'url(/sprites.png)',
                                            backgroundPosition: `-${spriteX}px -${spriteY}px`,
                                        }}
                                    />
                                    <ItemCount>{count}</ItemCount>
                                </ItemSlotStyle>
                            </OverlayTrigger>
                        );
                    })}
                </InventoryGrid>
            </div>
        </Col>,
        <Col key='inventory-actions'>
            <Row>
                <h5>
                    Activity: <ins style={{textTransform: 'capitalize'}}>{turtle?.state?.name || 'idle'}</ins>
                    {turtle?.state?.error ? (
                        <span>
                            {' '}
                            (<span className='text-danger'>{turtle.state.error}</span>)
                        </span>
                    ) : null}
                </h5>
            </Row>
            <Row>
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
            </Row>
            <Row style={{marginTop: 5}}>
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
            </Row>
            <Row style={{marginTop: 5}}>
                <div>
                    <Button
                        onClick={() => props.action({type: 'ACTION', action: 'refuel', data: {id: turtle.id}})}
                        variant='outline-info'
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Refuel
                    </Button>
                </div>
            </Row>
            <Row style={{marginTop: 5}}>
                <div>
                    <Button
                        onClick={() => props.action({type: 'ACTION', action: 'stop', data: {id: turtle.id}})}
                        variant='outline-danger'
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Stop
                    </Button>
                </div>
            </Row>
        </Col>,
    ];
}

const ItemCount = styled.span`
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 24px;
    line-height: 24px;
`;

const EmptyItemImage = styled.span`
    width: 32px;
    height: 32px;
    background-color: #8b8b8b;
`;

const ItemImage = styled.span`
    image-rendering: crisp-edges;
    width: 32px;
    height: 32px;
    display: inline-block;
    background-repeat: no-repeat;
`;

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

const ItemSlot = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    cursor: pointer;
    align-items: center;
    background-color: #8b8b8b;
    border: 1px solid #373737;
    padding: 2px;
    width: 64px;
    height: 64px;
`;

const SelectedItemSlot = styled(ItemSlot)`
    border: 3px solid #264d8c;
`;

export default Inventory;
