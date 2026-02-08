"use client";

import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  FrontSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { fragmentShader } from "./shaders/fragmentShader";
import { vertexShader } from "./shaders/vertexShader";
import { Rebuild } from "./helpers";
import { Block } from "../../../../types/block";
import { Blockstates } from "../../../../hooks/useBlockstates";
import { Models } from "../../../../hooks/useModels";
import { Textures } from "../../../../hooks/useTextures";
import { useMinimizedAtlas } from "../../../../hooks/useMinimizedAtlas";
import { Blocks } from "../../../../types/blocks";

interface Props {
  geometries: PlaneGeometry[];
  blockstates: Blockstates;
  models: Models;
  textures: Textures;
}

export type BuildBlockHandle = {
  addBlocks: (blocksToAdd: Omit<Block, "tags">[]) => void;
  reset: () => void;
  getBuiltBlocks: () => Omit<Block, "tags">[];
};

const BuildBlock = forwardRef<BuildBlockHandle, Props>(function SparseBlock(
  { geometries, blockstates, models, textures },
  ref,
) {
  const meshRef = useRef<Mesh>(null!);
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

  const [blocks, setBlocks] = useState<Blocks | undefined>(undefined);
  const minimizedAtlas = useMinimizedAtlas(
    blockstates,
    textures,
    models,
    blocks,
  );
  useEffect(() => {
    if (minimizedAtlas == null) return;
    shaderMaterial.uniforms.diffuseMap.value = minimizedAtlas.atlasTexture;
  }, [minimizedAtlas]);
  const uniqueBlocks = useRef(new Map<string, boolean>());
  const geometry = useRef<BufferGeometry>(new BufferGeometry());

  useImperativeHandle(ref, () => {
    return {
      addBlocks: (blocksToAdd: Omit<Block, "tags">[]) => {
        if (minimizedAtlas == null) return;

        setBlocks((old) => {
          const newBlocks = {
            ...old,
          };
          for (const block of blocksToAdd) {
            const { x, y, z } = block;
            newBlocks[`${x},${y},${z}`] = block as Block;
          }

          return newBlocks;
        });

        const build = Rebuild(
          new Vector3(1, 1, 1),
          0,
          0,
          0,
          blockstates,
          models,
          minimizedAtlas.textureToIndexMap,
          blocks ?? {},
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
        meshRef.current.visible = true;
      },
      reset: () => {
        uniqueBlocks.current.clear();
        setBlocks(undefined);
        meshRef.current.visible = false;

        geometry.current.setAttribute(
          "position",
          new Float32BufferAttribute([], 3),
        );
        geometry.current.setAttribute(
          "normal",
          new Float32BufferAttribute([], 3),
        );
        geometry.current.setAttribute("uv", new Float32BufferAttribute([], 2));
        geometry.current.setAttribute(
          "uvSlice",
          new Float32BufferAttribute([], 1),
        );
        geometry.current.setAttribute(
          "color",
          new Float32BufferAttribute([], 3),
        );
        geometry.current.setAttribute(
          "locationIndex",
          new BufferAttribute(new Uint32Array(), 1),
        );
        geometry.current.setAttribute(
          "location",
          new Float32BufferAttribute([], 3),
        );
        geometry.current.setIndex(new BufferAttribute(new Uint32Array(), 1));

        geometry.current.attributes.position.needsUpdate = true;
        geometry.current.attributes.normal.needsUpdate = true;
        geometry.current.attributes.color.needsUpdate = true;

        geometry.current.computeBoundingBox();
        geometry.current.computeBoundingSphere();
      },
      getBuiltBlocks: () => {
        if (blocks == null) return [];
        return Object.values(blocks);
      },
    };
  }, []);

  return (
    <mesh
      ref={meshRef}
      args={[geometry.current, shaderMaterial]}
      receiveShadow
      userData={{
        isBlocks: true,
        isTurtle: false,
        isSchema: false,
      }}
    />
  );
});

export default BuildBlock;
