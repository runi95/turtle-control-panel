import { Blockstates } from "../../../../hooks/useBlockstates";
import {
  BlockstateMultipart,
  BlockstateVariant,
  BlockstateVariants,
} from "../../../../../loadAssets";
import { cleanStateValue } from "./helpers";
import { ModelBuilder } from "./modelBuilder";

export class BlockBuilder {
  private readonly blockstates: Blockstates;
  private readonly modelBuilder: ModelBuilder;

  constructor(blockstates: Blockstates, modelBuilder: ModelBuilder) {
    this.blockstates = blockstates;
    this.modelBuilder = modelBuilder;
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

    this.modelBuilder.buildModel(blockName, variantModel, variant.x, variant.y);
  }

  private buildModelsFromMultipart(
    multipart: BlockstateMultipart[],
    blockName: string,
    state?: Record<string, string>,
  ) {
    for (const part of multipart) {
      const { when, apply } = part;
      if (when == null) {
        if (Array.isArray(apply)) {
          for (let i = 0; i < apply.length; i++) {
            this.modelBuilder.buildModel(
              blockName,
              apply[i].model,
              apply[i].x,
              apply[i].y,
            );
          }
        } else {
          this.modelBuilder.buildModel(
            blockName,
            apply.model,
            apply.x,
            apply.y,
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
            this.modelBuilder.buildModel(
              blockName,
              apply[i].model,
              apply[i].x,
              apply[i].y,
            );
          }
        } else {
          this.modelBuilder.buildModel(
            blockName,
            apply.model,
            apply.x,
            apply.y,
          );
        }
      }
    }
  }

  public buildBlock(blockName: string, state?: Record<string, string>) {
    let blockstate = this.blockstates[blockName];
    if (blockstate == null) {
      console.log(`${blockName} is broken!`);
      blockstate = this.blockstates["unknown"];
    }

    const { variants, multipart } = blockstate;
    if (variants != null)
      return this.buildModelsFromVariants(variants, blockName, state);
    return this.buildModelsFromMultipart(multipart, blockName, state);
  }
}
