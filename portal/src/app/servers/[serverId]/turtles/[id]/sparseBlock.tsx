"use client";

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  FrontSide,
  ShaderMaterial,
  Vector3,
} from "three";
import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { fragmentShader } from "./shaders/fragmentShader";
import { vertexShader } from "./shaders/vertexShader";
import { useBlocks } from "../../../../hooks/useBlocks";
import { WorldChunk } from "./world";
import { useParams } from "next/navigation";
import { Blockstates } from "../../../../hooks/useBlockstates";
import { Models } from "../../../../hooks/useModels";
import { Textures } from "../../../../hooks/useTextures";
import { Rebuild } from "./helpers";
import { useMinimizedAtlas } from "../../../../hooks/useMinimizedAtlas";

interface Props {
  dimensions: Vector3;
  chunk: WorldChunk;
  blockstates: Blockstates;
  models: Models;
  textures: Textures;
}

export type SparseBlockHandle = {
  setBlockSelected: (
    x: number,
    y: number,
    z: number,
    isSelected: boolean,
  ) => void;
  setChunkSelected: (isSelected: boolean) => void;
};

const SparseBlock = forwardRef<SparseBlockHandle, Props>(function SparseBlock(
  { dimensions, chunk, blockstates, models, textures },
  ref,
) {
  const { x: chunkX, y: chunkY, z: chunkZ, offsetX, offsetY, offsetZ } = chunk;
  const { serverId } = useParams<{ serverId: string }>();
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
          selectionColor: { value: new Color("#4287f5").convertSRGBToLinear() },
          selectionStrength: { value: 0.5 },
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
  }, [minimizedAtlas, shaderMaterial]);

  const { geometry, cellToIndexMap } = useMemo(() => {
    if (blocks == null) return {};
    if (minimizedAtlas == null) return {};

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

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(build.positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new Float32BufferAttribute(build.normals, 3),
    );
    geometry.setAttribute("uv", new Float32BufferAttribute(build.uvs, 2));
    geometry.setAttribute(
      "uvSlice",
      new Float32BufferAttribute(build.uvSlices, 1),
    );
    geometry.setAttribute("color", new Float32BufferAttribute(build.colors, 3));
    geometry.setAttribute(
      "locationIndex",
      new BufferAttribute(build.locationIndices, 1),
    );
    geometry.setAttribute(
      "selected",
      new Float32BufferAttribute(
        new Float32Array(geometry.attributes.position.count),
        1,
      ),
    );
    geometry.setIndex(new BufferAttribute(build.indices, 1));

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return { geometry, cellToIndexMap: build.cellToIndexMap };
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
      setBlockSelected(x: number, y: number, z: number, isSelected: boolean) {
        if (!geometry) return;
        const cell = cellToIndexMap?.get(`${x},${y},${z}`);
        if (!cell) return;

        const sel = geometry.attributes.selected.array as Float32Array;
        const v = isSelected ? 1 : 0;

        for (const cellIndex of cell) {
          const base = 4 * cellIndex; // 4 vertices per quad
          sel[base + 0] = v;
          sel[base + 1] = v;
          sel[base + 2] = v;
          sel[base + 3] = v;
        }

        geometry.attributes.selected.needsUpdate = true;
      },
      setChunkSelected(isSelected: boolean) {
        if (geometry == null) return;

        const v = isSelected ? 1 : 0;
        for (let i = 0; i < geometry.attributes.selected.array.length; i++) {
          geometry.attributes.selected.array[i] = v;
        }

        geometry.attributes.selected.needsUpdate = true;
      },
    };
  }, [geometry, cellToIndexMap]);

  if (geometry == null) return null;

  return (
    <mesh
      key="main-mesh"
      geometry={geometry}
      material={shaderMaterial}
      position={[offsetX, offsetY, offsetZ]}
      dispose={null}
      userData={{
        isBlocks: false,
        isTurtle: false,
        isChunkMesh: true,
        chunkX,
        chunkY,
        chunkZ,
        offsetX,
        offsetY,
        offsetZ,
      }}
      receiveShadow
    />
  );
});

export default SparseBlock;
