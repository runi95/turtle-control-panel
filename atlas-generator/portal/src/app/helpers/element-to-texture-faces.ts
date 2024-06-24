import { PlaneGeometry, TypedArray } from "three";
import { Element } from "../components/landing-page";

export type TexturedFace = {
  texture: string;
  face: TypedArray;
  uv?: number[];
  color?: string;
};

export const elementToTexturedFaces = (element: Element): TexturedFace[] => {
  const texturedFaces: TexturedFace[] = [];

  const back = element.from[0] / 16 - 0.5;
  const front = element.to[0] / 16 - 0.5;
  const top = element.from[1] / 16 - 0.5;
  const bottom = element.to[1] / 16 - 0.5;
  const left = element.from[2] / 16 - 0.5;
  const right = element.to[2] / 16 - 0.5;

  if (element.faces.west) {
    const planeGeometry = new PlaneGeometry();
    (planeGeometry.attributes.position as any).array = [
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
      color:
        element.faces.west.color ??
        (element.faces.west.tintindex != null ? "#A2E579" : undefined),
    });
  }

  if (element.faces.east) {
    const planeGeometry = new PlaneGeometry();
    (planeGeometry.attributes.position as any).array = [
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
      color:
        element.faces.east.color ??
        (element.faces.east.tintindex != null ? "#A2E579" : undefined),
    });
  }

  if (element.faces.up) {
    const planeGeometry = new PlaneGeometry();
    (planeGeometry.attributes.position as any).array = [
      back,
      bottom,
      left,
      front,
      bottom,
      left,
      back,
      bottom,
      right,
      front,
      bottom,
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
      uv: element.faces.up.uv,
      color:
        element.faces.up.color ??
        (element.faces.up.tintindex != null ? "#A2E579" : undefined),
    });
  }

  if (element.faces.down) {
    const planeGeometry = new PlaneGeometry();
    (planeGeometry.attributes.position as any).array = [
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
      color:
        element.faces.down.color ??
        (element.faces.down.tintindex != null ? "#A2E579" : undefined),
    });
  }

  if (element.faces.north) {
    const planeGeometry = new PlaneGeometry();
    (planeGeometry.attributes.position as any).array = [
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
      color:
        element.faces.north.color ??
        (element.faces.north.tintindex != null ? "#A2E579" : undefined),
    });
  }

  if (element.faces.south) {
    const planeGeometry = new PlaneGeometry();
    (planeGeometry.attributes.position as any).array = [
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
      color:
        element.faces.south.color ??
        (element.faces.south.tintindex != null ? "#A2E579" : undefined),
    });
  }

  return texturedFaces;
};
