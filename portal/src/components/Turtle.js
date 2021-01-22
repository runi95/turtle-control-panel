import React, { Component } from 'react';
import styled from 'styled-components';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import SpriteTable from '../SpriteTable.json';
import FuelInfo from './FuelInfo';
import Canvas from './Canvas';

class Turtle extends Component {
    directionToString(direction) {
        return ['W', 'N', 'E', 'S'][direction - 1];
    }

    draw(ctx) {
        if (!this.props.location || !this.props.visited || !this.props.queue) {
            return;
        }

        const mul = 16;

        // Clear
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw visited
        const keys = Object.keys(this.props.visited);
        for (let i = 0; i < keys.length; i++) {
            const keySplit = keys[i].split(',');
            const kX = keySplit[0];
            const kZ = keySplit[2];

            ctx.fillStyle = 'black';
            ctx.fillRect((Number.parseInt(kX) - 439) * mul, (Number.parseInt(kZ) + 613) * mul, mul, mul);
        }

        for (let i = 0; i < this.props.queue.length; i++) {
            const qX = this.props.queue[i].x;
            const qZ = this.props.queue[i].z;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'teal';
            ctx.fillRect((qX - 439) * mul, (qZ + 613) * mul, mul, mul);
        }

        ctx.globalAlpha = 1;

        // Draw goal
        ctx.fillStyle = '#6bc158';
        ctx.fillRect((459 - 439) * mul, (-601 + 613) * mul, mul, mul);

        // Draw position
        const posX = (this.props.location.x - 439) * mul;
        const posY = (this.props.location.z + 613) * mul;
        ctx.beginPath();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'yellow';
        const circleSizeMul = 0.35;
        ctx.arc(posX + 0.5 * mul, posY + 0.5 * mul, circleSizeMul * mul, 0, 2 * Math.PI, false);
        ctx.fill();

        return;
    }

    renderInventory(inventory) {
        if (inventory === undefined) {
            return <div></div>;
        }

        return (
            <InventoryGrid>
                {Array.from(Array(16), (_, i) => i).map((i) => {
                    const itemIndex = i + 1;
                    const ItemSlotStyle = itemIndex === this.props.selectedSlot ? SelectedItemSlot : ItemSlot;
                    if (inventory[itemIndex] === undefined) {
                        return (
                            <ItemSlotStyle key={i}>
                                <OverlayTrigger placement="top" overlay={<Tooltip>Empty</Tooltip>}>
                                    <EmptyItemImage />
                                </OverlayTrigger>
                            </ItemSlotStyle>
                        );
                    }

                    const { name, count } = inventory[itemIndex];
                    const nameSplit = name.split(':');
                    const itemNameFromSplit = nameSplit[nameSplit.length - 1];
                    const spriteLookupName =
                        nameSplit[0] !== 'minecraft' || SpriteTable[itemNameFromSplit] === undefined ? '???' : itemNameFromSplit;
                    const spritePosition = SpriteTable[spriteLookupName];
                    const spriteY = 32 * Math.floor(spritePosition / 32);
                    const spriteX = 32 * (spritePosition - spriteY - 1);

                    return (
                        <ItemSlotStyle key={i}>
                            <OverlayTrigger placement="top" overlay={<Tooltip>{name}</Tooltip>}>
                                <ItemContainer>
                                    <ItemImage
                                        style={{ backgroundImage: 'url(/sprites.png)', backgroundPosition: `-${spriteX}px -${spriteY}px` }}
                                    />
                                    <ItemCount>{count}</ItemCount>
                                </ItemContainer>
                            </OverlayTrigger>
                        </ItemSlotStyle>
                    );
                })}
            </InventoryGrid>
        );
    }

    render() {
        return (
            <div className="container-fluid">
                <br />
                <h3>
                    {this.props.name || 'Unknown Turtle'}
                    {this.props.isOnline ? <GreenOnlineBox /> : <GreyOnlineBox />}
                </h3>
                <PositionText>
                    {this.props.direction ? `${this.directionToString(this.props.direction)}` : '_'} (
                    {this.props.location ? `${this.props.location.x}, ${this.props.location.y}, ${this.props.location.z}` : '?, ?, ?'})
                </PositionText>
                <FuelInfo {...this.props} />
                <hr />
                {this.renderInventory(this.props.inventory)}
                <br />
                <Canvas
                    draw={(ctx, frameCount) => this.draw(ctx, frameCount)}
                    style={{ border: '1px solid #fff' }}
                    width="700"
                    height="700"
                />
                <br />
                <ul>
                    {this.props.queue &&
                        this.props.queue.map((q) => (
                            <li>
                                {q.priority} ({q.x},{q.y},{q.z})
                            </li>
                        ))}
                </ul>
            </div>
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

const PositionText = styled.small`
    float: right;
    color: #8b8b8b;
`;

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

// width = 4 * ItemSlot:width + 2 * InventoryGrid:padding + 5 * ItemSlot:padding
const InventoryGrid = styled.div`
    width: 276px;
    display: grid;
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

export default Turtle;
