import React, { Component } from 'react';
import styled from 'styled-components';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import SpriteTable from '../SpriteTable.json';
import FuelInfo from './FuelInfo';
import Canvas from './Canvas';

const canvasSize = 160;
const canvasRadius = 0.5 * canvasSize;
const circleSizeMul = 0.35;
const spriteSize = 10;
const spriteRadius = 0.5 * spriteSize;
const mul = canvasSize / spriteSize;
const centerX = 0.5 * spriteSize * mul;
const centerY = 0.5 * spriteSize * mul;

class Turtle extends Component {
    directionToString(direction) {
        return ['W', 'N', 'E', 'S'][direction - 1];
    }

    draw(ctx) {
        if (!this.props.turtles || !this.props.turtles[this.props.selectedTurtle] || !this.props.world) {
            return;
        }

        const turtle = this.props.turtles[this.props.selectedTurtle];
        const { x, y, z } = turtle.location;

        // Clear
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw blocks
        const drawRange = 0.5 * mul;
        for (let i = -drawRange; i <= drawRange; i++) {
            for (let j = -drawRange; j <= drawRange; j++) {
                const wX = x + i;
                const wZ = z + j;
                if (this.props.world[`${wX},${y},${wZ}`] !== undefined) {
                    ctx.fillStyle = 'black';
                    ctx.fillRect(
                        (i + drawRange) * spriteSize - spriteRadius,
                        (j + drawRange) * spriteSize - spriteRadius,
                        spriteSize,
                        spriteSize,
                    );
                }
            }
        }

        // Draw other turtles
        const keys = Object.keys(this.props.turtles);
        for (let key of keys) {
            if (key !== turtle.id.toString()) {
                const otherTurtle = this.props.turtles[key];
                if (otherTurtle.location.y === turtle.location.y) {
                    ctx.beginPath();
                    ctx.fillStyle = otherTurtle.isOnline ? 'white' : '#696969';
                    const posX = (otherTurtle.location.x - turtle.location.x) * spriteSize + centerX;
                    const posY = (otherTurtle.location.z - turtle.location.z) * spriteSize + centerY;
                    ctx.arc(posX, posY, circleSizeMul * spriteSize, 0, 2 * Math.PI, false);
                    ctx.fill();

                    ctx.textAlign = 'center';
                    ctx.strokeStyle = 'black';
                    ctx.font = '10px Ariel';
                    ctx.lineWidth = 4;
                    ctx.strokeText(otherTurtle.name, posX, posY - spriteRadius);
                    ctx.fillText(otherTurtle.name, posX, posY - spriteRadius);
                }
            }
        }

        // Draw current turtle
        ctx.beginPath();
        ctx.fillStyle = 'yellow';
        ctx.arc(centerX, centerY, circleSizeMul * spriteSize, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.font = '10px Ariel';
        ctx.lineWidth = 4;
        ctx.strokeText(turtle.name, centerX, centerY - spriteRadius);
        ctx.fillText(turtle.name, centerX, centerY - spriteRadius);
    }

    renderInventory(inventory, selectedSlot) {
        if (inventory === undefined) {
            return <div></div>;
        }

        return (
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
        const turtle = this.props.turtles ? this.props.turtles[this.props.selectedTurtle] || {} : {};
        return (
            <div className="container-fluid">
                <br />
                <h3>
                    {turtle.name || 'Unknown Turtle'}
                    {turtle.isOnline ? <GreenOnlineBox /> : <GreyOnlineBox />}
                </h3>
                <PositionText>
                    {turtle.direction ? `${this.directionToString(turtle.direction)}` : '_'} (
                    {turtle.location ? `${turtle.location.x}, ${turtle.location.y}, ${turtle.location.z}` : '?, ?, ?'})
                </PositionText>
                <FuelInfo {...turtle} />
                <hr />
                {this.renderInventory(turtle.inventory, turtle.selectedSlot)}
                <br />
                <Canvas
                    draw={(ctx, frameCount) => this.draw(ctx, frameCount)}
                    style={{ border: '1px solid #fff', borderRadius: canvasRadius }}
                    width={canvasSize}
                    height={canvasSize}
                />
                <br />
                <ul>
                    {turtle.queue &&
                        turtle.queue.map((q) => (
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
