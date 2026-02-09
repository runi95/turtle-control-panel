"use client";

import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  FrontSide,
  ShaderMaterial,
} from "three";
import { useEffect, useMemo, useRef } from "react";
import { fragmentShader } from "./shaders/fragmentShader";
import { vertexShader } from "./shaders/vertexShader";
import NameTag from "./nameTag";
import { ThreeElements } from "@react-three/fiber";
import { createMinimizedAtlas } from "../../../../hooks/useMinimizedAtlas";
import { Blockstates } from "../../../../hooks/useBlockstates";
import { Models } from "../../../../hooks/useModels";
import { Textures } from "../../../../hooks/useTextures";
import { BuildMeshDataFromVoxels, Cell } from "./helpers";

type Props = {
  name: string;
  blockstates: Blockstates;
  models: Models;
  textures: Textures;
};

const turtleBlockName = "computercraft:turtle_advanced";

function Turtle3D({
  name,
  blockstates,
  models,
  textures,
  ...meshProps
}: Props & ThreeElements["mesh"]) {
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

  const minimizedAtlas = useMemo(() => {
    return createMinimizedAtlas(
      blockstates,
      textures,
      models,
      new Set<string>([turtleBlockName]),
    );
  }, []);
  useEffect(() => {
    if (!minimizedAtlas) return;
    shaderMaterial.uniforms.diffuseMap.value = minimizedAtlas.atlasTexture;
  }, [minimizedAtlas, shaderMaterial]);

  const geometry = useRef<BufferGeometry>(new BufferGeometry());
  useEffect(() => {
    if (minimizedAtlas == null) return;

    const build = BuildMeshDataFromVoxels(
      new Map<string, Cell>([
        [
          `0,0,0`,
          {
            position: [0, 0, 0],
            type: turtleBlockName,
            visible: true,
          },
        ],
      ]),
      blockstates,
      models,
      minimizedAtlas.textureInfoMap,
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
  }, [blockstates, models, minimizedAtlas?.textureInfoMap]);

  return (
    <>
      <NameTag text={name} position={[0, 1, 0]} />
      <mesh
        {...meshProps}
        args={[geometry.current, shaderMaterial]}
        receiveShadow
        userData={{
          isBlocks: false,
          isTurtle: true,
          isSchema: false,
        }}
      />
    </>
  );
}

export default Turtle3D;
