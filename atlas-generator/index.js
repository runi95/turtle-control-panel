const fs = require("fs");
const { createCanvas, Image } = require("canvas");
const { Texture } = require("three");
const deepAssign = require("assign-deep");

const getImageData = (image) => {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);

  return context.getImageData(0, 0, image.width, image.height);
};

const textureToName = (asset, texture) =>
  texture.replace(`${asset}:block/`, "").replace("block/", "");

const loadTexture = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.width !== 16 || image.height !== 16) {
        resolve(null);
        return;
      }
      const texture = new Texture(image);
      texture.needsUpdate = true;
      resolve(texture);
    };
    image.onerror = (err) => {
      reject(err);
    };
    image.src = src;
  });

(async () => {
  const assetsPath = "assets";
  const assets = fs.readdirSync(assetsPath);
  if (assets.length === 0) {
    console.log(`ERROR: Found no assets to load in ${assetsPath}`);
  }

  let textureIndex = 1;
  const atlasMap = {
    unknown: [0, 0, 0, 0, 0, 0],
  };
  const textures = [await loadTexture("unknown.png")];

  const textureCache = new Map();
  const getTextureIndex = async (asset, textureName) => {
    const key = textureName;
    const cachedTexture = textureCache.get(key);
    if (cachedTexture) {
      return cachedTexture;
    }

    const loadedTexture = await loadTexture(
      `assets/${asset}/textures/block/${textureToName(asset, textureName)}.png`
    );
    if (loadedTexture == null) {
      return 0;
    }

    textures.push(loadedTexture);
    const index = textureIndex;
    textureCache.set(key, index);
    textureIndex++;
    return index;
  };

  const getTextureName = (model, texture) => {
    const extractedName = (() => {
      if (texture.startsWith("#")) {
        const extractedTexture = model.textures[texture.substring(1)];
        if (!extractedTexture) return null;

        if (extractedTexture.startsWith("#")) {
          return getTextureName(model, extractedTexture);
        }

        return extractedTexture;
      }

      return texture;
    })();
    if (!extractedName) {
      return null;
    }

    return textureToName(model.asset, extractedName);
  };

  const customConfig = (() => {
    const customConfigPath = "./custom-config.json";
    const exists = fs.existsSync(customConfigPath);
    if (!exists) return {};
    return JSON.parse(fs.readFileSync(customConfigPath));
  })();

  const modelPaths = [];
  for (const asset of assets) {
    const modelsPath = `assets/${asset}/models/block`;
    if (!fs.existsSync(modelsPath)) continue;

    console.log(`Loading models from ${modelsPath}...`);

    modelPaths.push(
      ...fs
        .readdirSync(modelsPath)
        .filter((file) => file.endsWith(".json"))
        .map((file) => ({
          path: `${modelsPath}/${file}`,
          file,
          name: file.substring(0, file.length - 5),
          asset,
        }))
    );
  }

  const models = await Promise.all(
    modelPaths.map(
      ({ path, file, name, asset }) =>
        new Promise((resolve, reject) => {
          const override = customConfig?.override?.[`${asset}:${name}`];
          if (override !== undefined) {
            resolve({ ...override, file, name, asset });
          } else {
            fs.readFile(path, (err, data) => {
              if (err != null) {
                reject(err);
                return;
              }

              resolve({ ...JSON.parse(data), file, name, asset });
            });
          }
        })
    )
  );

  const customAdd = customConfig?.add;
  if (customAdd) {
    const keys = Object.keys(customAdd);
    keys.forEach((key) => {
      const split = key.split(":");
      models.push({
        ...customAdd[key],
        file: key,
        name: split[1],
        asset: split[0],
      });
    });
  }

  const modelMap = models.reduce((modelMap, model) => {
    modelMap.set(`${model.asset}:${model.name}`, model);
    return modelMap;
  }, new Map());

  console.log(`Loading ${models.length} models...`);

  for (const model of models) {
    try {
      const key = `${model.asset}:${model.name}`;
      const extractFullModel = (model) => {
        let parentName = model.parent;
        if (!parentName) {
          if (model.asset === "minecraft" && model.file === "block.json") {
            return {
              ...model,
              isValidBlock: true,
            };
          }
          return model;
        }

        const parentSplit = parentName.split(":");
        let parentAsset = model.asset;
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

        return deepAssign(
          {},
          extractFullModel(JSON.parse(JSON.stringify(parent))),
          JSON.parse(JSON.stringify(model))
        );
      };

      const fullModel = extractFullModel(model);
      if (!fullModel.isValidBlock) {
        console.log(`Skipping: ${fullModel.file} - not valid block`);
        continue;
      }

      if (!fullModel.textures) {
        console.log(`Skipping: ${fullModel.file} - missing textures`);
        continue;
      }

      if (!fullModel.elements || !Array.isArray(fullModel.elements)) {
        console.log(`Skipping: ${fullModel.file} - missing elements`);
        continue;
      }

      let down = null;
      let up = null;
      let north = null;
      let east = null;
      let south = null;
      let west = null;

      for (const element of fullModel.elements) {
        const { faces } = element;
        if (!faces) continue;
        if (faces.down) {
          const updatedDown = await getTextureName(
            fullModel,
            faces.down.texture
          );
          if (updatedDown) {
            down = updatedDown;
          }
        }

        if (faces.up) {
          const updatedUp = await getTextureName(fullModel, faces.up.texture);
          if (updatedUp) {
            up = updatedUp;
          }
        }

        if (faces.north) {
          const updatedNorth = await getTextureName(
            fullModel,
            faces.north.texture
          );
          if (updatedNorth) {
            north = updatedNorth;
          }
        }

        if (faces.east) {
          const updatedEast = await getTextureName(
            fullModel,
            faces.east.texture
          );
          if (updatedEast) {
            east = updatedEast;
          }
        }

        if (faces.south) {
          const updatedSouth = await getTextureName(
            fullModel,
            faces.south.texture
          );
          if (updatedSouth) {
            south = updatedSouth;
          }
        }

        if (faces.west) {
          const updatedWest = await getTextureName(
            fullModel,
            faces.west.texture
          );
          if (updatedWest) {
            west = updatedWest;
          }
        }
      }

      if (
        east == null ||
        north == null ||
        up == null ||
        down == null ||
        west == null ||
        south == null
      ) {
        console.log(
          `Skipping: ${fullModel.file} - missing at least one texture`
        );
        continue;
      }

      if (
        east.startsWith("#") ||
        north.startsWith("#") ||
        up.startsWith("#") ||
        down.startsWith("#") ||
        west.startsWith("#") ||
        south.startsWith("#")
      ) {
        console.log(`Skipping: ${fullModel.file} - invalid texture resolution`);
        continue;
      }

      const getAssetAndName = (str) => {
        const split = str.split(":");
        if (split.length > 1) {
          return [split[0], split[split.length - 1]];
        }

        return [model.asset, str];
      };

      const [eastAsset, eastName] = getAssetAndName(east);
      const [northAsset, northName] = getAssetAndName(north);
      const [upAsset, upName] = getAssetAndName(up);
      const [downAsset, downName] = getAssetAndName(down);
      const [westAsset, westName] = getAssetAndName(west);
      const [southAsset, southName] = getAssetAndName(south);

      atlasMap[key] = [
        await getTextureIndex(eastAsset, eastName),
        await getTextureIndex(northAsset, northName),
        await getTextureIndex(upAsset, upName),
        await getTextureIndex(downAsset, downName),
        await getTextureIndex(westAsset, westName),
        await getTextureIndex(southAsset, southName),
      ];
    } catch (err) {
      console.error(`Failed to load textures for model: ${model.name}`);
      throw err;
    }
  }

  console.log(`Loading ${textures.length} textures...`);

  const atlas = textures.reduce((uint8Array, texture, i) => {
    const { data } = getImageData(texture.image);
    uint8Array.set(data, i * 4 * 16 * 16);
    return uint8Array;
  }, new Uint8Array(textures.length * 4 * 16 * 16));

  // const atlasPath = "./atlas";
  const atlasPath = "../portal/public/atlas";
  fs.writeFileSync(atlasPath, atlas);

  console.log(`Atlas successfully created at: ${atlasPath}`);

  // const atlasMapPath = "./atlas.map.json";
  const atlasMapPath = "../portal/public/atlas.map.json";
  fs.writeFileSync(atlasMapPath, JSON.stringify(atlasMap));

  console.log(`Atlas map successfully created at: ${atlasMapPath}`);
})();
