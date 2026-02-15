import { Blockstates } from "../../../../hooks/useBlockstates";
import {
  BlockstateMultipart,
  BlockstateVariant,
  BlockstateVariants,
} from "../../../../../server/loadAssets";
import { cleanStateValue } from "./helpers";
import { ModelBuilder } from "./modelBuilder";
import { FaceBuildInfo } from "./modelFaceBuilder";

export class BlockBuilder {
  private readonly cache = new Map<string, Record<string, FaceBuildInfo[]>>();
  private readonly blockstates: Blockstates;
  private readonly modelBuilder: ModelBuilder;
  private readonly positions: number[];
  private readonly uvs: number[];
  private readonly normals: number[];
  private readonly colors: number[];
  private readonly indices: number[];
  private readonly uvSlices: number[];
  private faceCount = 0;

  constructor(
    blockstates: Blockstates,
    modelBuilder: ModelBuilder,
    positions: number[],
    uvs: number[],
    normals: number[],
    colors: number[],
    indices: number[],
    uvSlices: number[],
  ) {
    this.blockstates = blockstates;
    this.modelBuilder = modelBuilder;
    this.positions = positions;
    this.uvs = uvs;
    this.normals = normals;
    this.colors = colors;
    this.indices = indices;
    this.uvSlices = uvSlices;
  }

  public getFaceCount(): number {
    return this.faceCount;
  }

  private buildModelsFromVariants(
    variants: BlockstateVariants,
    blockName: string,
    state?: Record<string, string>,
  ) {
    let variant = Object.entries(variants).reduce<BlockstateVariant | null>(
      (acc, [key, variant], index) => {
        if (index === 0) return variant;
        if (state == null) return acc;
        if (key === "") return acc;

        const split = key.split(",");
        for (const keyValuePairString of split) {
          const keyValuePair = keyValuePairString.split("=");
          if (keyValuePair.length !== 2) continue;

          const [key, value] = keyValuePair;
          if (cleanStateValue(state[key]) != cleanStateValue(value)) return acc;
        }

        return variant;
      },
      null,
    );
    if (variant == null) {
      console.log(`Unable to find variant for ${blockName}`);
      variant = this.blockstates["unknown"].variants![""];
    }

    let variantModel = variant.model;
    if (variantModel == null) {
      console.log(`No model on variant for ${blockName}`);
      variantModel = this.blockstates["unknown"].variants![""].model;
    }

    return this.modelBuilder.buildModel(
      blockName,
      variantModel,
      variant.x,
      variant.y,
    );
  }

  private buildModelsFromMultipart(
    multipart: BlockstateMultipart[],
    blockName: string,
    state?: Record<string, string>,
  ) {
    const builds: FaceBuildInfo[][] = [];
    for (const part of multipart) {
      const { when, apply } = part;
      if (when == null) {
        if (Array.isArray(apply)) {
          for (let i = 0; i < apply.length; i++) {
            builds.push(
              this.modelBuilder.buildModel(
                blockName,
                apply[i].model,
                apply[i].x,
                apply[i].y,
              ),
            );
          }
        } else {
          builds.push(
            this.modelBuilder.buildModel(
              blockName,
              apply.model,
              apply.x,
              apply.y,
            ),
          );
        }
      } else {
        const { OR, ...AND } = when;

        const validateAgainstObject = (obj: Record<string, string>) => {
          if (state == null) return false;

          let isValid = true;
          for (const key of Object.keys(obj)) {
            const values = obj[key].split("|");

            let anyMatches = false;
            for (const value of values) {
              if (cleanStateValue(state[key]) == cleanStateValue(value)) {
                anyMatches = true;
                break;
              }
            }
            if (anyMatches) continue;

            isValid = false;
            break;
          }
          return isValid;
        };
        if (AND != null) {
          if (!validateAgainstObject(AND)) continue;
        }

        if (OR != null) {
          let isAnyValid = false;
          for (const check of OR) {
            if (validateAgainstObject(check)) {
              isAnyValid = true;
              break;
            }
          }

          if (!isAnyValid) continue;
        }

        if (Array.isArray(apply)) {
          for (let i = 0; i < apply.length; i++) {
            builds.push(
              this.modelBuilder.buildModel(
                blockName,
                apply[i].model,
                apply[i].x,
                apply[i].y,
              ),
            );
          }
        } else {
          builds.push(
            this.modelBuilder.buildModel(
              blockName,
              apply.model,
              apply.x,
              apply.y,
            ),
          );
        }
      }
    }

    return builds;
  }

  private buildFromFaceBuildInfo(faceBuildInfo: FaceBuildInfo[]) {
    for (const {
      layer,
      localPositions,
      uvs,
      normals,
      color,
    } of faceBuildInfo) {
      this.uvSlices.push(layer, layer, layer, layer);

      const bi = this.positions.length / 3;
      this.positions.push(...localPositions);

      for (const [u, v] of uvs) {
        this.uvs.push(u, v);
      }

      this.normals.push(...normals);

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

  public buildBlock(blockName: string, state?: Record<string, string>) {
    const stringifiedState = JSON.stringify(state);
    const cachedBlockType = this.cache.get(blockName);
    if (cachedBlockType != null) {
      const cachedBlock = cachedBlockType[stringifiedState];
      if (cachedBlock != null) {
        this.buildFromFaceBuildInfo(cachedBlock);
        return;
      }
    }

    let blockstate = this.blockstates[blockName];
    if (blockstate == null) {
      console.log(`${blockName} is broken!`);
      blockstate = this.blockstates["unknown"];
    }

    const { variants, multipart } = blockstate;
    if (variants != null) {
      const faceBuildInfo = this.buildModelsFromVariants(
        variants,
        blockName,
        state,
      );
      if (cachedBlockType != null) {
        cachedBlockType[stringifiedState] = faceBuildInfo;
      } else {
        this.cache.set(blockName, {
          [stringifiedState]: faceBuildInfo,
        });
      }

      this.buildFromFaceBuildInfo(faceBuildInfo);
    } else {
      const faceBuildInfo = this.buildModelsFromMultipart(
        multipart,
        blockName,
        state,
      ).flat();
      if (cachedBlockType != null) {
        cachedBlockType[stringifiedState] = faceBuildInfo;
      } else {
        this.cache.set(blockName, {
          [stringifiedState]: faceBuildInfo,
        });
      }

      this.buildFromFaceBuildInfo(faceBuildInfo);
    }
  }
}
