import React, { Component } from 'react';
import styled from 'styled-components';
import { OverlayTrigger, Tooltip, Col, Row, Button, Modal } from 'react-bootstrap';
import FarmModal from './FarmModal';
import SpriteTable from '../../SpriteTable.json';

class Inventory extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isModalShown: false,
        };
    }

    render() {
        const { turtle } = this.props;
        if (turtle === undefined) {
            return null;
        }

        const { inventory, selectedSlot } = turtle;
        return [
            <Col key="inventory-grid" md="auto">
                <Modal show={this.state.isModalShown} onHide={() => this.setState({ isModalShown: false })}>
                    <FarmModal
                        turtle={turtle}
                        action={this.props.action}
                        areas={Object.keys(this.props.areas || {}).map((key) => this.props.areas[key].id)}
                        hideModal={() => this.setState({ isModalShown: false })}
                    />
                </Modal>
                <InventoryGrid>
                    {Array.from(Array(16), (_, i) => i).map((i) => {
                        const itemIndex = i + 1;
                        const ItemSlotStyle = itemIndex === selectedSlot ? SelectedItemSlot : ItemSlot;
                        if (inventory[itemIndex] === undefined) {
                            return (
                                <ItemSlotStyle key={i}>
                                    <OverlayTrigger placement="top" overlay={<Tooltip>Empty</Tooltip>}>
                                        <EmptyItemImage />
                                    </OverlayTrigger>
                                </ItemSlotStyle>
                            );
                        }

                        const { name, count, displayName } = inventory[itemIndex];
                        const nameSplit = name.split(':');
                        const itemNameFromSplit = nameSplit[nameSplit.length - 1];
                        const spriteLookupName =
                            nameSplit[0] !== 'minecraft' || SpriteTable[itemNameFromSplit] === undefined ? '???' : itemNameFromSplit;
                        const spritePosition = SpriteTable[spriteLookupName];
                        const spriteY = 32 * Math.floor(spritePosition / 32);
                        const spriteX = 32 * (spritePosition - spriteY - 1);

                        return (
                            <ItemSlotStyle key={i}>
                                <OverlayTrigger placement="top" overlay={<Tooltip>{displayName}</Tooltip>}>
                                    <ItemContainer>
                                        <ItemImage
                                            style={{
                                                backgroundImage: 'url(/sprites.png)',
                                                backgroundPosition: `-${spriteX}px -${spriteY}px`,
                                            }}
                                        />
                                        <ItemCount>{count}</ItemCount>
                                    </ItemContainer>
                                </OverlayTrigger>
                            </ItemSlotStyle>
                        );
                    })}
                </InventoryGrid>
            </Col>,
            <Col key="inventory-actions">
                <Row>
                    <h5>
                        <ins style={{ textTransform: 'capitalize' }}>{(turtle && turtle.state && turtle.state.name) || 'idle'}</ins>
                    </h5>
                </Row>
                <Row>
                    <Button variant="outline-info" size="sm" disabled={!turtle.isOnline}>
                        Mine
                    </Button>
                </Row>
                <Row style={{ marginTop: 5 }}>
                    <Button
                        onClick={() => this.setState({ isModalShown: true })}
                        variant="outline-info"
                        size="sm"
                        disabled={!turtle.isOnline}
                    >
                        Farm
                    </Button>
                </Row>
                <Row style={{ marginTop: 5 }}>
                    <Button
                        onClick={() => this.props.action({ type: 'ACTION', action: 'refuel', data: { id: turtle.id } })}
                        variant="outline-info"
                        size="sm"
                        disabled={!turtle.isOnline}
                    >
                        Refuel
                    </Button>
                </Row>
                <Row style={{ marginTop: 5 }}>
                    <Button
                        onClick={() => this.props.action({ type: 'ACTION', action: 'stop' })}
                        variant="outline-danger"
                        size="sm"
                        disabled={!turtle.isOnline}
                    >
                        Stop
                    </Button>
                </Row>
            </Col>,
        ];
    }
}

const ItemCount = styled.div`
    position: absolute;
    bottom: -15px;
    right: -15px;
    font-size: 1.5em;
    font-weight: 500;
`;

const ItemContainer = styled.div`
    position: relative;
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
    background-color: #c6c6c6;
    padding: 5px;
    border-radius: 5px;
`;

const ItemSlot = styled.div`
    display: flex;
    justify-content: center;
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
