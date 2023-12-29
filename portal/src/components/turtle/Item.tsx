import styled from 'styled-components';
import ItemSprite from './ItemSprite';

export interface ItemProps {
    name: string;
    index: number;
    count: number;
}

function Item(props: ItemProps) {
    const {name, count, index} = props;

    return (
        <div>
            <ItemSprite index={index} name={name} />
            <ItemCount data-inventory-slot={index}>{count}</ItemCount>
        </div>
    );
}

const ItemCount = styled.span`
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 24px;
    line-height: 24px;
    user-select: none;
`;

export default Item;
