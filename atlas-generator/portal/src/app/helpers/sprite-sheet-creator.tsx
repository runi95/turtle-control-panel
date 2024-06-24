import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { createBasePlaneGeometries } from "./create-base-plane-geometries";
import { createShaderMaterial } from "./create-shader-material";
import { createMinimizedAtlas } from "./create-minimized-atlas";
import { AtlasMap } from "../components/landing-page";

type FileTree = {
  [key: string]: FileTree | File;
};

export type ItemData = {
  parent?: string;
  textures?: {
    [key: string]: string;
  };
};

export type LoadedItemFile = ItemData & {
  file: string;
  name: string;
  asset: string;
};

type CustomConfig = {
  override: {
    [key: string]: ItemData;
  };
};

export const createSpriteSheet = async (
  files: FileList,
  atlasMap: AtlasMap,
  atlas: ArrayBuffer,
  mergeCanvas: HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement
) => {
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

  const customConfig: CustomConfig = {
    override: {
      "chest.json": {
        parent: "minecraft:block/chest",
      },
    },
  };

  const promises: Promise<LoadedItemFile>[] = [];
  for (const asset of Object.keys(fileTree)) {
    const models = (fileTree?.[asset] as FileTree)?.models;
    if (models == null) continue;
    const item = (models as FileTree)?.item;
    if (item == null) continue;

    console.log(`Loading items from ${asset}/items...`);

    for (const key of Object.keys(item)) {
      const override = customConfig?.override?.[key];
      if (override != null) {
        promises.push(
          new Promise<LoadedItemFile>((resolve, reject) => {
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

      const file = (item as FileTree)[key] as File;
      if (typeof file.size !== "number" || !(file.size > 0)) continue;
      if (file.type !== "application/json") continue;

      promises.push(
        new Promise<LoadedItemFile>((resolve, reject) => {
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
              ) as ItemData;

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

  const items = await Promise.all(promises);
  console.log(`Loading ${items.length} items...`);

  const spriteTextures: {
    name: string;
    image: CanvasImageSource;
  }[] = [];

  spriteTextures.push(
    await new Promise<{
      name: string;
      image: HTMLImageElement;
    }>((resolve, reject) => {
      const img = new Image();
      img.src = "/unknown-sprite.png";
      img.onload = () => {
        resolve({
          name: "unknown",
          image: img,
        });
      };
      img.onerror = reject;
    })
  );

  const loadImageFile = async (file: File) => {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result == null) {
          reject(new Error("No data to load for file"));
          return;
        }
        try {
          const img = new Image();
          img.src = result as string;
          img.onload = () => {
            resolve(img);
          };
          img.onerror = reject;
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (e) => {
        reject(e);
      };

      reader.readAsDataURL(file);
    });
  };

  const mergeContext = mergeCanvas.getContext("2d");
  if (mergeContext == null) throw new Error("Canvas has null context");
  mergeContext.imageSmoothingEnabled = false;
  mergeContext.globalCompositeOperation = "source-over";

  const mergeImageLayers = async (
    layers: HTMLImageElement[]
  ): Promise<HTMLImageElement> => {
    mergeContext.clearRect(0, 0, 16, 16);

    for (const layer of layers) {
      mergeContext.drawImage(layer, 0, 0, 16, 16);
    }

    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = mergeCanvas.toDataURL("image/png");
      img.onload = () => {
        resolve(img);
      };
      img.onerror = reject;
    });
  };

  const blocksToRender: LoadedItemFile[] = [];
  for (const item of items) {
    try {
      const parentAssetSplit = item.parent?.split(":");
      const parentSplit = (
        parentAssetSplit != null && parentAssetSplit.length > 1
          ? parentAssetSplit[1]
          : item.parent
      )?.split("/");

      if (
        (item.parent === "item/generated" ||
          item.parent === "minecraft:item/generated") &&
        item.textures?.layer0 != null
      ) {
        const layers: string[] = [];
        let layerIndex = 0;
        while (item.textures[`layer${layerIndex}`] != null) {
          layers.push(item.textures[`layer${layerIndex++}`]);
        }

        const itemImages: HTMLImageElement[] = [];
        for (const layer of layers) {
          const assetSplit = layer.split(":");
          const asset =
            assetSplit != null && assetSplit.length > 1
              ? assetSplit[0]
              : item.asset;

          const textures = (fileTree?.[asset] as FileTree)?.textures;
          if (textures == null) continue;

          const paths = (
            assetSplit != null && assetSplit.length > 1 ? assetSplit[1] : layer
          ).split("/");
          const itemTextureDirectory = paths
            .slice(0, paths.length - 1)
            .reduce((acc, curr) => {
              if (acc == null) return acc;
              return (acc as FileTree)[curr];
            }, textures);
          if (itemTextureDirectory == null) continue;

          const itemTexture = (itemTextureDirectory as FileTree)[
            `${paths[paths.length - 1]}.png`
          ];
          if (itemTexture == null) continue;
          itemImages.push(await loadImageFile(itemTexture as File));
        }

        if (itemImages.length < 1) continue;
        const finalImage =
          itemImages.length === 1
            ? itemImages[0]
            : await mergeImageLayers(itemImages);
        spriteTextures.push({
          name: `${item.asset}:${item.name}`,
          image: finalImage,
        });
      } else if (parentSplit != null && parentSplit[0] === "item") {
        const textures = (fileTree?.[item.asset] as FileTree)?.textures;
        if (textures == null) continue;
        const itemTextures = (textures as FileTree)?.item;
        if (itemTextures == null) continue;
        const itemTexture = (itemTextures as FileTree)?.[`${item.name}.png`];
        if (itemTexture == null) continue;
        spriteTextures.push({
          name: `${item.asset}:${item.name}`,
          image: await loadImageFile(itemTexture as File),
        });
      } else if (parentSplit != null && parentSplit[0] === "block") {
        blocksToRender.push(item);
      } else {
        console.log(`Can't render: ${item.parent}`);
      }
    } catch (err) {
      console.error(`Failed to load item: ${item.name}`);
      throw err;
    }
  }

  console.log(`spriteTextures: ${spriteTextures.length}`);
  outputCanvas.width = 1024;
  outputCanvas.height = Math.max(
    32 * Math.ceil((spriteTextures.length + blocksToRender.length) / 32),
    32
  );
  //   outputCanvas.hidden = false;

  const context = outputCanvas.getContext("2d");
  if (context == null) throw new Error("Canvas has null context");
  context.imageSmoothingEnabled = false;

  let x = 0;
  let y = 0;
  const spritesMap = new Map<string, number>();
  let spritesMapIndex = 0;
  for (const spriteTexture of spriteTextures) {
    spritesMap.set(spriteTexture.name, spritesMapIndex++);
    context.drawImage(spriteTexture.image, x, y, 32, 32);

    if (x >= 992) {
      x = 0;
      y += 32;
    } else {
      x += 32;
    }
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(20, 1, 0.1, 1000);
  const renderer = new WebGLRenderer({
    antialias: true,
    depth: true,
    alpha: true,
    premultipliedAlpha: false,
    // preserveDrawingBuffer: true,
  });
  // renderer.outputColorSpace = SRGBColorSpace;
  renderer.setSize(512, 512);
  renderer.setPixelRatio(1);

  camera.position.z = 5;

  const geometries = createBasePlaneGeometries();
  const shaderMaterial = createShaderMaterial();
  const geometry = new BufferGeometry();
  const sceneMesh = new Mesh(geometry, shaderMaterial);
  sceneMesh.rotateX((30 * Math.PI) / 180);
  sceneMesh.rotateY((225 * Math.PI) / 180);
  sceneMesh.receiveShadow = true;
  scene.add(sceneMesh);
  scene.add(new AmbientLight(0xffffff, 10));
  const unknown = atlasMap.textures["unknown"];

  const color = new Color(0xffffff);
  color.convertSRGBToLinear();

  const bytesInFloat32 = 4;
  const bytesInInt32 = 4;

  for (const blockToRender of blocksToRender) {
    if (blockToRender.parent == null) continue;

    const parentAssetSplit = blockToRender.parent?.split(":");
    const asset =
      parentAssetSplit != null && parentAssetSplit.length > 1
        ? parentAssetSplit[0]
        : blockToRender.asset;
    const split = (
      parentAssetSplit != null && parentAssetSplit.length > 1
        ? parentAssetSplit[1]
        : blockToRender.parent
    )?.split("/");
    const modelName = `${asset}:${split[split.length - 1]}`;

    const minimizedAtlas = createMinimizedAtlas(atlasMap, atlas, modelName);
    shaderMaterial.uniforms.diffuseMap.value = minimizedAtlas.atlasTexture;
    shaderMaterial.needsUpdate = true;

    const mesh: {
      positions: number[];
      uvs: number[];
      uvSlices: number[];
      normals: number[];
      colors: number[];
      indices: number[];
    } = {
      positions: [],
      uvs: [],
      uvSlices: [],
      normals: [],
      colors: [],
      indices: [],
    };

    const atlasMapTexture = atlasMap.textures[modelName];
    if (atlasMapTexture == null) {
      console.log(`${modelName} is broken!`);
    }

    const blockTextures = atlasMapTexture ?? unknown;
    const blockFaces = atlasMap.models[blockTextures.model];
    if (blockFaces == null) {
      console.log(`${modelName} is broken!`);
      continue;
    }

    for (let i = 0; i < blockFaces.length; i++) {
      const blockFace = blockFaces[i];
      const bi = mesh.positions.length / 3;
      mesh.positions.push(...blockFace.face);
      mesh.uvs.push(0, 0, 1, 0, 0, 1, 1, 1);

      // TODO: Fix this hack!
      const normalsArr =
        i < geometries.length
          ? geometries[i].attributes.normal.array
          : [1, 0, 6.12, 1, 0, 6.12, 1, 0, 6.12, 1, 0, 6.12];
      mesh.normals.push(...normalsArr);

      const blockTexture = (() => {
        const blockTexture = blockTextures[blockFace.texture];
        if (blockTexture == null) return 0;
        if (typeof blockTexture === "number") {
          return blockTexture;
        } else {
          return blockTexture[i];
        }
      })();

      for (let v = 0; v < 4; v++) {
        mesh.uvSlices.push(minimizedAtlas.atlasTextureMap[blockTexture]);
        mesh.colors.push(color.r, color.g, color.b, 255);
      }

      const localIndices = [0, 2, 1, 2, 3, 1];
      for (let j = 0; j < localIndices.length; j++) {
        localIndices[j] += bi;
      }
      mesh.indices.push(...localIndices);
    }

    const positions = new Float32Array(
      new ArrayBuffer(bytesInFloat32 * mesh.positions.length)
    );
    const uvs = new Float32Array(
      new ArrayBuffer(bytesInFloat32 * mesh.uvs.length)
    );
    const uvSlices = new Float32Array(
      new ArrayBuffer(bytesInFloat32 * mesh.uvSlices.length)
    );
    const normals = new Float32Array(
      new ArrayBuffer(bytesInFloat32 * mesh.normals.length)
    );
    const colors = new Float32Array(
      new ArrayBuffer(bytesInFloat32 * mesh.colors.length)
    );
    const indices = new Uint32Array(
      new ArrayBuffer(bytesInInt32 * mesh.indices.length)
    );

    positions.set(mesh.positions, 0);
    normals.set(mesh.normals, 0);
    uvs.set(mesh.uvs, 0);
    uvSlices.set(mesh.uvSlices, 0);
    colors.set(mesh.colors, 0);
    indices.set(mesh.indices, 0);

    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("uvSlice", new Float32BufferAttribute(uvSlices, 1));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 4));
    geometry.setIndex(new BufferAttribute(indices, 1));

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    renderer.render(scene, camera);
    spritesMap.set(`${asset}:${blockToRender.name}`, spritesMapIndex++);
    context.drawImage(renderer.domElement, x, y, 32, 32);

    if (x >= 992) {
      x = 0;
      y += 32;
    } else {
      x += 32;
    }
  }

  return {
    sprites: outputCanvas.toDataURL("image/png"),
    spritesMap,
  };
};
