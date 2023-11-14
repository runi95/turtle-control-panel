// TODO: Add farming instructions for:
// - pumpkin => minecraft:pumpkin_stem
// - watermelon => ?
// - kelp => ? => maxAge: 25
// - bamboo => ? => maxAge: ?
// - sugar cane => minecraft:sugar_cane => maxAge: 15
// - chorus fruit => ? => maxAge: 5
// - mushrooms => ?
// - cactus => minecraft:cactus => maxAge: 15
const farmingBlockToSeedMapObject = {
    'minecraft:wheat': {
        seed: 'minecraft:wheat_seeds',
        maxAge: 7,
    },
    'minecraft:carrots': {
        seed: 'minecraft:carrot',
        maxAge: 7,
    },
    'minecraft:potatoes': {
        seed: 'minecraft:potato',
        maxAge: 7,
    },
    'minecraft:beetroots': {
        seed: 'minecraft:beetroot_seeds',
        maxAge: 3,
    },
    'minecraft:nether_wart': {
        seed: 'minecraft:nether_wart',
        maxAge: 3,
    },
    'minecraft:sweet_berry_bush': {
        seed: 'minecraft:sweet_berries',
        maxAge: 3,
    },
};
const farmingSeedNames = Object.values(farmingBlockToSeedMapObject).map((seedObject) => seedObject.seed);

module.exports = {
    farmingBlockToSeedMapObject,
    farmingSeedNames,
};
