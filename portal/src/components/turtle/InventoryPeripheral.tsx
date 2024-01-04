import styled from 'styled-components';
import {Action} from '../../App';
import Item from './Item';
import {ItemDetail, useTurtle} from '../../api/UseTurtle';
import {useParams} from 'react-router-dom';

export interface InventoryPeripheralContent {
    [key: number]: ItemDetail | null;
}

export interface InventoryPeripheralProps {
    side: string;
    size: number | null;
    content: InventoryPeripheralContent | null;
    connected: boolean;
    action: Action;
}

function InventoryPeripheral(props: InventoryPeripheralProps) {
    const {side, action, size, content} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {data: turtle} = useTurtle(serverId, id);

    const renderTiles = (turtleId: number, size: number | null, content: InventoryPeripheralContent | null) => {
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
                                id: turtleId,
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

    if (turtle === undefined) return null;

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
                {renderTiles(turtle.id, size, content)}
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
