"use client";

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  FrontSide,
  GLSL3,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { fragmentShader } from "./shaders/fragmentShader";
import { vertexShader } from "./shaders/vertexShader";
import { useBlocks } from "../../../../hooks/useBlocks";
import { WorldChunk } from "./world";
import { useParams } from "next/navigation";
import { Atlases } from "../../../../hooks/useAtlases";
import { Blockstates } from "../../../../hooks/useBlockstates";
import { Models } from "../../../../hooks/useModels";
import { Textures } from "../../../../hooks/useTextures";
import { Rebuild } from "./helpers";
import { useMinimizedAtlas } from "../../../../hooks/useMinimizedAtlas";
import { useThree } from "@react-three/fiber";

interface Props {
  dimensions: Vector3;
  chunk: WorldChunk;
  atlases: Atlases;
  blockstates: Blockstates;
  models: Models;
  textures: Textures;
}

export type SparseBlockHandle = {
  setBlockColor: (x: number, y: number, z: number, color: Color) => void;
  setChunkColor: (color: Color) => void;
};

const SparseBlock = forwardRef<SparseBlockHandle, Props>(function SparseBlock(
  { dimensions, chunk, blockstates, models, textures },
  ref,
) {
  const { x: chunkX, y: chunkY, z: chunkZ, offsetX, offsetY, offsetZ } = chunk;
  const { serverId } = useParams<{ serverId: string }>();
  const meshRef = useRef<Mesh>(null!);
  const fromX = chunkX * dimensions.x;
  const toX = fromX + dimensions.x - 1;
  const fromY = chunkY * dimensions.y;
  const toY = fromY + dimensions.y - 1;
  const fromZ = chunkZ * dimensions.z;
  const toZ = fromZ + dimensions.z - 1;
  const { data: blocks } = useBlocks(
    serverId,
    {
      fromX,
      toX,
      fromY,
      toY,
      fromZ,
      toZ,
      simple: true,
    },
    true,
  );
  const shaderMaterial = useMemo(
    () =>
      new ShaderMaterial({
        name: "shaderMaterial - materialOpqaque",
        // glslVersion: GLSL3,
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
      }),
    [],
  );

  const minimizedAtlas = useMinimizedAtlas(
    blockstates,
    textures,
    models,
    blocks,
  );
  useEffect(() => {
    if (!minimizedAtlas) return;
    shaderMaterial.uniforms.diffuseMap.value = minimizedAtlas.atlasTexture;
    shaderMaterial.uniformsNeedUpdate = true;
  }, [minimizedAtlas, shaderMaterial]);

  const cellToIndexMap = useRef<Map<string, number[]>>(null!);
  const geometry = useRef<BufferGeometry>(new BufferGeometry());
  useEffect(() => {
    if (blocks == null) return;
    if (minimizedAtlas == null) return;

    const build = Rebuild(
      dimensions,
      fromX,
      fromY,
      fromZ,
      blockstates,
      models,
      minimizedAtlas.textureInfoMap,
      blocks,
    );

    geometry.current.setAttribute(
      "position",
      new Float32BufferAttribute(build.positions, 3),
    );
    geometry.current.setAttribute(
      "normal",
      new Float32BufferAttribute(build.normals, 3),
    );
    geometry.current.setAttribute(
      "uv",
      new Float32BufferAttribute(build.uvs, 2),
    );
    geometry.current.setAttribute(
      "uvSlice",
      new Float32BufferAttribute(build.uvSlices, 1),
    );
    geometry.current.setAttribute(
      "color",
      new Float32BufferAttribute(build.colors, 3),
    );
    geometry.current.setAttribute(
      "locationIndex",
      new BufferAttribute(build.locationIndices, 1),
    );
    geometry.current.setAttribute(
      "location",
      new Float32BufferAttribute(build.locations, 3),
    );
    geometry.current.setIndex(new BufferAttribute(build.indices, 1));

    geometry.current.attributes.position.needsUpdate = true;
    geometry.current.attributes.normal.needsUpdate = true;
    geometry.current.attributes.color.needsUpdate = true;

    geometry.current.computeBoundingBox();
    geometry.current.computeBoundingSphere();

    cellToIndexMap.current = build.cellToIndexMap;
  }, [
    dimensions,
    fromX,
    fromY,
    fromZ,
    blockstates,
    models,
    minimizedAtlas?.textureInfoMap,
    blocks,
  ]);

  useImperativeHandle(ref, () => {
    return {
      setBlockColor(x: number, y: number, z: number, color: Color) {
        if (meshRef.current == null) return;

        const cell = cellToIndexMap.current?.get(`${x},${y},${z}`);
        if (cell == null) return;

        for (const cellIndex of cell) {
          for (let i = 0; i < 4; i++) {
            meshRef.current.geometry.attributes.color.array[
              12 * cellIndex + 3 * i
            ] = color.r;
            meshRef.current.geometry.attributes.color.array[
              12 * cellIndex + 3 * i + 1
            ] = color.g;
            meshRef.current.geometry.attributes.color.array[
              12 * cellIndex + 3 * i + 2
            ] = color.b;
          }
        }

        meshRef.current.geometry.attributes.color.needsUpdate = true;
      },
      setChunkColor(color: Color) {
        if (meshRef.current == null) return;

        for (
          let i = 0;
          i < meshRef.current.geometry.attributes.color.array.length;
          i++
        ) {
          const mod = i % 3;
          if (mod === 0) {
            meshRef.current.geometry.attributes.color.array[i] = color.r;
          } else if (mod === 1) {
            meshRef.current.geometry.attributes.color.array[i] = color.g;
          } else {
            meshRef.current.geometry.attributes.color.array[i] = color.b;
          }
        }

        meshRef.current.geometry.attributes.color.needsUpdate = true;
      },
    };
  }, []);

  return (
    <mesh
      key="main-mesh"
      ref={meshRef}
      args={[geometry.current, shaderMaterial]}
      position={[offsetX, offsetY, offsetZ]}
      userData={{
        isBlocks: false,
        isTurtle: false,
      }}
      receiveShadow
    />
  );
});

export default SparseBlock;
