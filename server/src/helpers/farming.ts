// TODO: Add farming instructions for:
// - pumpkin => minecraft:pumpkin_stem
// - watermelon => ?
// - kelp => ? => maxAge: 25
// - bamboo => ? => maxAge: ?
// - sugar cane => minecraft:sugar_cane => maxAge: 15
// - chorus fruit => ? => maxAge: 5
// - mushrooms => ?
// - cactus => minecraft:cactus => maxAge: 15
export const blockToFarmingDetailsMapObject: {
    [key: string]: {
        seed: string;
        harvest: string;
        maxAge: number;
    }
} = {
    'minecraft:wheat': {
        seed: 'minecraft:wheat_seeds',
        harvest: 'minecraft:wheat',
        maxAge: 7,
    },
    'minecraft:carrots': {
        seed: 'minecraft:carrot',
        harvest: 'minecraft:carrot',
        maxAge: 7,
    },
    'minecraft:potatoes': {
        seed: 'minecraft:potato',
        harvest: 'minecraft:potato',
        maxAge: 7,
    },
    'minecraft:beetroots': {
        seed: 'minecraft:beetroot_seeds',
        harvest: 'minecraft:beetroot',
        maxAge: 3,
    },
    'minecraft:nether_wart': {
        seed: 'minecraft:nether_wart',
        harvest: 'minecraft:nether_wart',
        maxAge: 3,
    },
    'minecraft:sweet_berry_bush': {
        seed: 'minecraft:sweet_berries',
        harvest: 'minecraft:sweet_berries',
        maxAge: 3,
    },
};
export const farmingSeedNames = Object.values(blockToFarmingDetailsMapObject).map((seedObject) => seedObject.seed);
