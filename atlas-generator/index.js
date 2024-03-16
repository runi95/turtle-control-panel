const fs = require("fs");
const { createCanvas, Image } = require("canvas");
const { Texture, PlaneGeometry } = require("three");
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

const elementToTexturedFaces = (element) => {
  const texturedFaces = [];

  const back = Number(((8 - element.from[0]) / 16).toFixed(2));
  const front = Number(((element.to[0] - 8) / 16).toFixed(2));
  const top = Number(((8 - element.from[1]) / 16).toFixed(2));
  const bottom = Number(((element.to[1] - 8) / 16).toFixed(2));
  const left = Number(((8 - element.from[2]) / 16).toFixed(2));
  const right = Number(((element.to[2] - 8) / 16).toFixed(2));

  if (element.faces.south) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      left, // right?
      top,
      front,
      left, // right?
      top,
      -back, // ?
      left, // right?
      -bottom,
      front,
      left, // right?
      -bottom,
      -back, // ?
    ];

    const { rotation } = element;
    if (rotation) {
      const radians = (rotation.angle * Math.PI) / 180;
      const { axis } = rotation;
      if (axis === "y") {
        planeGeometry.rotateY(radians);
      } else if (axis === "x") {
        planeGeometry.rotateX(radians);
      } else if (axis === "z") {
        planeGeometry.rotateZ(radians);
      }
    }

    texturedFaces.push({
      texture: element.faces.south.texture,
      face: planeGeometry.attributes["position"]["array"],
    }); // Back
  }

  if (element.faces.north) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      -left, // right?
      top,
      -back, // front?
      -left, // right?
      top,
      back, // front?
      -left, // right?
      -bottom,
      -back, // front?
      -left, // right?
      -bottom,
      back, // front?
    ];
    const { rotation } = element;
    if (rotation) {
      const radians = (rotation.angle * Math.PI) / 180;
      const { axis } = rotation;
      if (axis === "y") {
        planeGeometry.rotateY(radians);
      } else if (axis === "x") {
        planeGeometry.rotateX(radians);
      } else if (axis === "z") {
        planeGeometry.rotateZ(radians);
      }
    }

    texturedFaces.push({
      texture: element.faces.north.texture,
      face: planeGeometry.attributes["position"]["array"],
    }); // Front
  }

  if (element.faces.up) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      -back,
      top,
      -left,
      front,
      top,
      -left,
      -back,
      top,
      right,
      front,
      top,
      right,
    ];

    const { rotation } = element;
    if (rotation) {
      const radians = (rotation.angle * Math.PI) / 180;
      const { axis } = rotation;
      if (axis === "y") {
        planeGeometry.rotateY(radians);
      } else if (axis === "x") {
        planeGeometry.rotateX(radians);
      } else if (axis === "z") {
        planeGeometry.rotateZ(radians);
      }
    }

    texturedFaces.push({
      texture: element.faces.up.texture,
      face: planeGeometry.attributes["position"]["array"],
    }); // Top
  }

  if (element.faces.down) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      -back,
      -bottom,
      right,
      front,
      -bottom,
      right,
      -back,
      -bottom,
      -left,
      front,
      -bottom,
      -left,
    ];

    const { rotation } = element;
    if (rotation) {
      const radians = (rotation.angle * Math.PI) / 180;
      const { axis } = rotation;
      if (axis === "y") {
        planeGeometry.rotateY(radians);
      } else if (axis === "x") {
        planeGeometry.rotateX(radians);
      } else if (axis === "z") {
        planeGeometry.rotateZ(radians);
      }
    }

    texturedFaces.push({
      texture: element.faces.down.texture,
      face: planeGeometry.attributes["position"]["array"],
    }); // Bottom
  }

  if (element.faces.west) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      -left,
      top,
      back,
      left,
      top,
      back,
      -left,
      -bottom,
      back,
      left,
      -bottom,
      back,
    ];

    const { rotation } = element;
    if (rotation) {
      const radians = (rotation.angle * Math.PI) / 180;
      const { axis } = rotation;
      if (axis === "y") {
        planeGeometry.rotateY(radians);
      } else if (axis === "x") {
        planeGeometry.rotateX(radians);
      } else if (axis === "z") {
        planeGeometry.rotateZ(radians);
      }
    }

    texturedFaces.push({
      texture: element.faces.west.texture,
      face: planeGeometry.attributes["position"]["array"],
    }); // Left
  }

  if (element.faces.east) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      right,
      top,
      -back,
      -left,
      top,
      -back,
      right,
      -bottom,
      -back,
      -left,
      -bottom,
      -back,
    ];

    const { rotation } = element;
    if (rotation) {
      const radians = (rotation.angle * Math.PI) / 180;
      const { axis } = rotation;
      if (axis === "y") {
        planeGeometry.rotateY(radians);
      } else if (axis === "x") {
        planeGeometry.rotateX(radians);
      } else if (axis === "z") {
        planeGeometry.rotateZ(radians);
      }
    }

    texturedFaces.push({
      texture: element.faces.east.texture,
      face: planeGeometry.attributes["position"]["array"],
    }); // Right
  }

  return texturedFaces;
};

(async () => {
  const assetsPath = "assets";
  const assets = fs.readdirSync(assetsPath);
  if (assets.length === 0) {
    console.log(`ERROR: Found no assets to load in ${assetsPath}`);
  }

  let textureIndex = 1;
  const atlasMap = {
    models: {},
    textures: {
      unknown: {
        model: "cube",
        south: 0,
        north: 0,
        up: 0,
        down: 0,
        west: 0,
        east: 0,
      },
    },
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
      return null;
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

  const textureFacesMap = new Map();
  const referencedTextureFaces = new Set();
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

              const parsedData = JSON.parse(data);
              if (Array.isArray(parsedData.elements)) {
                textureFacesMap.set(
                  name,
                  parsedData.elements.reduce((acc, curr) => {
                    return acc.concat(elementToTexturedFaces(curr));
                  }, [])
                );
                parsedData.elements = name;
              }

              resolve({ ...parsedData, file, name, asset });
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
          return model;
        }

        const parentSplit = parentName.split(":");
        let parentAsset = 'minecraft';
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

      const fullTexturePaths = textureFaces.reduce((acc, curr) => {
        let { texture } = curr;
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
        });
        return acc;
      }, []);
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

      const getAssetAndName = (str) => {
        const split = str.split(":");
        if (split.length > 1) {
          return [split[0], split[split.length - 1]];
        }

        return [model.asset, str];
      };

      const resolvedTextures = [];
      for (const fullTexturePath of fullTexturePaths) {
        const [asset, texture] = getAssetAndName(fullTexturePath.texture);
        const textureIndex = await getTextureIndex(asset, texture);
        if (textureIndex != null) {
          referencedTextureFaces.add(fullModel.elements);
        }

        resolvedTextures.push({
          key: fullTexturePath.key,
          texture: textureIndex ?? 0,
        });
      }

      atlasMap.textures[key] = resolvedTextures.reduce(
        (acc, curr) => {
          acc[curr.key] = curr.texture;
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

  console.log(`Loading ${textures.length} textures...`);

  const atlas = textures.reduce((uint8Array, texture, i) => {
    const { data } = getImageData(texture.image);
    uint8Array.set(data, i * 4 * 16 * 16);
    return uint8Array;
  }, new Uint8Array(textures.length * 4 * 16 * 16));

  console.log(`Loading ${referencedTextureFaces.size} models...`);

  for (const referencedTextureFace of referencedTextureFaces) {
    const textureFace = textureFacesMap.get(referencedTextureFace);
    if (textureFace == null) continue;

    atlasMap.models[referencedTextureFace] = textureFace;
  }

  // const atlasPath = "./atlas";
  const atlasPath = "../portal/public/atlas";
  fs.writeFileSync(atlasPath, atlas);

  console.log(`Atlas successfully created at: ${atlasPath}`);

  // const atlasMapPath = "./atlas.map.json";
  const atlasMapPath = "../portal/public/atlas.map.json";
  fs.writeFileSync(atlasMapPath, JSON.stringify(atlasMap));

  console.log(`Atlas map successfully created at: ${atlasMapPath}`);
})();
