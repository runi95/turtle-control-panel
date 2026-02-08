import { Model } from "../../../../../loadAssets";
import { Models } from "../../../../hooks/useModels";
import deepAssign from "assign-deep";
import { ModelFaceBuilder } from "./modelFaceBuilder";

export class ModelBuilder {
  private readonly models: Models;
  private readonly modelFaceBuilder: ModelFaceBuilder;

  constructor(models: Models, modelFaceBuilder: ModelFaceBuilder) {
    this.models = models;
    this.modelFaceBuilder = modelFaceBuilder;
  }

  private extractFullModel(model: Model): Model {
    const { parent: parentName } = model;
    if (parentName == null) return model;

    const parentNamespaceSplit = parentName.split(":");
    const parent =
      this.models[
        parentNamespaceSplit.length > 1 ? parentName : `minecraft:${parentName}`
      ];
    if (parent == null) {
      console.log(`Unable to locate parent "${parentName}"`);
      return model;
    }

    return deepAssign({}, model, this.extractFullModel(parent));
  }

  public buildModel(
    blockName: string,
    modelName: string,
    rotateX?: number,
    rotateY?: number,
  ) {
    let model = this.models[modelName];
    if (model == null) {
      console.log(`Unknown model "${modelName}"`);
      model = this.models["unknown"];
    }

    let fullModel = this.extractFullModel(model);
    if (fullModel.elements == null) {
      console.log(`"${modelName}" has no elements!`);
      fullModel = this.extractFullModel(this.models["unknown"]);
    }

    const { elements } = fullModel;
    if (elements == null) return;

    for (const element of elements) {
      const x0 = element.from[0] / 16 - 0.5;
      const x1 = element.to[0] / 16 - 0.5;
      const y0 = element.from[1] / 16 - 0.5;
      const y1 = element.to[1] / 16 - 0.5;
      const z0 = element.from[2] / 16 - 0.5;
      const z1 = element.to[2] / 16 - 0.5;

      if (element.faces.west) {
        this.modelFaceBuilder.buildModelFace(
          blockName,
          model,
          [x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z1],
          element,
          element.faces.west,
          rotateX,
          rotateY,
        );
      }

      if (element.faces.east) {
        this.modelFaceBuilder.buildModelFace(
          blockName,
          model,
          [x1, y0, z1, x1, y0, z0, x1, y1, z1, x1, y1, z0],
          element,
          element.faces.east,
          rotateX,
          rotateY,
        );
      }

      if (element.faces.up) {
        this.modelFaceBuilder.buildModelFace(
          blockName,
          model,
          [x0, y1, z1, x1, y1, z1, x0, y1, z0, x1, y1, z0],
          element,
          element.faces.up,
          rotateX,
          rotateY,
        );
      }

      if (element.faces.down) {
        this.modelFaceBuilder.buildModelFace(
          blockName,
          model,
          [x0, y0, z0, x1, y0, z0, x0, y0, z1, x1, y0, z1],
          element,
          element.faces.down,
          rotateX,
          rotateY,
        );
      }

      if (element.faces.north) {
        this.modelFaceBuilder.buildModelFace(
          blockName,
          model,
          [x1, y0, z0, x0, y0, z0, x1, y1, z0, x0, y1, z0],
          element,
          element.faces.north,
          rotateX,
          rotateY,
        );
      }

      if (element.faces.south) {
        this.modelFaceBuilder.buildModelFace(
          blockName,
          model,
          [x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1],
          element,
          element.faces.south,
          rotateX,
          rotateY,
        );
      }
    }
  }
}
