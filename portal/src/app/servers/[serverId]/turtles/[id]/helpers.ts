import spriteTable from "./spriteTable";

const textureDefs: {
  block: string;
  textures: string | string[];
}[] = [
  {
    block: "unknown",
    textures: "unknown",
  },
  {
    block: "minecraft:sand",
    textures: "sand",
  },
  {
    block: "minecraft:cactus",
    textures: [
      "cactus_side",
      "cactus_side",
      "cactus_top",
      "cactus_bottom",
      "cactus_side",
      "cactus_side",
    ],
  },
  {
    block: "minecraft:sandstone",
    textures: [
      "sandstone",
      "sandstone",
      "sandstone_top",
      "sandstone_bottom",
      "sandstone",
      "sandstone",
    ],
  },
  {
    block: "minecraft:dirt",
    textures: "dirt",
  },
  {
    block: "minecraft:stone",
    textures: "stone",
  },
];

export const getBlockTypes = () => {
  const textureSet = new Set<string>();
  for (const { textures } of textureDefs) {
    const isArray = textures instanceof Array;
    if (isArray) {
      textures.forEach((texture) => textureSet.add(texture));
    } else {
      textureSet.add(textures);
    }
  }

  const textures = Array.from(textureSet);
  const textureMap = new Map<string, number[]>();
  for (const { block, textures: texturesFromDef } of textureDefs) {
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

export const blockNameOverride = (blockName: string) => {
  switch (blockName) {
    case "minecraft:wheat":
      return "minecraft:wheat_stage7";
    case "minecraft:cocoa":
      return "minecraft:cocoa_stage2";
    case "minecraft:beetroots":
      return "minecraft:beetroots_stage3";
    case "minecraft:carrots":
      return "minecraft:carrots_stage3";
    case "minecraft:melon_stem":
      return "minecraft:melon_stem_stage6";
    case "minecraft:pumpkin_stem":
      return "minecraft:pumpkin_stem_stage6";
    case "minecraft:nether_wart":
      return "minecraft:nether_wart_stage2";
    case "minecraft:potatoes":
      return "minecraft:potatoes_stage3";
    case "minecraft:sweet_berry_bush":
      return "minecraft:sweet_berry_bush_stage3";
    case "minecraft:torchflower_crop":
      return "minecraft:torchflower_crop_stage1";
    case "minecraft:bamboo":
      return "minecraft:bamboo4_age1";
    case "minecraft:snow":
      return "minecraft:snow_height2";
    case "minecraft:tall_grass":
      return "minecraft:tall_grass_bottom";
    case "minecraft:tall_seagrass":
      return "minecraft:tall_seagrass_bottom";
    case "computercraft:wireless_modem_normal":
      return "computercraft:wireless_modem_normal_on";
    case "computercraft:wired_modem":
      return "computercraft:wired_modem_on";
    case "computercraft:computer_normal":
      return "computercraft:computer_normal_on";
    case "computercraft:disk_drive":
      return "computercraft:disk_drive_full";
    case "computercraft:printer":
      return "computercraft:printer_both_full";
    case "computercraft:wired_modem_full":
      return "computercraft:wired_modem_full_off";
    default:
      return blockName;
  }
};

export const BlockNames: string[] = Object.keys(spriteTable).slice(2);
