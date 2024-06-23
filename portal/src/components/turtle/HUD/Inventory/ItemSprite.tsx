import styled from 'styled-components';
import {useSpriteTable} from './UseSpriteTable';
import {useMemo} from 'react';

export interface ItemSpriteProps {
    slot?: number;
    name: string;
}

function ItemSprite(props: ItemSpriteProps) {
    const {name, slot} = props;
    const {data} = useSpriteTable();
    const sprite = useMemo(() => {
        if (data == null) return 0;
        return data[name] ?? 0;
    }, [data, name]);
    const spriteY = 32 * Math.floor(sprite / 32);
    const spriteX = 32 * (sprite - spriteY);

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
