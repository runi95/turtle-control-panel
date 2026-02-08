import fs from "fs";
import path from "path";
import os from "os";
import yauzl from "yauzl";
import { createCanvas, ImageData, loadImage } from "canvas";

export type Atlas = {
  sources: ({
    type: string;
  } & (
    | {
        resource: string;
        source: never;
        prefix: never;
        textures: never;
        palette_key: never;
        permutations: never;
      }
    | {
        source: string;
        prefix: string;
        resource: never;
        textures: never;
        palette_key: never;
        permutations: never;
      }
    | {
        textures: string[];
        palette_key: string;
        permutations: Record<string, string>;
        resource: never;
        source: never;
        prefix: never;
      }
  ))[];
};

export type BlockstateVariant = {
  model: string;
  uvlock?: boolean;
  x?: number;
  y?: number;
};

export type BlockstateVariants = Record<string, BlockstateVariant>;

export type BlockstateMultipart = {
  apply:
    | {
        model: string;
        uvlock?: boolean;
        x?: number;
        y?: number;
      }
    | {
        model: string;
        uvlock?: boolean;
        x?: number;
        y?: number;
      }[];
  when?: Record<string, string> & {
    OR?: Record<string, string>[];
  };
};

export type Blockstate =
  | {
      variants: BlockstateVariants;
      multipart?: never;
    }
  | {
      variants?: never;
      multipart: BlockstateMultipart[];
    };

export type ModelFace = {
  uv?: [number, number, number, number];
  texture: string;
  cullface?: string;
  tintindex?: number;
  rotation?: number;
};

export type ModelElement = {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: {
    origin: [number, number, number];
    axis: string;
    angle: number;
    rescale: boolean;
  };
  shade?: boolean;
  faces: Record<string, ModelFace>;
};

export type Model = {
  ambientocclusion?: boolean;
  parent?: string;
  textures?: Record<string, string>;
  gui_light?: string;
  display?: Record<
    string,
    {
      rotation: [number, number, number];
      translation: [number, number, number];
      scale: [number, number, number];
    }
  >;
  elements?: ModelElement[];
};

const getImageData = async (
  source: Buffer<ArrayBuffer>,
  w?: number,
  h?: number,
) => {
  const image = await loadImage(source);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");

  context.patternQuality = "nearest";
  context.drawImage(image, 0, 0);

  return context.getImageData(0, 0, w ?? image.width, h ?? image.height);
};

// This is just a hacky way to refuse handling of array variants
const hackBlockstate = (
  blockstate: Blockstate & {
    variants?: Record<string, BlockstateVariant | BlockstateVariant[]>;
  },
) => {
  const { variants } = blockstate;
  if (variants == null) return blockstate;

  for (const key of Object.keys(variants)) {
    if (!Array.isArray(variants[key])) continue;
    if (variants[key].length < 1) continue;
    variants[key] = variants[key][0];
  }

  return blockstate;
};

const hackModel = (model: Model, key: string): Model => {
  switch (key) {
    case "minecraft:block/water":
      return {
        textures: {
          all: "minecraft:block/water_still",
        },
        elements: [
          {
            from: [0, 0, 0],
            to: [16, 16, 16],
            faces: {
              down: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "down",
                tintindex: 0,
              },
              up: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "up",
                tintindex: 0,
              },
              north: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "north",
                tintindex: 0,
              },
              south: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "south",
                tintindex: 0,
              },
              west: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "west",
                tintindex: 0,
              },
              east: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "east",
                tintindex: 0,
              },
            },
          },
        ],
      };
    case "minecraft:block/lava":
      return {
        parent: "block/cube",
        textures: {
          all: "minecraft:block/lava_still",
        },
        elements: [
          {
            from: [0, 0, 0],
            to: [16, 16, 16],
            faces: {
              down: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "down",
              },
              up: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "up",
              },
              north: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "north",
              },
              south: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "south",
              },
              west: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "west",
              },
              east: {
                uv: [0, 0, 16, 16],
                texture: "#all",
                cullface: "east",
              },
            },
          },
        ],
      };
    default:
      return model;
  }
};

export async function load() {
  console.log("Loading assets...");
  console.log();

  const minecraftDirectory = (() => {
    const dirFromEnv = process.env.MINECRAFT_DIRECTORY;
    if (dirFromEnv != null && dirFromEnv !== "") return dirFromEnv;

    switch (os.platform()) {
      case "win32":
        return path.join(os.homedir(), "AppData/Roaming/.minecraft");
      case "darwin":
        return path.join(os.homedir(), "Library/Application Support/minecraft");
      default:
        return path.join(os.homedir(), ".minecraft");
    }
  })();
  if (!fs.existsSync(minecraftDirectory)) {
    throw new Error(
      "Unable to locate Minecraft directory, please manually set the MINECRAFT_DIRECTORY environment variable",
    );
  }

  const versionsDirectory = path.join(minecraftDirectory, "versions");
  if (!fs.existsSync(versionsDirectory)) {
    throw new Error(
      `The "versions" directory is missing from ${minecraftDirectory}`,
    );
  }

  const targetVersion = (() => {
    const versionFromEnv = process.env.MINECRAFT_VERSION;
    if (versionFromEnv != null && versionFromEnv !== "") return versionFromEnv;

    return "1.20.1";
  })();
  if (!fs.existsSync(path.join(versionsDirectory, targetVersion))) {
    throw new Error(
      `The versions directory (${versionsDirectory}) does not contain Minecraft version "${targetVersion}". Please set MINECRAFT_VERSION or start your Minecraft launcher on version ${targetVersion}`,
    );
  }

  const minecraftJarPath = path.join(
    versionsDirectory,
    `${targetVersion}/${targetVersion}.jar`,
  );
  if (!fs.existsSync(minecraftJarPath)) {
    throw new Error(
      `The .jar file for Minecraft version "${targetVersion}" does not exist. Please set MINECRAFT_VERSION or start your Minecraft launcher on version ${targetVersion}`,
    );
  }

  const assetRegex = new RegExp(
    "^assets/(?<source>[0-9a-z-_]+)/(?<type>[0-9a-z-_]+)/(?<dir>(?:[0-9a-z-_]+/)*)(?<name>[0-9a-z-_]+)\\.(?:json|png)$",
  );

  const atlases = new Map<string, Atlas>();
  const blockstates = new Map<string, Blockstate>();
  const models = new Map<string, Model>();
  const textures = new Map<
    string,
    {
      dir: string;
      buffer: Buffer<ArrayBuffer>;
    }
  >();

  const readJar = async (jarFilePath: string, assetName: string) => {
    await new Promise<void>((resolve, reject) => {
      yauzl.open(jarFilePath, { lazyEntries: true }, (err, zipFile) => {
        if (err) return reject(err);

        zipFile.readEntry();

        zipFile.on("entry", (entry) => {
          const filePath = entry.fileName;

          const readData = (callback: (data: Buffer<ArrayBuffer>) => void) => {
            zipFile.openReadStream(entry, (err, readStream) => {
              if (err) return reject(err);

              const chunks: Uint8Array[] = [];
              readStream.on("data", (chunk) => chunks.push(chunk));
              readStream.on("end", () => {
                callback(Buffer.concat(chunks));
                zipFile.readEntry();
              });
            });
          };

          const match = assetRegex.exec(filePath);
          if (match?.groups == null) {
            zipFile.readEntry();
            return;
          }

          const { source, type, dir, name } = match.groups;
          if (source == null || type == null || name == null) {
            zipFile.readEntry();
            return;
          }

          const key = `${source}:${dir ?? ""}${path.basename(filePath, path.extname(filePath))}`;
          switch (type) {
            case "atlases":
              readData((data) => atlases.set(key, JSON.parse(data.toString())));
              return;
            case "blockstates":
              readData((data) =>
                blockstates.set(
                  key,
                  hackBlockstate(JSON.parse(data.toString())),
                ),
              );
              return;
            case "models":
              readData((data) =>
                models.set(key, hackModel(JSON.parse(data.toString()), key)),
              );
              return;
            case "textures":
              readData((data) =>
                textures.set(key, {
                  dir,
                  buffer: data,
                }),
              );
              return;
            default:
              zipFile.readEntry();
              return;
          }
        });

        zipFile.on("end", () => {
          console.log(`${assetName} successfully loaded!`);
          resolve();
        });
        zipFile.on("error", reject);
      });
    });
  };

  const promises: Promise<void>[] = [readJar(minecraftJarPath, "minecraft")];

  // Read all .jar files from the mods directory
  // so that we can add their assets
  (() => {
    const modsDirectory = path.join(minecraftDirectory, "mods");
    if (!fs.existsSync(modsDirectory)) {
      console.warn(
        `No "mods" folder exists within the Minecraft directory: ${minecraftDirectory}`,
      );
      return;
    }

    const files = fs.readdirSync(modsDirectory);
    for (const file of files) {
      if (path.extname(file) !== ".jar") continue;
      promises.push(
        readJar(path.join(modsDirectory, file), path.basename(file)),
      );
    }
  })();

  await Promise.all(promises);

  console.log();
  console.log("Done!");
  console.log();
  console.log(`Atlases: ${atlases.size}`);
  console.log(`Blockstates: ${blockstates.size}`);
  console.log(`Models: ${models.size}`);
  console.log(`Textures: ${textures.size}`);

  if (!fs.existsSync("assets")) {
    fs.mkdirSync("assets");
  }
  fs.writeFileSync(
    "assets/atlases.json",
    JSON.stringify(Object.fromEntries(atlases), null, 2),
  );
  fs.writeFileSync(
    "assets/blockstates.json",
    JSON.stringify(Object.fromEntries(blockstates), null, 2),
  );
  fs.writeFileSync(
    "assets/models.json",
    JSON.stringify(Object.fromEntries(models), null, 2),
  );

  const texturesToRawImageData = new Map<string, ImageData>();
  for (const [key, value] of textures) {
    const { dir, buffer } = value;
    const [w, h] = (() => {
      if (dir === "block/") return [16, 16];
      if (dir === "item/") return [16, 16];
      return [undefined, undefined];
    })();
    const imageData = await getImageData(buffer, w, h);

    const isWhitelistedWidth = (() => {
      if (imageData.width === 16) return true;
      if (imageData.width === 32) return true;
      if (imageData.width === 64) return true;
      return false;
    })();
    if (!isWhitelistedWidth) continue;

    const isWhitelistedHeight = (() => {
      if (imageData.height === 16) return true;
      if (imageData.height === 32) return true;
      if (imageData.height === 64) return true;
      return false;
    })();
    if (!isWhitelistedHeight) continue;

    texturesToRawImageData.set(key, imageData);
  }

  fs.writeFileSync(
    "assets/textures.json",
    JSON.stringify(
      Object.fromEntries(
        Array.from(texturesToRawImageData).map(([key, value]) => [
          key,
          {
            width: value.width,
            height: value.height,
            data: Array.from(value.data),
          },
        ]),
      ),
    ),
  );
}
