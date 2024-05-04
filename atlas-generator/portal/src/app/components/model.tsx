import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  PlaneGeometry,
} from "three";
import { useEffect, useMemo, useRef } from "react";
import { AtlasMap } from "./landing-page";
import { createShaderMaterial } from "../helpers/create-shader-material";
import { createMinimizedAtlas } from "../helpers/create-minimized-atlas";

interface CellMesh {
  positions: Float32Array;
  uvs: Float32Array;
  uvSlices: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

const BuildMeshDataFromVoxels = (
  geometries: PlaneGeometry[],
  modelName: string,
  atlasMap: AtlasMap,
  textureOverrides: {
    [key: number]: number;
  }
): CellMesh | null => {
  const mesh: {
    positions: number[];
    uvs: number[];
    uvSlices: number[];
    normals: number[];
    colors: number[];
    indices: number[];
  } = {
    positions: [],
    uvs: [],
    uvSlices: [],
    normals: [],
    colors: [],
    indices: [],
  };

  const color = new Color(0xffffff);
  color.convertSRGBToLinear();

  const unknown = atlasMap.textures["unknown"];
  const atlasMapTexture = atlasMap.textures[modelName];
  if (atlasMapTexture == null) {
    console.log(`${modelName} is broken!`);
  }
  const blockTextures = atlasMapTexture ?? unknown;

  const blockFaces = atlasMap.models[blockTextures.model];
  if (blockFaces == null) {
    console.log(`${modelName} is broken!`);
    return null;
  }

  for (let i = 0; i < blockFaces.length; i++) {
    const blockFace = blockFaces[i];
    const bi = mesh.positions.length / 3;
    mesh.positions.push(...blockFace.face);
    mesh.uvs.push(0, 0, 1, 0, 0, 1, 1, 1);

    // TODO: Fix this hack!
    const normalsArr =
      i < geometries.length
        ? geometries[i].attributes.normal.array
        : [1, 0, 6.12, 1, 0, 6.12, 1, 0, 6.12, 1, 0, 6.12];
    mesh.normals.push(...normalsArr);

    const blockTexture = (() => {
      const blockTexture = blockTextures[blockFace.texture];
      if (blockTexture == null) return 0;
      if (typeof blockTexture === "number") {
        return blockTexture;
      } else {
        return blockTexture[i];
      }
    })();

    for (let v = 0; v < 4; v++) {
      mesh.uvSlices.push(textureOverrides[blockTexture]);
      mesh.colors.push(color.r, color.g, color.b);
    }

    const localIndices = [0, 2, 1, 2, 3, 1];
    for (let j = 0; j < localIndices.length; j++) {
      localIndices[j] += bi;
    }
    mesh.indices.push(...localIndices);
  }

  const bytesInFloat32 = 4;
  const bytesInInt32 = 4;

  const positions = new Float32Array(
    new ArrayBuffer(bytesInFloat32 * mesh.positions.length)
  );
  const uvs = new Float32Array(
    new ArrayBuffer(bytesInFloat32 * mesh.uvs.length)
  );
  const uvSlices = new Float32Array(
    new ArrayBuffer(bytesInFloat32 * mesh.uvSlices.length)
  );
  const normals = new Float32Array(
    new ArrayBuffer(bytesInFloat32 * mesh.normals.length)
  );
  const colors = new Float32Array(
    new ArrayBuffer(bytesInFloat32 * mesh.colors.length)
  );
  const indices = new Uint32Array(
    new ArrayBuffer(bytesInInt32 * mesh.indices.length)
  );

  positions.set(mesh.positions, 0);
  normals.set(mesh.normals, 0);
  uvs.set(mesh.uvs, 0);
  uvSlices.set(mesh.uvSlices, 0);
  colors.set(mesh.colors, 0);
  indices.set(mesh.indices, 0);

  return {
    positions,
    uvs,
    uvSlices,
    normals,
    colors,
    indices,
  };
};

const Rebuild = (
  geometries: PlaneGeometry[],
  modelName: string,
  atlasMap: AtlasMap,
  textureOverrides: {
    [key: number]: number;
  }
) => {
  return BuildMeshDataFromVoxels(
    geometries,
    modelName,
    atlasMap,
    textureOverrides
  );
};

interface Props {
  geometries: PlaneGeometry[];
  atlas: ArrayBuffer | null;
  atlasMap: AtlasMap | null;
  modelName: string | null;
}

const Model = (props: Props) => {
  const { geometries, modelName, atlasMap, atlas } = props;
  const meshRef = useRef<Mesh>(null!);
  const shaderMaterial = useMemo(() => createShaderMaterial(), []);
  const minimizedAtlas = useMemo(() => {
    if (atlas == null) return null;
    if (modelName == null) return null;
    if (atlasMap == null) return null;

    return createMinimizedAtlas(atlasMap, atlas, modelName);
  }, [atlas, atlasMap, modelName]);

  useEffect(() => {
    if (minimizedAtlas == null) return;
    shaderMaterial.uniforms.diffuseMap.value = minimizedAtlas.atlasTexture;
  }, [shaderMaterial, minimizedAtlas]);

  const geometry = useRef<BufferGeometry>(new BufferGeometry());
  useEffect(() => {
    if (modelName == null) return;
    if (minimizedAtlas == null) return;
    if (atlasMap == null) return;

    const build = Rebuild(
      geometries,
      modelName,
      atlasMap,
      minimizedAtlas.atlasTextureMap
    );
    if (build == null) return;

    geometry.current.setAttribute(
      "position",
      new Float32BufferAttribute(build.positions, 3)
    );
    geometry.current.setAttribute(
      "normal",
      new Float32BufferAttribute(build.normals, 3)
    );
    geometry.current.setAttribute(
      "uv",
      new Float32BufferAttribute(build.uvs, 2)
    );
    geometry.current.setAttribute(
      "uvSlice",
      new Float32BufferAttribute(build.uvSlices, 1)
    );
    geometry.current.setAttribute(
      "color",
      new Float32BufferAttribute(build.colors, 3)
    );
    geometry.current.setIndex(new BufferAttribute(build.indices, 1));

    geometry.current.attributes.position.needsUpdate = true;
    geometry.current.attributes.normal.needsUpdate = true;
    geometry.current.attributes.color.needsUpdate = true;

    geometry.current.computeBoundingBox();
    geometry.current.computeBoundingSphere();
  }, [modelName, geometries, atlasMap, minimizedAtlas]);

  return (
    <mesh
      ref={meshRef}
      args={[geometry.current, shaderMaterial]}
      receiveShadow
    />
  );
};

export default Model;
