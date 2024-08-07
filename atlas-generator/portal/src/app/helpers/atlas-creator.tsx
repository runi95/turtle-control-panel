import {
  AtlasMap,
  AtlasMapBlockData,
  BlockstatesData,
  Element,
  LoadedBlockstateFile,
  LoadedModelFile,
  ModelData,
} from "../components/landing-page";
import {
  TexturedFace,
  elementToTexturedFaces,
} from "./element-to-texture-faces";
import { getImageData } from "./get-image-data";
import { deepMerge } from "./merge";

type FileTree = {
  [key: string]: FileTree | File;
};

type Result = {
  atlas: Uint8Array;
  atlasMap: AtlasMap;
};

type CustomConfig = {
  add: {
    [key: string]: {
      // Asset
      models: {
        [key: string]: ModelData;
      };
    };
  };
  override: {
    models: {
      [key: string]: ModelData;
    };
    blockstates: {
      [key: string]: BlockstatesData;
    };
  };
};

export const createAtlas = async (
  canvas: HTMLCanvasElement,
  files: FileList
): Promise<Result> => {
  const fileTree: FileTree = {};
  for (const file of files) {
    const split = file.webkitRelativePath.split("/");
    const last = split.reduce((acc, curr, i) => {
      if (curr === "assets" && i === 0) return acc;
      if (i + 1 === split.length) return acc;
      const existing = acc[curr];
      if (existing == null) {
        acc[curr] = {};
      }

      return acc[curr] as FileTree;
    }, fileTree);
    last[split[split.length - 1]] = file;
  }

  const atlasMap: AtlasMap = {
    models: {},
    textures: {
      unknown: {
        model: "cube" as never,
        south: 0,
        north: 0,
        up: 0,
        down: 0,
        west: 0,
        east: 0,
      },
    },
    blockstates: {},
  };
  // let nextTextureIndex = 1;
  // let uvCount = 0;
  const textures = [
    (await getImageData(canvas, "/unknown.png", 0, 0, 16, 16)).data,
  ];
  const texturesMap = new Map([["unknown.png?dx=0&dy=0&dw=16&dh=16", 0]]);
  let nextTextureIndex = 1;

  const shulkerElements: Element[] = [
    {
      from: [0, 0, 0],
      to: [16, 8, 16],
      faces: {
        down: { uv: [8, 7, 12, 11], texture: "#texture" },
        up: { uv: [4, 7, 8, 11], texture: "#texture" },
        north: { uv: [0, 11, 4, 13], texture: "#texture" },
        south: { uv: [8, 11, 12, 13], texture: "#texture" },
        west: { uv: [12, 11, 16, 13], texture: "#texture" },
        east: { uv: [4, 11, 8, 13], texture: "#texture" },
      },
    },
    {
      from: [0, 4, 0],
      to: [16, 16, 16],
      faces: {
        down: { uv: [8, 0, 12, 4], texture: "#texture" },
        up: { uv: [4, 0, 8, 4], texture: "#texture" },
        north: { uv: [0, 4, 4, 7], texture: "#texture" },
        south: { uv: [8, 4, 12, 7], texture: "#texture" },
        west: { uv: [12, 4, 16, 7], texture: "#texture" },
        east: { uv: [4, 4, 8, 7], texture: "#texture" },
      },
    },
  ];

  const customConfig: CustomConfig = {
    add: {
      minecraft: {
        models: {
          "chest_right.json": {
            parent: "block/block",
            textures: {
              texture: "minecraft:entity/chest/normal_right",
            },
            elements: [
              {
                from: [0, 0, 1],
                to: [15, 10, 15],
                faces: {
                  down: { uv: [7.25, 8.25, 3.5, 4.75], texture: "#texture" },
                  up: { uv: [11, 8.25, 7.25, 4.75], texture: "#texture" },
                  north: {
                    uv: [14.5, 10.75, 10.75, 8.25],
                    texture: "#texture",
                  },
                  south: {
                    uv: [7.25, 10.75, 3.5, 8.25],
                    texture: "#texture",
                  },
                  east: { uv: [0, 10.75, 3.5, 8.25], texture: "#texture" },
                },
              },
              {
                from: [0, 10, 1],
                to: [15, 15, 15],
                faces: {
                  down: { uv: [7.25, 3.5, 3.5, 0], texture: "#texture" },
                  up: { uv: [10.5, 3.5, 7.25, 0], texture: "#texture" },
                  north: {
                    uv: [14.5, 8.25, 10.75, 10.75],
                    texture: "#texture",
                  },
                  south: { uv: [7.25, 8.25, 3.5, 10.75], texture: "#texture" },
                  east: { uv: [0, 8.25, 3.5, 10.75], texture: "#texture" },
                },
              },
              {
                from: [0, 7, 0],
                to: [1, 11, 1],
                faces: {
                  down: { uv: [0.25, 0, 0.75, 0.25], texture: "#texture" },
                  up: { uv: [0.25, 0, 0.75, 0.25], texture: "#texture" },
                  north: { uv: [0.5, 0.25, 0, 1.25], texture: "#texture" },
                  east: { uv: [0.75, 0.25, 1, 1.25], texture: "#texture" },
                },
              },
            ],
          },
          "chest_left.json": {
            parent: "block/block",
            textures: {
              texture: "minecraft:entity/chest/normal_left",
            },
            elements: [
              {
                from: [1, 0, 1],
                to: [16, 10, 15],
                faces: {
                  down: { uv: [7.25, 8.25, 3.5, 4.75], texture: "#texture" },
                  up: { uv: [11, 8.25, 7.25, 4.75], texture: "#texture" },
                  north: {
                    uv: [14.5, 10.75, 10.75, 8.25],
                    texture: "#texture",
                  },
                  south: {
                    uv: [7.25, 10.75, 3.5, 8.25],
                    texture: "#texture",
                  },
                  west: { uv: [7.25, 10.75, 10.75, 8.25], texture: "#texture" },
                },
              },
              {
                from: [1, 10, 1],
                to: [16, 15, 15],
                faces: {
                  down: { uv: [7.25, 3.5, 3.5, 0], texture: "#texture" },
                  up: { uv: [11, 3.5, 7.25, 0], texture: "#texture" },
                  north: {
                    uv: [14.5, 8.25, 10.75, 10.75],
                    texture: "#texture",
                  },
                  south: { uv: [7.25, 8.25, 3.5, 10.75], texture: "#texture" },
                  west: { uv: [7.25, 8.25, 10.75, 10.75], texture: "#texture" },
                },
              },
              {
                from: [15, 7, 0],
                to: [16, 11, 1],
                faces: {
                  down: { uv: [0.25, 0, 0.75, 0.25], texture: "#texture" },
                  up: { uv: [0.25, 0, 0.75, 0.25], texture: "#texture" },
                  north: { uv: [1, 0.25, 0.75, 1.25], texture: "#texture" },
                  west: { uv: [0.25, 0.25, 0.5, 1.25], texture: "#texture" },
                },
              },
            ],
          },
        },
      },
    },
    override: {
      models: {
        "chest.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/chest/normal",
          },
          elements: [
            {
              from: [1, 0, 1],
              to: [15, 10, 15],
              faces: {
                down: { uv: [3.5, 8.25, 7, 4.75], texture: "#texture" },
                up: { uv: [7, 8.25, 10.5, 4.75], texture: "#texture" },
                north: { uv: [14, 10.75, 10.5, 8.25], texture: "#texture" },
                south: { uv: [7, 8.25, 10.5, 10.75], texture: "#texture" },
                west: { uv: [7, 8.25, 10.5, 10.75], texture: "#texture" },
                east: { uv: [3.5, 8.25, 7, 10.75], texture: "#texture" },
              },
            },
            {
              from: [1, 10, 1],
              to: [15, 15, 15],
              faces: {
                down: { uv: [7, 3.5, 3.5, 0], texture: "#texture" },
                up: { uv: [10.5, 3.5, 7, 0], texture: "#texture" },
                north: { uv: [14, 8.25, 10.5, 10.75], texture: "#texture" },
                south: { uv: [3.5, 8.25, 7, 10.75], texture: "#texture" },
                west: { uv: [7, 8.25, 10.5, 10.75], texture: "#texture" },
                east: { uv: [0, 8.25, 3.5, 10.75], texture: "#texture" },
              },
            },
            {
              from: [7, 7, 0],
              to: [9, 11, 1],
              faces: {
                down: { uv: [0.5, 0, 1, 0.25], texture: "#texture" },
                up: { uv: [0.5, 0, 1, 0.25], texture: "#texture" },
                north: { uv: [0.5, 0, 1, 1.25], texture: "#texture" },
                west: { uv: [0.75, 0, 1, 1.25], texture: "#texture" },
                east: { uv: [0.5, 0, 0.75, 1.25], texture: "#texture" },
              },
            },
          ],
        },
        "shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker",
          },
          elements: [...shulkerElements],
        },
        "black_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_black",
          },
          elements: [...shulkerElements],
        },
        "blue_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_blue",
          },
          elements: [...shulkerElements],
        },
        "brown_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_brown",
          },
          elements: [...shulkerElements],
        },
        "cyan_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_cyan",
          },
          elements: [...shulkerElements],
        },
        "gray_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_gray",
          },
          elements: [...shulkerElements],
        },
        "green_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_green",
          },
          elements: [...shulkerElements],
        },
        "light_blue_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_light_blue",
          },
          elements: [...shulkerElements],
        },
        "light_gray_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_light_gray",
          },
          elements: [...shulkerElements],
        },
        "lime_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_lime",
          },
          elements: [...shulkerElements],
        },
        "magenta_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_magenta",
          },
          elements: [...shulkerElements],
        },
        "orange_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_orange",
          },
          elements: [...shulkerElements],
        },
        "pink_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_pink",
          },
          elements: [...shulkerElements],
        },
        "purple_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_purple",
          },
          elements: [...shulkerElements],
        },
        "red_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_red",
          },
          elements: [...shulkerElements],
        },
        "white_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_white",
          },
          elements: [...shulkerElements],
        },
        "yellow_shulker_box.json": {
          parent: "block/block",
          textures: {
            texture: "minecraft:entity/shulker/shulker_yellow",
          },
          elements: [...shulkerElements],
        },
        "water.json": {
          parent: "block/cube_all",
          textures: {
            all: "minecraft:block/water_still",
          },
          elements: [
            {
              from: [0, 0, 0],
              to: [16, 16, 16],
              faces: {
                down: {
                  texture: "#all",
                  cullface: "down",
                  color: "#005AFF",
                },
                up: {
                  texture: "#all",
                  cullface: "up",
                  color: "#005AFF",
                },
                north: {
                  texture: "#all",
                  cullface: "north",
                  color: "#005AFF",
                },
                south: {
                  texture: "#all",
                  cullface: "south",
                  color: "#005AFF",
                },
                west: {
                  texture: "#all",
                  cullface: "west",
                  color: "#005AFF",
                },
                east: {
                  texture: "#all",
                  cullface: "east",
                  color: "#005AFF",
                },
              },
            },
          ],
        },
        "lava.json": {
          parent: "block/cube_all",
          textures: {
            all: "minecraft:block/lava_still",
          },
        },
      },
      blockstates: {
        "chest.json": {
          variants: {
            "type=SINGLE,facing=east": {
              model: "minecraft:block/chest",
              y: 90,
            },
            "type=SINGLE,facing=north": {
              model: "minecraft:block/chest",
            },
            "type=SINGLE,facing=south": {
              model: "minecraft:block/chest",
              y: 180,
            },
            "type=SINGLE,facing=west": {
              model: "minecraft:block/chest",
              y: 270,
            },
            "type=RIGHT,facing=east": {
              model: "minecraft:block/chest_right",
              y: 90,
            },
            "type=RIGHT,facing=north": {
              model: "minecraft:block/chest_right",
            },
            "type=RIGHT,facing=south": {
              model: "minecraft:block/chest_right",
              y: 180,
            },
            "type=RIGHT,facing=west": {
              model: "minecraft:block/chest_right",
              y: 270,
            },
            "type=LEFT,facing=east": {
              model: "minecraft:block/chest_left",
              y: 90,
            },
            "type=LEFT,facing=north": {
              model: "minecraft:block/chest_left",
            },
            "type=LEFT,facing=south": {
              model: "minecraft:block/chest_left",
              y: 180,
            },
            "type=LEFT,facing=west": {
              model: "minecraft:block/chest_left",
              y: 270,
            },
          },
        },
      },
    },
  };

  const textureFacesMap = new Map<string, TexturedFace[]>();
  const referencedTextureFaces = new Set<string>();
  const promises: Promise<LoadedModelFile>[] = [];
  for (const asset of Object.keys(fileTree)) {
    const models = (fileTree?.[asset] as FileTree)?.models;
    if (models == null) continue;
    const block = (models as FileTree)?.block;
    if (block == null) continue;

    console.log(`Loading models from ${asset}/models...`);

    for (const key of Object.keys(block)) {
      const override = customConfig?.override?.models?.[key];
      if (override != null) {
        promises.push(
          new Promise<LoadedModelFile>((resolve, reject) => {
            const name = key.substring(0, key.length - 5);
            if (Array.isArray(override.elements)) {
              textureFacesMap.set(
                name,
                override.elements.reduce((acc, curr) => {
                  return acc.concat(elementToTexturedFaces(curr));
                }, [] as TexturedFace[])
              );
              override.elements = name as any;
            }

            resolve({
              ...override,
              asset,
              name,
              file: key,
            });
          })
        );
        continue;
      }

      const file = (block as FileTree)[key] as File;
      if (typeof file.size !== "number" || !(file.size > 0)) continue;
      if (file.type !== "application/json") continue;

      promises.push(
        new Promise<LoadedModelFile>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (result == null) {
              reject(new Error("No data to load for file"));
              return;
            }
            try {
              const parsedData = JSON.parse(
                typeof result === "string"
                  ? result
                  : new TextDecoder().decode(result)
              ) as ModelData;

              const name = file.name.substring(0, file.name.length - 5);
              if (Array.isArray(parsedData.elements)) {
                textureFacesMap.set(
                  name,
                  parsedData.elements.reduce((acc, curr) => {
                    return acc.concat(elementToTexturedFaces(curr));
                  }, [] as TexturedFace[])
                );
                parsedData.elements = name as any;
              }

              resolve({
                ...parsedData,
                asset,
                name,
                file: file.name,
              });
            } catch (err) {
              reject(err);
            }
          };

          reader.onerror = (e) => {
            reject(e);
          };

          reader.readAsArrayBuffer(file as File);
        })
      );
    }

    const customModelsToAdd = customConfig?.add?.[asset]?.models;
    if (customModelsToAdd != null) {
      const keys = Object.keys(customModelsToAdd);
      for (const key of keys) {
        const model = customModelsToAdd[key];
        promises.push(
          new Promise<LoadedModelFile>((resolve, reject) => {
            const name = key.substring(0, key.length - 5);
            if (Array.isArray(model.elements)) {
              textureFacesMap.set(
                name,
                model.elements.reduce((acc, curr) => {
                  return acc.concat(elementToTexturedFaces(curr));
                }, [] as TexturedFace[])
              );
              model.elements = name as any;
            }

            resolve({
              ...model,
              asset,
              name,
              file: key,
            });
          })
        );
      }
    }
  }

  const models = await Promise.all(promises);
  const modelMap = models.reduce((modelMap, model) => {
    modelMap.set(`${model.asset}:${model.name}`, model);
    return modelMap;
  }, new Map<string, LoadedModelFile>());

  console.log(`Loading ${models.length} models...`);

  const extractFullModel = (model: LoadedModelFile): any => {
    let parentName = model.parent;
    if (!parentName) {
      return model;
    }

    const parentSplit = parentName.split(":");
    let parentAsset = "minecraft";
    if (parentSplit.length > 1) {
      parentName = parentSplit[parentSplit.length - 1];
      parentAsset = parentSplit[0];
    }

    if (parentName.startsWith("block/")) {
      parentName = parentName.substring(6);
    }

    const parent = modelMap.get(`${parentAsset}:${parentName}`);
    if (!parent) {
      return model;
    }

    return deepMerge(
      {},
      extractFullModel(JSON.parse(JSON.stringify(parent))),
      JSON.parse(JSON.stringify(model))
    );
  };

  for (const model of models) {
    try {
      const key = `${model.asset}:${model.name}`;
      const fullModel = extractFullModel(model);
      if (!fullModel.textures) {
        console.log(`Skipping: ${fullModel.file} - missing textures`);
        continue;
      }

      if (!fullModel.elements) {
        console.log(`Skipping: ${fullModel.file} - missing elements`);
        continue;
      }

      const textureFaces = textureFacesMap.get(fullModel.elements);
      if (textureFaces == null) {
        console.log(
          `Skipping: ${fullModel.file} - unknown elements "${fullModel.elements}"`
        );
        continue;
      }

      const fullTexturePaths = textureFaces.reduce(
        (acc, curr, i) => {
          let texture: string | undefined = curr.texture;
          while (
            texture &&
            texture.startsWith("#") &&
            texture !== fullModel.textures[texture.substring(1)]
          ) {
            texture = fullModel.textures[texture.substring(1)];
          }

          if (texture && texture === fullModel.textures[texture.substring(1)]) {
            texture = undefined;
          }

          acc.push({
            key: curr.texture,
            texture,
            index: i,
            uv: curr.uv,
            color: curr.color,
          });
          return acc;
        },
        [] as {
          key: string;
          texture?: string;
          index: number;
          uv?: number[];
          color?: string;
        }[]
      );
      if (
        fullTexturePaths.some(
          (resolvedTexture) => resolvedTexture.texture == null
        )
      ) {
        console.log(
          `Skipping: ${fullModel.file} - some faces missing textures`
        );
        continue;
      }

      const getAssetAndName = (str: string) => {
        const split = str.split(":");
        if (split.length > 1) {
          return [split[0], split[split.length - 1]];
        }

        return [model.asset, str];
      };

      const resolvedTextures: {
        key: string;
        texture?: number;
        index: number;
      }[] = [];
      for (const fullTexturePath of fullTexturePaths) {
        if (fullTexturePath.texture == null) continue;
        const [asset, texture] = getAssetAndName(fullTexturePath.texture);
        const filePath = `${asset}/textures/${texture}.png`;

        let dx = 0;
        let dy = 0;
        let dw = 16;
        let dh = 16;
        if (fullTexturePath.uv) {
          dx = fullTexturePath.uv[0];
          dy = fullTexturePath.uv[1];
          dw = fullTexturePath.uv[2] - fullTexturePath.uv[0];
          dh = fullTexturePath.uv[3] - fullTexturePath.uv[1];
        }

        const { color } = fullTexturePath;
        const mapKey = `${filePath}?dx=${dx}&dy=${dy}&dw=${dw}&dh=${dh}${
          color != null ? `&color=${color}` : ""
        }`;
        let textureIndex = texturesMap.get(mapKey);
        if (textureIndex == null) {
          const split = texture.split("/");
          const textureFileDirectory = split
            .slice(0, split.length - 1)
            .reduce((acc, curr) => {
              if (acc == null) return acc;
              return (acc as FileTree)[curr] as FileTree;
            }, (fileTree[asset] as FileTree)?.textures as FileTree);
          if (textureFileDirectory == null) continue;
          const textureFile = textureFileDirectory[
            `${split[split.length - 1]}.png`
          ] as File;
          if (textureFile == null) continue;
          const base64Texture = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result;
              if (result == null) {
                reject(new Error("No data to load for file"));
                return;
              }

              resolve(result as string);
            };

            reader.onerror = (e) => {
              reject(e);
            };

            reader.readAsDataURL(textureFile);
          });

          const imageData = await getImageData(
            canvas,
            base64Texture,
            dx,
            dy,
            dw,
            dh,
            color
          );
          if (imageData != null) {
            textures.push(imageData.data);
            textureIndex = nextTextureIndex;
            texturesMap.set(mapKey, nextTextureIndex++);
          } else {
            textureIndex = 0;
          }
        }

        referencedTextureFaces.add(fullModel.elements);
        resolvedTextures.push({
          key: fullTexturePath.key,
          texture: textureIndex,
          index: fullTexturePath.index,
        });
      }

      atlasMap.textures[key] = resolvedTextures.reduce(
        (acc: any, curr, i) => {
          if (acc[curr.key] != null) {
            acc[curr.key][curr.index] = curr.texture;
          } else if (
            resolvedTextures.some(
              ({ key }, keyIndex) => keyIndex !== i && key === curr.key
            )
          ) {
            acc[curr.key] = {
              [curr.index]: curr.texture,
            };
          } else {
            acc[curr.key] = curr.texture;
          }
          return acc;
        },
        {
          model: fullModel.elements,
        }
      );
    } catch (err) {
      console.error(`Failed to load textures for model: ${model.name}`);
      throw err;
    }
  }

  const blockStatePromises: Promise<LoadedBlockstateFile>[] = [];
  for (const asset of Object.keys(fileTree)) {
    const blockstates = (fileTree?.[asset] as FileTree)?.blockstates;
    if (blockstates == null) continue;

    console.log(`Loading blockstates from ${asset}/blockstates...`);
    for (const key of Object.keys(blockstates)) {
      const file = (blockstates as FileTree)[key] as File;
      if (typeof file.size !== "number" || !(file.size > 0)) continue;
      if (file.type !== "application/json") continue;

      const override = customConfig?.override?.blockstates?.[key];
      if (override != null) {
        blockStatePromises.push(
          new Promise<LoadedBlockstateFile>((resolve, reject) => {
            const name = key.substring(0, key.length - 5);
            resolve({
              ...override,
              asset,
              name,
              file: key,
            });
          })
        );
        continue;
      }

      blockStatePromises.push(
        new Promise<LoadedBlockstateFile>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (result == null) {
              reject(new Error("No data to load for file"));
              return;
            }
            try {
              const parsedData = JSON.parse(
                typeof result === "string"
                  ? result
                  : new TextDecoder().decode(result)
              ) as BlockstatesData;

              const name = file.name.substring(0, file.name.length - 5);
              resolve({
                ...parsedData,
                asset,
                name,
                file: file.name,
              });
            } catch (err) {
              reject(err);
            }
          };

          reader.onerror = (e) => {
            reject(e);
          };

          reader.readAsArrayBuffer(file as File);
        })
      );
    }
  }

  const blockStates = await Promise.all(blockStatePromises);
  console.log(`Loading ${blockStates.length} blocks...`);

  atlasMap.blockstates["unknown"] = [
    {
      model: "unknown",
    },
  ];
  for (const blockState of blockStates) {
    if (blockState.variants == null) continue;
    const variants = Object.keys(blockState.variants);
    if (variants.length < 1) continue;

    const loadedStates: AtlasMapBlockData[] = [];
    for (const variant of variants) {
      const data = blockState.variants[variant];
      const {
        model: loadedModel,
        x,
        y,
      } = (() => {
        if (Array.isArray(data)) {
          return data[0];
        }

        return data;
      })();

      if (loadedModel == null) {
        console.log(blockState);
        continue;
      }

      const model = (() => {
        let model = loadedModel;
        const parentSplit = loadedModel.split(":");
        let parentAsset = "minecraft";
        if (parentSplit.length > 1) {
          model = parentSplit[parentSplit.length - 1];
          parentAsset = parentSplit[0];
        }

        if (model.startsWith("block/")) {
          model = model.substring(6);
        }

        return `${parentAsset}:${model}`;
      })();

      if (variant === "") {
        loadedStates.push({
          model,
          x,
          y,
        });
      } else {
        const split = variant.split(",");
        const state: {
          [key: string]: string;
        } = {};
        for (const pair of split) {
          const keyValues = pair.split("=");
          if (keyValues.length !== 2) continue;
          state[keyValues[0]] = keyValues[1];
        }

        loadedStates.push({
          model,
          x,
          y,
          state,
        });
      }
    }

    if (loadedStates.length < 1) continue;
    atlasMap.blockstates[`${blockState.asset}:${blockState.name}`] =
      loadedStates;
  }

  console.log(`Loading ${textures.length} textures...`);

  const atlas = textures.reduce((uint8Array, texture, i) => {
    uint8Array.set(texture, i * 4 * 16 * 16);
    return uint8Array;
  }, new Uint8Array(textures.length * 4 * 16 * 16));

  console.log(`Loading ${referencedTextureFaces.size} models...`);

  for (const referencedTextureFace of referencedTextureFaces) {
    const textureFace = textureFacesMap.get(referencedTextureFace);
    if (textureFace == null) continue;

    atlasMap.models[referencedTextureFace] = textureFace.map(
      ({ texture, face }) => ({
        texture,
        face,
      })
    ) as any;
  }

  return {
    atlas,
    atlasMap,
  };
};
