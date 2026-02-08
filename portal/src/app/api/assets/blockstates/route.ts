import { promises as fs } from "fs";
import { Blockstates } from "../../../hooks/useBlockstates";

export async function GET() {
  const blockstates = JSON.parse(
    await fs.readFile("assets/blockstates.json", "utf-8"),
  ) as Blockstates;
  blockstates["unknown"] = {
    variants: {
      "": {
        model: "unknown",
      },
    },
  };

  const addChestToBlockstates = (prefix: string, canCombine: boolean) => {
    const blockstateVariant = {
      variants: {
        [`${canCombine ? "type=single," : ""}facing=east`]: {
          model: `minecraft:block/${prefix}chest`,
          y: 270,
        },
        [`${canCombine ? "type=single," : ""}facing=north`]: {
          model: `minecraft:block/${prefix}chest`,
          y: 180,
        },
        [`${canCombine ? "type=single," : ""}facing=south`]: {
          model: `minecraft:block/${prefix}chest`,
        },
        [`${canCombine ? "type=single," : ""}facing=west`]: {
          model: `minecraft:block/${prefix}chest`,
          y: 90,
        },
      },
    };
    blockstates[`minecraft:${prefix}chest`] = blockstateVariant;

    if (!canCombine) return;

    blockstateVariant.variants["type=left,facing=east"] = {
      model: `minecraft:block/${prefix}chest_left`,
      y: 270,
    };
    blockstateVariant.variants["type=left,facing=north"] = {
      model: `minecraft:block/${prefix}chest_left`,
      y: 180,
    };
    blockstateVariant.variants["type=left,facing=south"] = {
      model: `minecraft:block/${prefix}chest_left`,
    };
    blockstateVariant.variants["type=left,facing=west"] = {
      model: `minecraft:block/${prefix}chest_left`,
      y: 90,
    };
    blockstateVariant.variants["type=right,facing=east"] = {
      model: `minecraft:block/${prefix}chest_right`,
      y: 270,
    };
    blockstateVariant.variants["type=right,facing=north"] = {
      model: `minecraft:block/${prefix}chest_right`,
      y: 180,
    };
    blockstateVariant.variants["type=right,facing=south"] = {
      model: `minecraft:block/${prefix}chest_right`,
    };
    blockstateVariant.variants["type=right,facing=west"] = {
      model: `minecraft:block/${prefix}chest_right`,
      y: 90,
    };
  };
  addChestToBlockstates("", true);
  addChestToBlockstates("trapped_", true);
  addChestToBlockstates("ender_", false);

  const addBedToBlockstates = (color: string) => {
    blockstates[`minecraft:${color}_bed`] = {
      variants: {
        "part=head,facing=east": {
          model: `minecraft:block/${color}_bed_head`,
          y: 270,
        },
        "part=head,facing=north": {
          model: `minecraft:block/${color}_bed_head`,
          y: 180,
        },
        "part=head,facing=south": {
          model: `minecraft:block/${color}_bed_head`,
        },
        "part=head,facing=west": {
          model: `minecraft:block/${color}_bed_head`,
          y: 90,
        },
        "part=foot,facing=east": {
          model: `minecraft:block/${color}_bed_foot`,
          y: 270,
        },
        "part=foot,facing=north": {
          model: `minecraft:block/${color}_bed_foot`,
          y: 180,
        },
        "part=foot,facing=south": {
          model: `minecraft:block/${color}_bed_foot`,
        },
        "part=foot,facing=west": {
          model: `minecraft:block/${color}_bed_foot`,
          y: 90,
        },
      },
    };
  };
  addBedToBlockstates("black");
  addBedToBlockstates("blue");
  addBedToBlockstates("brown");
  addBedToBlockstates("cyan");
  addBedToBlockstates("gray");
  addBedToBlockstates("green");
  addBedToBlockstates("light_blue");
  addBedToBlockstates("light_gray");
  addBedToBlockstates("lime");
  addBedToBlockstates("magenta");
  addBedToBlockstates("orange");
  addBedToBlockstates("pink");
  addBedToBlockstates("purple");
  addBedToBlockstates("red");
  addBedToBlockstates("white");
  addBedToBlockstates("yellow");

  const addShulkerBoxToBlockstates = (prefix: string) => {
    blockstates[`minecraft:${prefix}shulker_box`] = {
      variants: {
        "facing=up": {
          model: `minecraft:block/${prefix}shulker_box`,
        },
      },
    };
  };
  addShulkerBoxToBlockstates("");
  addShulkerBoxToBlockstates("white_");
  addShulkerBoxToBlockstates("light_gray_");
  addShulkerBoxToBlockstates("gray_");
  addShulkerBoxToBlockstates("black_");
  addShulkerBoxToBlockstates("brown_");
  addShulkerBoxToBlockstates("red_");
  addShulkerBoxToBlockstates("orange_");
  addShulkerBoxToBlockstates("yellow_");
  addShulkerBoxToBlockstates("lime_");
  addShulkerBoxToBlockstates("green_");
  addShulkerBoxToBlockstates("light_blue_");
  addShulkerBoxToBlockstates("blue_");
  addShulkerBoxToBlockstates("purple_");
  addShulkerBoxToBlockstates("magenta_");
  addShulkerBoxToBlockstates("pink_");

  return Response.json(blockstates);
}
