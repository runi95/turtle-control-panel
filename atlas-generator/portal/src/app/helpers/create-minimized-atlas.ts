import {
  ClampToEdgeWrapping,
  DataArrayTexture,
  LinearMipMapLinearFilter,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";
import { AtlasMap } from "../components/landing-page";

export const createMinimizedAtlas = (
  atlasMap: AtlasMap,
  atlas: ArrayBuffer,
  modelName: string
) => {
  const uniqueTextures = new Set<number>([0]);
  const unknown = atlasMap.textures["unknown"];
  const texture = atlasMap.textures[modelName] ?? unknown;
  const { model: _model, ...textureKeys } = texture;
  Object.keys(textureKeys).forEach((key) => {
    const textureIndex = texture[key];
    if (typeof textureIndex === "number") {
      uniqueTextures.add(textureIndex);
    } else {
      Object.keys(textureIndex).forEach((textureIndexKey) =>
        uniqueTextures.add(textureIndex[textureIndexKey])
      );
    }
  });

  const originalUintArray = new Uint8Array(atlas);
  const newUintArray = new Uint8Array(uniqueTextures.size * 1024);

  let i = 0;
  const atlasTextureMap: {
    [key: number]: number;
  } = {};
  for (const uniqueTexture of uniqueTextures.values()) {
    const start = uniqueTexture * 1024;
    atlasTextureMap[uniqueTexture] = i;
    newUintArray.set(
      originalUintArray.subarray(start, start + 1024),
      1024 * i++
    );
  }

  const atlasTexture = new DataArrayTexture(
    newUintArray,
    16,
    16,
    newUintArray.length / 1024
  );
  atlasTexture.format = RGBAFormat;
  atlasTexture.type = UnsignedByteType;
  atlasTexture.minFilter = LinearMipMapLinearFilter;
  atlasTexture.magFilter = NearestFilter;
  atlasTexture.wrapS = ClampToEdgeWrapping;
  atlasTexture.wrapT = ClampToEdgeWrapping;
  atlasTexture.generateMipmaps = true;
  atlasTexture.colorSpace = SRGBColorSpace;
  atlasTexture.premultiplyAlpha = false;

  atlasTexture.needsUpdate = true;
  return {
    atlasTexture,
    atlasTextureMap,
  };
};
