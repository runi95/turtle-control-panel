const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const { PlaneGeometry } = require("three");
const deepAssign = require("assign-deep");

const getImageData = async (sourceImagePath, dx, dy, dw, dh, color) => {
  const image = await loadImage(sourceImagePath);
  const mul = image.width / 16;
  dx *= mul;
  dy *= mul;
  dw *= mul;
  dh *= mul;
  const canvas = createCanvas(16, 16);
  const context = canvas.getContext("2d");

  if (color != null) {
    context.fillStyle = color;
    context.fillRect(0, 0, dw, dh);
    context.globalCompositeOperation = "multiply";
  }

  context.patternQuality = 'nearest';
  context.drawImage(
    image,
    dx,
    dy,
    dw,
    dh,
    0,
    0,
    16,
    16
  );

  return context.getImageData(0, 0, 16, 16);
};

const elementToTexturedFaces = (element) => {
  const texturedFaces = [];

  const back = element.from[0] / 16 - 0.5;
  const front = element.to[0] / 16 - 0.5;
  const top = element.from[1] / 16 - 0.5;
  const bottom = element.to[1] / 16 - 0.5;
  const left = element.from[2] / 16 - 0.5;
  const right = element.to[2] / 16 - 0.5;

  if (element.faces.west) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      back,
      bottom,
      left,
      back,
      bottom,
      right,
      back,
      top,
      left,
      back,
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
      texture: element.faces.west.texture,
      face: planeGeometry.attributes["position"]["array"],
      uv: element.faces.west.uv,
      color: element.faces.west.color,
    });
  }

  if (element.faces.east) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      front,
      bottom,
      right,
      front,
      bottom,
      left,
      front,
      top,
      right,
      front,
      top,
      left,
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
      uv: element.faces.east.uv,
      color: element.faces.east.color,
    });
  }

  if (element.faces.up) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      front,
      bottom,
      right,
      back,
      bottom,
      right,
      front,
      bottom,
      left,
      back,
      bottom,
      left,
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
      uv: element.faces.up.uv,
      color: element.faces.up.color,
    });
  }

  if (element.faces.down) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      back,
      top,
      right,
      front,
      top,
      right,
      back,
      top,
      left,
      front,
      top,
      left,
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
      uv: element.faces.down.uv,
      color: element.faces.down.color,
    });
  }

  if (element.faces.north) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      front,
      bottom,
      left,
      back,
      bottom,
      left,
      front,
      top,
      left,
      back,
      top,
      left,
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
      uv: element.faces.north.uv,
      color: element.faces.north.color,
    });
  }

  if (element.faces.south) {
    const planeGeometry = new PlaneGeometry();
    planeGeometry.attributes["position"]["array"] = [
      back,
      bottom,
      right,
      front,
      bottom,
      right,
      back,
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
      texture: element.faces.south.texture,
      face: planeGeometry.attributes["position"]["array"],
      uv: element.faces.south.uv,
      color: element.faces.south.color,
    });
  }

  return texturedFaces;
};

(async () => {
  const assetsPath = "assets";
  const assets = fs.readdirSync(assetsPath);
  if (assets.length === 0) {
    console.log(`ERROR: Found no assets to load in ${assetsPath}`);
  }

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
  let nextTextureIndex = 1;
  let uvCount = 0;
  const textures = [(await getImageData("unknown.png", 0, 0, 16, 16)).data];
  const texturesMap = new Map([["unknown.png?dx=0&dy=0&dw=16&dh=16", 0]]);

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
            if (Array.isArray(override.elements)) {
              textureFacesMap.set(
                name,
                override.elements.reduce((acc, curr) => {
                  return acc.concat(elementToTexturedFaces(curr));
                }, [])
              );
              override.elements = name;
            }

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

      const fullTexturePaths = textureFaces.reduce((acc, curr, i) => {
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
          index: i,
          uv: curr.uv,
          color: curr.color
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
        const filePath = `assets/${asset}/textures/${texture}.png`;

        if (!fs.existsSync(filePath)) {
            console.log(`Skipping: ${filePath} - missing file`);
            continue;
        }
        
        let dx = 0;
        let dy = 0;
        let dw = 16;
        let dh = 16;
        if (fullTexturePath.uv) {
          uvCount++;
          dx = fullTexturePath.uv[0];
          dy = fullTexturePath.uv[1];
          dw = (fullTexturePath.uv[2] - fullTexturePath.uv[0]);
          dh = (fullTexturePath.uv[3] - fullTexturePath.uv[1]);
        }

        const {color} = fullTexturePath;
        const mapKey = `${filePath}?dx=${dx}&dy=${dy}&dw=${dw}&dh=${dh}${color != null ? `&color=${color}` : ''}`;
        let textureIndex = texturesMap.get(mapKey);
        if (textureIndex == null) {
          const imageData = await getImageData(filePath, dx, dy, dw, dh, color);
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
        (acc, curr, i) => {
          if (acc[curr.key] != null) {
            acc[curr.key][curr.index] = curr.texture;
          } else if (resolvedTextures.some(({key}, keyIndex) => keyIndex !== i && key === curr.key)) {
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

  console.log(`Loading ${textures.length} textures...`);

  const atlas = textures.reduce((uint8Array, texture, i) => {
    uint8Array.set(texture, i * 4 * 16 * 16);
    return uint8Array;
  }, new Uint8Array(textures.length * 4 * 16 * 16));

  console.log(`Loading ${referencedTextureFaces.size} models...`);

  for (const referencedTextureFace of referencedTextureFaces) {
    const textureFace = textureFacesMap.get(referencedTextureFace);
    if (textureFace == null) continue;

    atlasMap.models[referencedTextureFace] = textureFace.map(({texture, face}) => ({
      texture,
      face
    }));
  }

  const atlasPath = "../portal/public/atlas";
  fs.writeFileSync(atlasPath, atlas);

  console.log(`Atlas successfully created at: ${atlasPath}`);

  const atlasMapPath = "../portal/public/atlas.map.json";
  fs.writeFileSync(atlasMapPath, JSON.stringify(atlasMap));

  console.log(`Atlas map successfully created at: ${atlasMapPath}`);
  console.log(`uvCount: ${uvCount}`);
})();
