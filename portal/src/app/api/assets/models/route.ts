import { promises as fs } from "fs";
import { Models } from "../../../hooks/useModels";

export async function GET() {
  const models = JSON.parse(
    await fs.readFile("assets/models.json", "utf-8"),
  ) as Models;
  models["unknown"] = {
    parent: "minecraft:block/cube_all",
    textures: {
      all: "unknown",
    },
  };

  models["minecraft:block/chest_template"] = {
    parent: "block/block",
    elements: [
      {
        from: [1, 0, 1],
        to: [15, 10, 15],
        faces: {
          down: { uv: [3.5, 4.75, 7, 8.25], texture: "#all" },
          up: { uv: [7, 8.25, 10.5, 4.75], texture: "#all" },
          north: {
            uv: [7, 10.75, 3.5, 8.25],
            texture: "#all",
          },
          south: {
            uv: [14, 10.75, 10.5, 8.25],
            texture: "#all",
          },
          west: {
            uv: [3.5, 10.75, 0, 8.25],
            texture: "#all",
          },
          east: {
            uv: [10.5, 10.75, 7, 8.25],
            texture: "#all",
          },
        },
      },
      {
        from: [1, 9.75, 1],
        to: [15, 14.75, 15],
        faces: {
          down: { uv: [3.5, 0, 7, 3.5], texture: "#all" },
          up: { uv: [7, 3.5, 10.5, 0], texture: "#all" },
          north: {
            uv: [7, 4.75, 3.5, 3.5],
            texture: "#all",
          },
          south: {
            uv: [14, 4.75, 10.5, 3.5],
            texture: "#all",
          },
          west: {
            uv: [3.5, 4.75, 0, 3.5],
            texture: "#all",
          },
          east: {
            uv: [10.5, 4.75, 7, 3.5],
            texture: "#all",
          },
        },
      },
      {
        from: [7, 6.75, 15],
        to: [9, 11.75, 16],
        faces: {
          down: {
            uv: [0.25, 0, 0.75, 0.25],
            texture: "#all",
          },
          up: { uv: [0.75, 0, 1.25, 0.25], texture: "#all" },
          north: {
            uv: [0.25, 0.25, 0.75, 1.25],
            texture: "#all",
          },
          south: {
            uv: [1.5, 1.25, 1, 0.25],
            texture: "#all",
          },
          west: {
            uv: [0, 1, 0.25, 0.25],
            texture: "#all",
          },
          east: {
            uv: [0.75, 1, 1, 0.25],
            texture: "#all",
          },
        },
      },
    ],
  };

  models["minecraft:block/chest"] = {
    parent: "minecraft:block/chest_template",
    textures: {
      all: "minecraft:entity/chest/normal",
    },
  };

  models["minecraft:block/trapped_chest"] = {
    parent: "minecraft:block/chest_template",
    textures: {
      all: "minecraft:entity/chest/trapped",
    },
  };

  models["minecraft:block/ender_chest"] = {
    parent: "minecraft:block/chest_template",
    textures: {
      all: "minecraft:entity/chest/ender",
    },
  };

  models["minecraft:block/chest_left_template"] = {
    elements: [
      {
        from: [0, 0, 1],
        to: [15, 10, 15],
        faces: {
          down: {
            uv: [3.5, 4.75, 7.25, 8.25],
            texture: "#all",
          },
          up: { uv: [7.25, 8.25, 11, 4.75], texture: "#all" },
          north: {
            uv: [7.25, 10.75, 3.5, 8.25],
            texture: "#all",
          },
          south: {
            uv: [14.5, 10.75, 10.75, 8.25],
            texture: "#all",
          },
          east: {
            uv: [10.75, 10.75, 7.25, 8.25],
            texture: "#all",
          },
        },
      },
      {
        from: [0, 9.75, 1],
        to: [15, 14.75, 15],
        faces: {
          down: { uv: [3.5, 0, 7.25, 3.5], texture: "#all" },
          up: { uv: [7.25, 3.5, 11, 0], texture: "#all" },
          north: {
            uv: [7.25, 4.75, 3.5, 3.5],
            texture: "#all",
          },
          south: {
            uv: [14.5, 4.75, 10.75, 3.5],
            texture: "#all",
          },
          east: {
            uv: [10.75, 4.75, 7.25, 3.5],
            texture: "#all",
          },
        },
      },
      {
        from: [0, 6.75, 15],
        to: [1, 11.75, 16],
        faces: {
          down: {
            uv: [0.25, 0, 0.5, 0.25],
            texture: "#all",
          },
          up: { uv: [0.5, 0, 0.75, 0.25], texture: "#all" },
          north: {
            uv: [1, 1.25, 0.75, 0.25],
            texture: "#all",
          },
          south: {
            uv: [0.75, 1.25, 0.5, 0.25],
            texture: "#all",
          },
          east: {
            uv: [0.5, 1.25, 0.75, 0.25],
            texture: "#all",
          },
        },
      },
    ],
  };

  models["minecraft:block/chest_left"] = {
    parent: "minecraft:block/chest_left_template",
    textures: {
      all: "minecraft:entity/chest/normal_left",
    },
  };

  models["minecraft:block/trapped_chest_left"] = {
    parent: "minecraft:block/chest_left_template",
    textures: {
      all: "minecraft:entity/chest/trapped_left",
    },
  };

  models["minecraft:block/chest_right_template"] = {
    elements: [
      {
        from: [1, 0, 1],
        to: [16, 10, 15],
        faces: {
          down: { uv: [3.5, 4.75, 7, 8.25], texture: "#all" },
          up: { uv: [7.25, 8.25, 11, 4.75], texture: "#all" },
          north: {
            uv: [7, 10.75, 3.5, 8.25],
            texture: "#all",
          },
          south: {
            uv: [14.5, 10.75, 10.75, 8.25],
            texture: "#all",
          },
          west: {
            uv: [3.5, 10.75, 0, 8.25],
            texture: "#all",
          },
        },
      },
      {
        from: [1, 9.75, 1],
        to: [16, 14.75, 15],
        faces: {
          down: { uv: [3.5, 0, 7, 3.5], texture: "#all" },
          up: { uv: [7.25, 3.5, 11, 0], texture: "#all" },
          north: {
            uv: [7, 4.75, 3.5, 3.5],
            texture: "#all",
          },
          south: {
            uv: [14.5, 4.75, 10.75, 3.5],
            texture: "#all",
          },
          west: {
            uv: [3.5, 4.75, 0, 3.5],
            texture: "#all",
          },
        },
      },
      {
        from: [15, 6.75, 15],
        to: [16, 11.75, 16],
        faces: {
          down: {
            uv: [0.5, 0, 0.75, 0.25],
            texture: "#all",
          },
          up: { uv: [0.25, 0, 0.5, 0.25], texture: "#all" },
          north: {
            uv: [0.5, 1.25, 0.25, 0.25],
            texture: "#all",
          },
          south: {
            uv: [1, 1.25, 0.75, 0.25],
            texture: "#all",
          },
          west: {
            uv: [0, 1.25, 0.25, 0.25],
            texture: "#all",
          },
        },
      },
    ],
  };

  models["minecraft:block/chest_right"] = {
    parent: "minecraft:block/chest_right_template",
    textures: {
      all: "minecraft:entity/chest/normal_right",
    },
  };

  models["minecraft:block/trapped_chest_right"] = {
    parent: "minecraft:block/chest_right_template",
    textures: {
      all: "minecraft:entity/chest/trapped_right",
    },
  };

  models["minecraft:block/bed_head_template"] = {
    elements: [
      {
        from: [0, 3, 0],
        to: [16, 9, 16],
        faces: {
          down: { uv: [7, 1.5, 11, 5.5], texture: "#all" },
          up: { uv: [1.5, 5.5, 5.5, 1.5], texture: "#all" },
          south: {
            uv: [1.5, 1.5, 5.5, 0],
            texture: "#all",
          },
          west: {
            uv: [5.5, 1.5, 7, 5.5],
            texture: "#all",
            rotation: 90,
          },
          east: {
            uv: [0, 1.5, 1.5, 5.5],
            texture: "#all",
            rotation: 270,
          },
        },
      },
      {
        from: [0, 0, 13],
        to: [3, 3, 16],
        faces: {
          down: { uv: [14, 0, 14.75, 0.75], texture: "#all" },
          north: {
            uv: [14.75, 0.75, 15.5, 1.5],
            texture: "#all",
          },
          south: {
            uv: [13.25, 0.75, 14, 1.5],
            texture: "#all",
          },
          west: {
            uv: [12.5, 0.75, 13.25, 1.5],
            texture: "#all",
          },
          east: {
            uv: [14, 0.75, 14.75, 1.5],
            texture: "#all",
          },
        },
      },
      {
        from: [13, 0, 13],
        to: [16, 3, 16],
        faces: {
          down: { uv: [14.75, 1.5, 14, 2.25], texture: "#all" },
          north: {
            uv: [15.5, 2.25, 14.75, 3],
            texture: "#all",
          },
          south: {
            uv: [14, 2.25, 13.25, 3],
            texture: "#all",
          },
          west: {
            uv: [14.75, 2.25, 14, 3],
            texture: "#all",
          },
          east: {
            uv: [13.25, 2.25, 14, 3],
            texture: "#all",
          },
        },
      },
    ],
  };

  models["minecraft:block/bed_foot_template"] = {
    elements: [
      {
        from: [0, 3, 0],
        to: [16, 9, 16],
        faces: {
          down: { uv: [7, 7, 11, 11], texture: "#all" },
          up: { uv: [1.5, 11, 5.5, 7], texture: "#all" },
          north: {
            uv: [5.5, 7, 9.5, 5.5],
            texture: "#all",
          },
          west: {
            uv: [5.5, 7, 7, 11],
            texture: "#all",
            rotation: 90,
          },
          east: {
            uv: [0, 7, 1.5, 11],
            texture: "#all",
            rotation: 270,
          },
        },
      },
      {
        from: [0, 0, 0],
        to: [3, 3, 3],
        faces: {
          down: { uv: [14, 3, 14.75, 3.75], texture: "#all" },
          north: {
            uv: [12.5, 3.75, 13.25, 4.5],
            texture: "#all",
          },
          south: {
            uv: [15.5, 3.75, 14.75, 4.5],
            texture: "#all",
          },
          west: {
            uv: [13.25, 3.75, 14, 4.5],
            texture: "#all",
          },
          east: {
            uv: [14.75, 3.75, 14, 4.5],
            texture: "#all",
          },
        },
      },
      {
        from: [13, 0, 0],
        to: [16, 3, 3],
        faces: {
          down: { uv: [14.75, 4.5, 14, 5.25], texture: "#all" },
          north: {
            uv: [13.25, 5.25, 14, 6],
            texture: "#all",
          },
          south: {
            uv: [14.75, 5.25, 14, 6],
            texture: "#all",
          },
          west: {
            uv: [14, 5.25, 14.75, 6],
            texture: "#all",
          },
          east: {
            uv: [14, 5.25, 13.25, 6],
            texture: "#all",
          },
        },
      },
    ],
  };

  const addBedModel = (color: string) => {
    models[`minecraft:block/${color}_bed_head`] = {
      parent: "minecraft:block/bed_head_template",
      textures: {
        all: `minecraft:entity/bed/${color}`,
      },
    };
    models[`minecraft:block/${color}_bed_foot`] = {
      parent: "minecraft:block/bed_foot_template",
      textures: {
        all: `minecraft:entity/bed/${color}`,
      },
    };
  };
  addBedModel("black");
  addBedModel("blue");
  addBedModel("brown");
  addBedModel("cyan");
  addBedModel("gray");
  addBedModel("green");
  addBedModel("light_blue");
  addBedModel("light_gray");
  addBedModel("lime");
  addBedModel("magenta");
  addBedModel("orange");
  addBedModel("pink");
  addBedModel("purple");
  addBedModel("red");
  addBedModel("white");
  addBedModel("yellow");

  models["minecraft:block/shulker_box_template"] = {
    elements: [
      {
        from: [0, 4, 0],
        to: [16, 16, 16],
        faces: {
          down: { uv: [8, 0, 12, 4], texture: "#all" },
          up: { uv: [4, 0, 8, 4], texture: "#all" },
          north: {
            uv: [0, 4, 4, 7],
            texture: "#all",
          },
          south: {
            uv: [4, 4, 8, 7],
            texture: "#all",
          },
          west: {
            uv: [8, 4, 12, 7],
            texture: "#all",
          },
          east: {
            uv: [12, 4, 16, 7],
            texture: "#all",
          },
        },
      },
      {
        from: [0, 0, 0],
        to: [16, 8, 16],
        faces: {
          down: { uv: [8, 7, 12, 11], texture: "#all" },
          up: { uv: [4, 7, 8, 11], texture: "#all" },
          north: {
            uv: [0, 11, 4, 13],
            texture: "#all",
          },
          south: {
            uv: [4, 11, 8, 13],
            texture: "#all",
          },
          west: {
            uv: [8, 11, 12, 13],
            texture: "#all",
          },
          east: {
            uv: [12, 11, 16, 13],
            texture: "#all",
          },
        },
      },
    ],
  };

  const addShulkerBox = (prefix?: string) => {
    models[`minecraft:block/${prefix != null ? `${prefix}_` : ""}shulker_box`] =
      {
        parent: "minecraft:block/shulker_box_template",
        textures: {
          all: `minecraft:entity/shulker/shulker${prefix != null ? `_${prefix}` : ""}`,
        },
      };
  };
  addShulkerBox();
  addShulkerBox("white");
  addShulkerBox("light_gray");
  addShulkerBox("gray");
  addShulkerBox("black");
  addShulkerBox("brown");
  addShulkerBox("red");
  addShulkerBox("orange");
  addShulkerBox("yellow");
  addShulkerBox("lime");
  addShulkerBox("green");
  addShulkerBox("cyan");
  addShulkerBox("light_blue");
  addShulkerBox("blue");
  addShulkerBox("purple");
  addShulkerBox("magenta");
  addShulkerBox("pink");

  return Response.json(models);
}
