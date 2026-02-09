"use client";

import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  FrontSide,
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
  useState,
} from "react";
import { fragmentShader } from "./shaders/fragmentShader";
import { vertexShader } from "./shaders/vertexShader";
import { Blockstates } from "../../../../hooks/useBlockstates";
import { Models } from "../../../../hooks/useModels";
import { Textures } from "../../../../hooks/useTextures";
import { useMinimizedAtlas } from "../../../../hooks/useMinimizedAtlas";
import { Blocks } from "../../../../types/blocks";
import { BuildMeshDataFromVoxels, Cell } from "./helpers";

export const blockNameOverride = (blockName: string) => {
  switch (blockName) {
    case "minecraft:wheat":
      return "minecraft:wheat_stage7";
    case "minecraft:cocoa":
      return "minecraft:cocoa_stage2";
    case "minecraft:beetroots":
      return "minecraft:beetroots_stage3";
    case "minecraft:carrots":
      return "minecraft:carrots_stage3";
    case "minecraft:melon_stem":
      return "minecraft:melon_stem_stage6";
    case "minecraft:pumpkin_stem":
      return "minecraft:pumpkin_stem_stage6";
    case "minecraft:nether_wart":
      return "minecraft:nether_wart_stage2";
    case "minecraft:potatoes":
      return "minecraft:potatoes_stage3";
    case "minecraft:sweet_berry_bush":
      return "minecraft:sweet_berry_bush_stage3";
    case "minecraft:torchflower_crop":
      return "minecraft:torchflower_crop_stage1";
    case "minecraft:bamboo":
      return "minecraft:bamboo4_age1";
    case "minecraft:snow":
      return "minecraft:snow_height2";
    case "minecraft:tall_grass":
      return "minecraft:tall_grass_bottom";
    case "minecraft:tall_seagrass":
      return "minecraft:tall_seagrass_bottom";
    case "computercraft:wireless_modem_normal":
      return "computercraft:wireless_modem_normal_on";
    case "computercraft:wired_modem":
      return "computercraft:wired_modem_on";
    case "computercraft:computer_normal":
      return "computercraft:computer_normal_on";
    case "computercraft:disk_drive":
      return "computercraft:disk_drive_full";
    case "computercraft:printer":
      return "computercraft:printer_both_full";
    case "computercraft:wired_modem_full":
      return "computercraft:wired_modem_full_off";
    default:
      return blockName;
  }
};

interface Props {
  blockstates: Blockstates;
  models: Models;
  textures: Textures;
}

export type SchemaPlacerHandle = {
  setSchema: (schema: Blocks) => void;
  setMeshPosition: (x: number, y: number, z: number) => void;
  setVisible: (isVisible: boolean) => void;
  isVisible: () => boolean;
  getMeshPosition: () => Vector3;
  reset: () => void;
  getSchema: () => Blocks | undefined;
};

const SchemaPlacer = forwardRef<SchemaPlacerHandle, Props>(
  function SchemaPlacer({ blockstates, models, textures }, ref) {
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
    const [schema, setSchema] = useState<Blocks | undefined>(undefined);
    const minimizedAtlas = useMinimizedAtlas(
      blockstates,
      textures,
      models,
      schema,
    );
    useEffect(() => {
      if (!minimizedAtlas) return;
      shaderMaterial.uniforms.diffuseMap.value = minimizedAtlas.atlasTexture;
    }, [minimizedAtlas, shaderMaterial]);

    const geometry = useRef<BufferGeometry>(new BufferGeometry());
    useEffect(() => {
      if (schema == null) return;
      if (minimizedAtlas == null) return;

      const cells = new Map<string, Cell>();
      for (const key of Object.keys(schema)) {
        const value = schema[key];
        cells.set(key, {
          position: [value.x, value.y, value.z],
          type: value.name,
          visible: true,
          state: value.state,
        });
      }

      const build = BuildMeshDataFromVoxels(
        cells,
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
    }, [blockstates, models, minimizedAtlas?.textureInfoMap, schema]);

    useImperativeHandle(ref, () => {
      return {
        setSchema: (schema: Blocks) => {
          setSchema(schema);
        },
        getSchema: () => {
          return schema;
        },
        setMeshPosition: (x: number, y: number, z: number) => {
          meshRef.current.position.set(x, y, z);
        },
        getMeshPosition: () => {
          return meshRef.current.position;
        },
        setVisible: (isVisible: boolean) => {
          meshRef.current.visible = isVisible;
        },
        isVisible: () => {
          return meshRef.current.visible;
        },
        reset: () => {
          setSchema(undefined);
          meshRef.current.visible = false;
        },
      };
    }, [schema, setSchema]);

    return (
      <mesh
        ref={meshRef}
        args={[geometry.current, shaderMaterial]}
        receiveShadow
        userData={{
          isBlocks: false,
          isTurtle: false,
          isSchema: true,
        }}
      />
    );
  },
);

export default SchemaPlacer;
