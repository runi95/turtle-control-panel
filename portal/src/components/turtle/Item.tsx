import styled from 'styled-components';
import ItemSprite from './ItemSprite';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

export interface ItemProps {
    displayName: string;
    isSelected: boolean;
    index: number;
    item: {
        name: string;
        count: number;
    } | null;
    onDrop: (fromSlot: number, toSlot: number) => void;
    onClick?: () => void;
}

function Item(props: ItemProps) {
    const {displayName, isSelected, index, item, onDrop, onClick} = props;
    const ItemSlotStyle = isSelected ? SelectedItemSlot : ItemSlot;

    return (
        <OverlayTrigger placement='top' overlay={<Tooltip data-bs-theme='light'>{displayName}</Tooltip>}>
            <ItemSlotStyle
                draggable
                data-inventory-slot={index}
                onDragStart={(e) => {
                    e.dataTransfer.setData('fromSlot', index.toString());
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const toSlot = (e.target as HTMLBaseElement)?.dataset?.inventorySlot;
                    const fromSlot = e.dataTransfer.getData('fromSlot');
                    if (fromSlot && toSlot && fromSlot !== toSlot) {
                        onDrop(Number(fromSlot), Number(toSlot));
                    }
                }}
                onClick={onClick}
            >
                {item === null ? (
                    <EmptyItemImage data-inventory-slot={index} />
                ) : (
                    <div>
                        <ItemSprite index={index} name={item.name} />
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
