import styled from 'styled-components';
import SpriteTable from '../../../../SpriteTable';

export interface ItemSpriteProps {
    slot: number;
    name: string;
}

function ItemSprite(props: ItemSpriteProps) {
    const {name, slot} = props;
    const sprite = SpriteTable[name] ?? SpriteTable['???'];
    const spriteY = 32 * Math.floor((sprite.index - 1) / 32);
    const spriteX = 32 * (sprite.index - spriteY - 1);

    return (
        <ItemImage
            data-inventory-slot={slot}
            style={{
                backgroundImage: 'url(/sprites.png)',
                backgroundPosition: `-${spriteX}px -${spriteY}px`,
            }}
        />
    );
}

const ItemImage = styled.span`
    image-rendering: crisp-edges;
    width: 32px;
    height: 32px;
    display: inline-block;
    background-repeat: no-repeat;
`;

export default ItemSprite;
