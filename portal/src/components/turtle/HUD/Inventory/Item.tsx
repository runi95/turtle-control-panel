import styled from 'styled-components';
import ItemSprite from './ItemSprite';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

export interface ItemProps {
    displayName: string;
    isSelected: boolean;
    index: number;
    side: string;
    item: {
        name: string;
        count: number;
    } | null;
    onDrop: (
        shiftKey: boolean,
        fromSide: string,
        fromSlot: number,
        toSlot: number,
        item?: {
            name: string;
            amount: number;
        }
    ) => void;
    onClick?: () => void;
}

function Item(props: ItemProps) {
    const {displayName, isSelected, side, index, item, onDrop, onClick} = props;
    const ItemSlotStyle = isSelected ? SelectedItemSlot : ItemSlot;

    return (
        <OverlayTrigger
            placement='top'
            overlay={
                <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                    {displayName}
                </Tooltip>
            }
        >
            <ItemSlotStyle
                draggable
                data-inventory-slot={index}
                onDragStart={(e) => {
                    e.dataTransfer.setData('fromSlot', index.toString());
                    e.dataTransfer.setData('fromSide', side);
                    if (item != null) {
                        e.dataTransfer.setData('itemName', item.name);
                        e.dataTransfer.setData('itemAmount', item.count.toString());
                    }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const {shiftKey} = e;
                    const fromSide = e.dataTransfer.getData('fromSide');
                    const fromSlot = e.dataTransfer.getData('fromSlot');
                    const itemName = e.dataTransfer.getData('itemName');
                    const itemAmount = e.dataTransfer.getData('itemAmount');
                    const toSlot = (e.target as HTMLBaseElement)?.dataset?.inventorySlot;
                    if (fromSlot && toSlot && fromSlot !== toSlot) {
                        onDrop(
                            shiftKey,
                            fromSide,
                            Number(fromSlot),
                            Number(toSlot),
                            itemName !== '' && itemAmount !== ''
                                ? {
                                      name: itemName,
                                      amount: Number(itemAmount),
                                  }
                                : undefined
                        );
                    }
                }}
                onClick={onClick}
            >
                {item === null ? (
                    <EmptyItemImage data-inventory-slot={index} />
                ) : (
                    <div>
                        <ItemSprite data-inventory-slot={index} name={item.name} />
                        <ItemCount data-inventory-slot={index}>{item.count}</ItemCount>
                    </div>
                )}
            </ItemSlotStyle>
        </OverlayTrigger>
    );
}

const EmptyItemImage = styled.span`
    width: 32px;
    height: 32px;
    background-color: #8b8b8b;
`;

const ItemCount = styled.span`
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 24px;
    line-height: 24px;
    user-select: none;
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

export default Item;
