const textureDefs: {
    block: string;
    textures: string | string[];
}[] = [
    {
        block: 'unknown',
        textures: 'unknown',
    },
    {
        block: 'minecraft:sand',
        textures: 'sand',
    },
    {
        block: 'minecraft:cactus',
        textures: ['cactus_side', 'cactus_side', 'cactus_top', 'cactus_bottom', 'cactus_side', 'cactus_side'],
    },
    {
        block: 'minecraft:sandstone',
        textures: ['sandstone', 'sandstone', 'sandstone_top', 'sandstone_bottom', 'sandstone', 'sandstone'],
    },
    {
        block: 'minecraft:dirt',
        textures: 'dirt',
    },
    {
        block: 'minecraft:stone',
        textures: 'stone',
    },
];

export const getBlockTypes = () => {
    const textureSet = new Set<string>();
    for (const {textures} of textureDefs) {
        const isArray = textures instanceof Array;
        if (isArray) {
            textures.forEach((texture) => textureSet.add(texture));
        } else {
            textureSet.add(textures);
        }
    }

    const textures = Array.from(textureSet);
    const textureMap = new Map<string, number[]>();
    for (const {block, textures: texturesFromDef} of textureDefs) {
        const isArray = texturesFromDef instanceof Array;
        if (isArray) {
            const textureIndexArray = [0, 0, 0, 0, 0, 0];
            for (let i = 0; i < 6; i++) {
                textureIndexArray[i] = textures.indexOf(texturesFromDef[i]);
            }
            textureMap.set(block, textureIndexArray);
        } else {
            const index = textures.indexOf(texturesFromDef);
            textureMap.set(block, [index, index, index, index, index, index]);
        }
    }

    return {
        textures,
        textureMap,
    };
};
