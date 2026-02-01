export const vertexShader = `
precision mediump float;

// Attributes, declared by three.js
// attribute vec3 position;
// attribute vec3 normal;
// attribute vec2 uv;
attribute vec3 color;
attribute float uvSlice;

// Outputs
varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vWorldPosition;
varying vec3 vUV;

#define saturate(a) clamp( a, 0.0, 1.0 )

void main(){
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  vNormal = normal;
  vColor = color;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vUV = vec3(uv, uvSlice);
}
`;
