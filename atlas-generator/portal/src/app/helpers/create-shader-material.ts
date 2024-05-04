import { FrontSide, ShaderMaterial } from "three";
import { fragmentShader, vertexShader } from "../components/custom-shader";

export const createShaderMaterial = () =>
  new ShaderMaterial({
    name: "shaderMaterial - materialOpqaque",
    uniforms: {
      diffuseMap: {
        value: null,
      },
      noiseMap: {
        value: null,
      },
      fade: {
        value: 1.0,
      },
      flow: {
        value: 0.0,
      },
    },
    vertexShader,
    fragmentShader,
    side: FrontSide,
    // transparent: true,
    opacity: 1,
    premultipliedAlpha: false,
  });
