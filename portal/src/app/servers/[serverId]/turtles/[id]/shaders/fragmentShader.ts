export const fragmentShader = `
precision mediump float;
precision mediump sampler2DArray;

#define saturate(a) clamp( a, 0.0, 1.0 )

uniform float fade;
uniform sampler2DArray diffuseMap;

uniform vec3 selectionColor;
uniform float selectionStrength;

varying vec3 vUV;
varying vec3 vNormal;
varying vec3 vColor;
varying float vSelected;

void main() {
  vec4 diffuse = texture2D(diffuseMap, vUV);
  if (diffuse.a <= 0.5) discard;

  vec3 hemiLight1 = vec3(1.0, 1.0, 1.0);
  vec3 hemiLight2 = vec3(0.5, 0.1, 0.5);
  vec3 sunLightDir = normalize(vec3(-0.5, -1.0, 0.5));

  vec3 N = normalize(vNormal);

  float hemiFactor = N.y * 0.5 + 0.5;
  vec3 hemi = mix(hemiLight2, hemiLight1, hemiFactor);

  float ndl = saturate(dot(N, sunLightDir));
  vec3 lightRGB = hemi * 0.7 + vec3(1.0) * (0.6 * ndl) + vec3(0.10);

  vec3 albedo = diffuse.rgb * vColor;

  vec4 outColor = vec4(albedo * lightRGB, 0.75 * fade);

  float sel = saturate(vSelected);
  float amount = sel * selectionStrength;
  outColor.xyz = mix(outColor.xyz, selectionColor, amount);

  gl_FragColor = outColor;
  #include <colorspace_fragment>
}
`;
