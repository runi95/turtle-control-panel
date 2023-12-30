import styled from 'styled-components';
import {Action, Direction, Turtle} from '../../App';
import {ExternalInventory, useInventories} from '../../api/UseInventories';
import {useParams} from 'react-router-dom';
import Item from './Item';

export interface InventoryPeripheralProps {
    side: string;
    size: number | null;
    connected: boolean;
    turtle: Turtle;
    action: Action;
}

function InventoryPeripheral(props: InventoryPeripheralProps) {
    const {serverId} = useParams() as {serverId: string};
    const {side, turtle, action} = props;
    const {data: externalInventories} = useInventories(serverId);

    const {location, direction} = turtle;
    const {x, y, z} = location;
    const path = (() => {
        if (side === 'top') {
            return `${x},${y + 1},${z}`;
        } else if (side === 'bottom') {
            return `${x},${y - 1},${z}`;
        } else if (side === 'front') {
            switch (direction) {
                case Direction.West:
                    return `${x - 1},${y},${z}`;
                case Direction.North:
                    return `${x},${y},${z - 1}`;
                case Direction.East:
                    return `${x + 1},${y},${z}`;
                case Direction.South:
                    return `${x},${y},${z + 1}`;
            }
        } else if (side === 'back') {
            switch (direction) {
                case Direction.West:
                    return `${x + 1},${y},${z}`;
                case Direction.North:
                    return `${x},${y},${z + 1}`;
                case Direction.East:
                    return `${x - 1},${y},${z}`;
                case Direction.South:
                    return `${x},${y},${z - 1}`;
            }
        } else if (side === 'left') {
            switch (direction) {
                case Direction.West:
                    return `${x},${y},${z + 1}`;
                case Direction.North:
                    return `${x - 1},${y},${z}`;
                case Direction.East:
                    return `${x},${y},${z - 1}`;
                case Direction.South:
                    return `${x + 1},${y},${z}`;
            }
        } else if (side === 'right') {
            switch (direction) {
                case Direction.West:
                    return `${x},${y},${z - 1}`;
                case Direction.North:
                    return `${x + 1},${y},${z}`;
                case Direction.East:
                    return `${x},${y},${z + 1}`;
                case Direction.South:
                    return `${x - 1},${y},${z}`;
            }
        } else {
            return `${x},${y},${z}`;
        }
    })();

    const externalInventory = externalInventories?.[path];

    const renderTiles = (externalInventory: ExternalInventory) => {
        const tiles = [];
        for (let i = 0; i < externalInventory.size; i++) {
            const itemDetail = externalInventory.content[i];
            const isEmpty = itemDetail == null;
            tiles.push(
                <Item
                    key={i}
                    displayName={isEmpty ? 'Empty' : itemDetail.displayName ?? itemDetail.name}
                    isSelected={false}
                    index={i + 1}
                    item={isEmpty ? null : {name: itemDetail.name, count: itemDetail.count}}
                    onDrop={(fromSlot: number, toSlot: number) => {
                        props.action({
                            type: 'ACTION',
                            action: 'inventory-push-items',
                            data: {
                                id: turtle.id,
                                side,
                                fromSlot,
                                toSlot,
                            },
                        });
                    }}
                    onClick={undefined}
                />
            );
        }

        return tiles;
    };

    return (
        <div className='inventory-container'>
            <InventoryGrid>
                <div
                    className='text-muted'
                    style={{gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between'}}
                >
                    <button
                        className='text-muted inventory-button'
                        onClick={() =>
                            action({
                                type: 'ACTION',
                                action: 'connect-to-inventory',
                                data: {id: turtle.id, side},
                            })
                        }
                        disabled={!turtle.isOnline || !turtle.location || !turtle.direction}
                    >
                        <b>Refresh</b>
                    </button>
                    <div style={{fontWeight: 'bold'}}>
                        Inventory side (<span className='text-primary'>{side}</span>)
                    </div>
                </div>
                {externalInventory !== undefined ? renderTiles(externalInventory) : null}
            </InventoryGrid>
        </div>
    );
}

const InventoryGrid = styled.div`
    display: inline-grid;
    grid-template-columns: auto auto auto auto auto auto auto auto auto;
    grid-gap: 6px;
`;

export default InventoryPeripheral;
