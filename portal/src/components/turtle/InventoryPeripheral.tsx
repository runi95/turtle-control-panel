import styled from 'styled-components';
import {Action, ItemDetail, Turtle} from '../../App';
import Item from './Item';

export interface InventoryPeripheralContent {
    [key: number]: ItemDetail | null;
}

export interface InventoryPeripheralProps {
    side: string;
    size: number | null;
    content: InventoryPeripheralContent | null;
    connected: boolean;
    turtle: Turtle;
    action: Action;
}

function InventoryPeripheral(props: InventoryPeripheralProps) {
    const {side, turtle, action, size, content} = props;

    const renderTiles = (size: number | null, content: InventoryPeripheralContent | null) => {
        if (size === null) return null;

        const tiles = [];
        for (let i = 0; i < size; i++) {
            const itemDetail = content === null ? null : content[i];
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
                {renderTiles(size, content)}
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
