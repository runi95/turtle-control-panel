import styled from 'styled-components';
import SpriteTable from '../../SpriteTable';

export interface ItemSpriteProps {
    name: string;
    index: number;
}

function ItemSprite(props: ItemSpriteProps) {
    const {name, index} = props;
    const sprite = SpriteTable[name] ?? SpriteTable['???'];
    const spriteY = 32 * Math.floor(sprite.index / 32);
    const spriteX = 32 * (sprite.index - spriteY - 1);

    return (
        <ItemImage
            data-inventory-slot={index}
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
