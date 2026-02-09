import { Color, PlaneGeometry } from "three";
import { TextureInfo } from "../../../../hooks/useMinimizedAtlas";
import {
  Model,
  ModelElement,
  ModelFace,
} from "../../../../../server/loadAssets";

const defaultColor = new Color(0xffffff);
defaultColor.convertSRGBToLinear();

export class ModelFaceBuilder {
  private readonly positions: number[];
  private readonly uvs: number[];
  private readonly normals: number[];
  private readonly colors: number[];
  private readonly indices: number[];
  private readonly uvSlices: number[];
  private readonly textureInfoMap: Record<string, TextureInfo>;
  private faceCount: number = 0;

  constructor(
    positions: number[],
    uvs: number[],
    normals: number[],
    colors: number[],
    indices: number[],
    uvSlices: number[],
    textureInfoMap: Record<string, TextureInfo>,
  ) {
    this.positions = positions;
    this.uvs = uvs;
    this.normals = normals;
    this.colors = colors;
    this.indices = indices;
    this.uvSlices = uvSlices;
    this.textureInfoMap = textureInfoMap;
  }

  public getFaceCount(): number {
    return this.faceCount;
  }

  private applyRotation(
    planeGeometry: PlaneGeometry,
    element: ModelElement,
    rotateX?: number,
    rotateY?: number,
  ) {
    const { rotation } = element;
    if (rotation != null) {
      const { axis, angle, origin } = rotation;
      if (origin != null) {
        planeGeometry.translate(
          -origin[0] / 16 + 0.5,
          -origin[1] / 16 + 0.5,
          -origin[2] / 16 + 0.5,
        );
      }

      const radians = (angle * Math.PI) / 180;
      if (axis === "y") {
        planeGeometry.rotateY(radians);
      } else if (axis === "x") {
        planeGeometry.rotateX(radians);
      } else if (axis === "z") {
        planeGeometry.rotateZ(radians);
      }

      if (origin != null) {
        planeGeometry.translate(
          origin[0] / 16 - 0.5,
          origin[1] / 16 - 0.5,
          origin[2] / 16 - 0.5,
        );
      }
    }

    if (rotateX != null) {
      planeGeometry.rotateX(-(rotateX * Math.PI) / 180);
    }

    if (rotateY != null) {
      planeGeometry.rotateY(-(rotateY * Math.PI) / 180);
    }
  }

  private getTintColorCode(
    blockName: string,
    tintindex?: number,
  ): string | undefined {
    if (tintindex == null) return undefined;

    switch (blockName) {
      case "minecraft:grass":
      case "minecraft:grass_block":
      case "minecraft:short_grass":
      case "minecraft:tall_grass":
      case "minecraft:fern":
      case "minecraft:large_fern":
        return "#7CBD6B";
      case "minecraft:oak_leaves":
      case "minecraft:spruce_leaves":
      case "minecraft:birch_leaves":
      case "minecraft:jungle_leaves":
      case "minecraft:acacia_leaves":
      case "minecraft:dark_oak_leaves":
      case "minecraft:mangrove_leaves":
      case "minecraft:azalea_leaves":
      case "minecraft:flowering_azalea_leaves":
      case "minecraft:vine":
      case "minecraft:lily_pad":
        return "#59AE30";
      case "minecraft:water":
        return "#3F76E4";
      case "minecraft:redstone_wire":
        return "#8D0000";
      default:
        return undefined;
    }
  }

  private getFaceColor(blockName: string, tintindex?: number) {
    const colorCode = this.getTintColorCode(blockName, tintindex);
    if (colorCode == null) return defaultColor;

    const color = new Color(colorCode);
    color.convertSRGBToLinear();
    return color;
  }

  private getTextureIndex(
    textureName: string,
    model: Model,
    blockName: string,
  ): TextureInfo | undefined {
    const { textures } = model;
    if (textures == null) {
      console.log(`Found no texture for ${blockName}`);
      return undefined;
    }

    const getTexture = (textureName: string) => {
      if (textureName == null) {
        console.log(`Texture for ${blockName} is broken!`);
        return undefined;
      }
      if (!textureName.startsWith("#")) return textureName;
      return getTexture(textures[textureName.substring(1)]);
    };

    const texture = getTexture(textureName);
    if (texture == null) {
      console.log(`${textureName} is bad texture for ${blockName}`);
      return undefined;
    }

    const textureIndex = this.textureInfoMap[texture];
    if (textureIndex == null) {
      console.log(
        `Texture index does not exist for ${texture} on ${blockName}`,
      );
      return undefined;
    }

    return textureIndex;
  }

  public buildModelFace(
    blockName: string,
    model: Model,
    positions: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    element: ModelElement,
    face: ModelFace,
    rotateX?: number,
    rotateY?: number,
  ) {
    const textureInfo = this.getTextureIndex(face.texture, model, blockName);
    const layer = textureInfo?.layer ?? 0;
    this.uvSlices.push(layer, layer, layer, layer);

    const offset = textureInfo?.offset ?? 0;
    const tileSize = textureInfo?.tileSize ?? 16;

    const planeGeometry = new PlaneGeometry();

    // @ts-ignore
    planeGeometry.attributes["position"]["array"] = positions;
    this.applyRotation(planeGeometry, element, rotateX, rotateY);
    const localPositions = planeGeometry.attributes["position"]["array"];

    const bi = this.positions.length / 3;
    this.positions.push(...localPositions);

    let [u0p, v0p, u1p, v1p] = face.uv ?? [0, 0, 16, 16];

    if (tileSize === 16) {
      u0p *= 0.25;
      v0p *= 0.25;
      u1p *= 0.25;
      v1p *= 0.25;

      const offsetX = (offset * 4) % 16;
      const offsetY = Math.floor(offset / 4) * 4;

      u0p += offsetX;
      v0p += offsetY;
      u1p += offsetX;
      v1p += offsetY;
    } else if (tileSize === 32) {
      u0p *= 0.5;
      v0p *= 0.5;
      u1p *= 0.5;
      v1p *= 0.5;

      const offsetX = (offset * 8) % 16;
      const offsetY = Math.floor(offset / 2) * 8;

      u0p += offsetX;
      v0p += offsetY;
      u1p += offsetX;
      v1p += offsetY;
    }

    // Normalize rectangle
    const uMin = Math.min(u0p, u1p);
    const uMax = Math.max(u0p, u1p);
    const vMin = Math.min(v0p, v1p);
    const vMax = Math.max(v0p, v1p);

    const flipU = u0p > u1p;
    const flipV = v0p > v1p;

    const u0 = uMin / 16;
    const u1 = uMax / 16;
    const v0 = vMin / 16;
    const v1 = vMax / 16;

    const rotateAndFlipUVs = (uvs: [number, number][], rotation?: number) => {
      if (flipU) {
        uvs = [uvs[1], uvs[0], uvs[3], uvs[2]];
      }

      if (flipV) {
        uvs = [uvs[2], uvs[3], uvs[0], uvs[1]];
      }

      if (rotation == null) return uvs;
      let result = [...uvs];
      const steps = (rotation % 360) / 90;

      for (let i = 0; i < steps; i++) {
        result = [result[1], result[3], result[0], result[2]];
      }

      return result;
    };

    const uvs = rotateAndFlipUVs(
      [
        [u0, v1],
        [u1, v1],
        [u0, v0],
        [u1, v0],
      ],
      face.rotation,
    );

    for (const [u, v] of uvs) {
      this.uvs.push(u, v);
    }

    planeGeometry.computeVertexNormals();
    this.normals.push(...planeGeometry.attributes["normal"]["array"]);

    const color = this.getFaceColor(blockName, face.tintindex);
    for (let v = 0; v < 4; v++) {
      this.colors.push(color.r, color.g, color.b);
    }

    const localIndices = [0, 1, 2, 2, 1, 3];
    for (let j = 0; j < localIndices.length; j++) {
      localIndices[j] += bi;
    }
    this.indices.push(...localIndices);
    this.faceCount++;
  }
}
