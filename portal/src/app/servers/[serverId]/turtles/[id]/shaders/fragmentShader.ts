export const fragmentShader = `
precision mediump float;
precision mediump sampler2DArray;

#define saturate(a) clamp( a, 0.0, 1.0 )

uniform float fade;
uniform float flow;

uniform sampler2DArray diffuseMap;
uniform sampler2D noiseMap;

varying vec3 vUV;
varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vWorldPosition;

void main() {
  vec4 diffuse = texture2D(diffuseMap, vUV);
  if (diffuse.a <= 0.5) discard;

  vec3 hemiLight1 = vec3(1.0, 1.0, 1.0);
  vec3 hemiLight2 = vec3(0.5, 0.1, 0.5);
  vec3 sunLightDir = normalize(vec3(0.1, 1.0, 0.0));
  vec3 lighting = saturate(dot(vNormal, sunLightDir)) * 0.25 + vColor * 1.0;
  vec4 outColor = vec4(diffuse.xyz * lighting, 0.75 * fade);

  vec3 noiseDir = abs(vNormal);
  vec2 noiseCoords = (
      noiseDir.x * vWorldPosition.yz +
      noiseDir.y * vWorldPosition.xz +
      noiseDir.z * vWorldPosition.xy);

  vec4 noisePixel = texture2D(noiseMap, noiseCoords / 64.0) * 0.2 + 0.8;
  outColor.xyz *= noisePixel.xyz;

  gl_FragColor = outColor;
  #include <colorspace_fragment>
}
`;
