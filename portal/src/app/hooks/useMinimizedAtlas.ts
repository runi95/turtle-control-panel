import { useMemo } from "react";
import { Blocks } from "../types/blocks";
import { Model } from "../../server/loadAssets";
import { Blockstates } from "./useBlockstates";
import { Textures } from "./useTextures";
import {
  ClampToEdgeWrapping,
  DataArrayTexture,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";
import { Models } from "./useModels";
import { useMultipleTextures } from "./useMultipleTextures";
import { ImageData } from "canvas";
import { Block } from "../types/block";

const LAYER_W = 64;
const LAYER_H = 64;
const BYTES_PER_PIXEL = 4;
const BYTES_PER_LAYER = LAYER_W * LAYER_H * BYTES_PER_PIXEL;

export type TextureInfo = {
  layer: number;
  offset: number;
  tileSize: 16 | 32 | 64;
};

const writeTile = (
  dst: Uint8Array,
  layer: number,
  tileIndex: number,
  src: Uint8ClampedArray,
  tileSize: number,
) => {
  const tileBytesPerRow = tileSize * BYTES_PER_PIXEL;
  const tilesPerRow = LAYER_W / tileSize;
  const tileX = tileIndex % tilesPerRow;
  const tileY = Math.floor(tileIndex / tilesPerRow);

  for (let row = 0; row < tileSize; row++) {
    const dstRow =
      layer * BYTES_PER_LAYER +
      ((tileY * tileSize + row) * LAYER_W + tileX * tileSize) * BYTES_PER_PIXEL;

    const srcRow = row * tileBytesPerRow;

    dst.set(src.slice(srcRow, srcRow + tileBytesPerRow), dstRow);
  }
};

const collectTextureNames = (
  blockstates: Blockstates,
  models: Models,
  blocks: Record<string, Omit<Block, "x" | "y" | "z" | "tags">>,
) => {
  const blockKeys = Object.keys(blocks);
  const uniqueBlocks = blockKeys.reduce((acc, curr) => {
    const block = blocks[curr];
    acc.add(block.name);
    return acc;
  }, new Set<string>());

  const uniqueTextureNames = new Set<string>();
  const collectTextures = (model: Model, noNamespace?: boolean) => {
    const { textures: modelTextures } = model;
    if (modelTextures != null) {
      for (const texture of Object.values(modelTextures)) {
        if (texture.startsWith("#")) continue;

        const textureNamespaceSplit = texture.split(":");
        uniqueTextureNames.add(
          textureNamespaceSplit.length > 1 || noNamespace
            ? texture
            : `minecraft:${texture}`,
        );
      }
    }

    const { parent } = model;
    if (parent == null) return;

    const parentNamespaceSplit = parent.split(":");
    const parentModel =
      models[parentNamespaceSplit.length > 1 ? parent : `minecraft:${parent}`];
    if (parentModel == null) return;

    collectTextures(parentModel);
  };
  collectTextures(models["unknown"], true);

  for (const block of uniqueBlocks) {
    const blockstate = blockstates[block];
    if (blockstate == null) continue;

    const { variants, multipart } = blockstate;
    const modelNames = (() => {
      if (variants != null) {
        const keys = Object.keys(variants);
        if (keys.length < 1) {
          console.log(`${block} is missing variant keys!`);
          return;
        }

        return keys.map((key) => variants[key].model);
      } else {
        const modelNames: string[] = [];
        for (const part of multipart) {
          if (Array.isArray(part.apply)) {
            for (let i = 0; i < part.apply.length; i++) {
              modelNames.push(part.apply[i].model);
            }
          } else {
            modelNames.push(part.apply.model);
          }
        }
        return modelNames;
      }
    })();
    if (modelNames == null) {
      console.warn(`Cannot find model name for ${block}`);
      continue;
    }

    for (const modelName of modelNames) {
      const model = models[modelName];
      if (model == null) {
        console.log(`No model with name ${modelName} exists for ${block}`);
        continue;
      }

      collectTextures(model);
    }
  }

  return uniqueTextureNames;
};

export const createMinimizedAtlas = (
  smallTextures: Map<string, ImageData>,
  mediumTextures: Map<string, ImageData>,
  largeTextures: Map<string, ImageData>,
) => {
  const textureInfoMap: Record<string, TextureInfo> = {};

  const depth =
    largeTextures.size +
    Math.ceil(mediumTextures.size / 4) +
    Math.ceil(smallTextures.size / 16);

  const newUintArray = new Uint8Array(BYTES_PER_LAYER * depth);

  let layer = 0;
  const smallEntries = Array.from(smallTextures.entries());
  for (let i = 0; i < smallEntries.length; i += 16) {
    for (let j = 0; j < 16 && i + j < smallEntries.length; j++) {
      const [key, tex] = smallEntries[i + j];
      textureInfoMap[key] = { layer, offset: j, tileSize: 16 };
      writeTile(newUintArray, layer, j, tex.data, 16);
    }
    layer++;
  }

  const mediumEntries = Array.from(mediumTextures.entries());
  for (let i = 0; i < mediumEntries.length; i += 4) {
    for (let j = 0; j < 4 && i + j < mediumEntries.length; j++) {
      const [key, tex] = mediumEntries[i + j];
      textureInfoMap[key] = { layer, offset: j, tileSize: 32 };
      writeTile(newUintArray, layer, j, tex.data, 32);
    }
    layer++;
  }

  const largeEntries = Array.from(largeTextures.entries());
  for (let i = 0; i < largeEntries.length; i++) {
    const [key, tex] = largeEntries[i];
    textureInfoMap[key] = { layer, offset: 0, tileSize: 64 };
    newUintArray.set(tex.data, layer * BYTES_PER_LAYER);
    layer++;
  }

  const atlasTexture = new DataArrayTexture(
    newUintArray,
    LAYER_W,
    LAYER_H,
    depth,
  );
  atlasTexture.format = RGBAFormat;
  atlasTexture.type = UnsignedByteType;
  atlasTexture.minFilter = NearestFilter;
  atlasTexture.magFilter = NearestFilter;
  atlasTexture.wrapS = ClampToEdgeWrapping;
  atlasTexture.wrapT = ClampToEdgeWrapping;
  atlasTexture.generateMipmaps = false;
  atlasTexture.colorSpace = SRGBColorSpace;

  atlasTexture.needsUpdate = true;
  return {
    atlasTexture,
    textureInfoMap,
  };
};

export const useMinimizedAtlas = (
  blockstates: Blockstates,
  models: Models,
  blocks?: Record<string, Omit<Block, "x" | "y" | "z" | "tags">>,
) => {
  const textureNames = useMemo(() => {
    if (blocks == null) return null;
    return collectTextureNames(blockstates, models, blocks);
  }, [blockstates, models, blocks]);

  const multipleTextures = useMultipleTextures([...(textureNames ?? [])]);
  return useMemo(() => {
    if (multipleTextures == null) return null;
    if (!multipleTextures.isSuccess) return null;
    if (multipleTextures.isLoading) return null;

    return createMinimizedAtlas(
      multipleTextures.smallTextures,
      multipleTextures.mediumTextures,
      multipleTextures.largeTextures,
    );
  }, [multipleTextures]);
};
