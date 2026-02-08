import spriteTable from "./spriteTable";
import { Models } from "../../../../hooks/useModels";
import { Vector3 } from "three";
import { Blocks } from "../../../../types/blocks";
import { BlockState } from "../../../../types/block-state";
import { Blockstates } from "../../../../hooks/useBlockstates";
import { BlockBuilder } from "./blockBuilder";
import { ModelBuilder } from "./modelBuilder";
import { TextureInfo } from "../../../../hooks/useMinimizedAtlas";
import { ModelFaceBuilder } from "./modelFaceBuilder";

export const BlockNames: string[] = Object.keys(spriteTable).slice(2);

export const cleanStateValue = (value?: unknown) => {
  if (value == null) return value;

  const type = typeof value;
  if (type === "boolean") return value.toString();
  if (type === "string") return (value as string).toLowerCase();
  return value;
};

export type Cell = {
  position: [number, number, number];
  type: string;
  visible: boolean;
  state?: BlockState;
};

export const CreateTerrain = (
  dimensions: Vector3,
  fromX: number,
  fromY: number,
  fromZ: number,
  blocks: Blocks,
) => {
  const cells = new Map<string, Cell>();
  const xn = 0;
  const yn = 0;
  const zn = 0;
  const xp = dimensions.x;
  const yp = dimensions.y;
  const zp = dimensions.z;

  for (let x = xn; x < xp; x++) {
    for (let z = zn; z < zp; z++) {
      for (let y = yn; y < yp; y++) {
        const key = `${fromX + x},${fromY + y},${fromZ + z}`;
        const block = blocks[key];
        if (block) {
          cells.set(key, {
            position: [x, y, z],
            type: block.name,
            visible: false,
            state: block.state,
          });
        }
      }
    }
  }

  const setVisible = (x: number, y: number, z: number) => {
    const key = `${fromX + x},${fromY + y},${fromZ + z}`;
    const cell = cells.get(key);
    if (cell == null) return;

    cell.visible = true;
  };

  for (let x = xn; x < xp; x++) {
    for (let z = zn; z < zp; z++) {
      for (let y = yn; y < yp; y++) {
        const key = `${fromX + x},${fromY + y},${fromZ + z}`;
        const cell = cells.get(key);
        if (cell != null) {
          continue;
        }

        setVisible(x + 1, y, z);
        setVisible(x - 1, y, z);
        setVisible(x, y + 1, z);
        setVisible(x, y - 1, z);
        setVisible(x, y, z + 1);
        setVisible(x, y, z - 1);
      }
    }
  }

  return cells;
};

type CellMesh = {
  positions: Float32Array;
  uvs: Float32Array;
  uvSlices: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  locationIndices: Uint32Array;
  locations: Float32Array;
  cellToIndexMap: Map<string, number[]>;
};

const bytesInFloat32 = 4;
export const numbersToFloat32Array = (numbers: number[]) => {
  const float32Array = new Float32Array(
    new ArrayBuffer(bytesInFloat32 * numbers.length),
  );
  float32Array.set(numbers, 0);
  return float32Array;
};

const bytesInInt32 = 4;
export const numbersToUint32Array = (numbers: number[]) => {
  const uint32Array = new Uint32Array(
    new ArrayBuffer(bytesInInt32 * numbers.length),
  );
  uint32Array.set(numbers, 0);
  return uint32Array;
};

export const BuildMeshDataFromVoxels = (
  cells: Map<string, Cell>,
  blockstates: Blockstates,
  models: Models,
  textureInfoMap: Record<string, TextureInfo>,
): CellMesh => {
  const mesh: {
    positions: number[];
    uvs: number[];
    uvSlices: number[];
    normals: number[];
    colors: number[];
    indices: number[];
    locationIndices: number[];
    locations: number[];
  } = {
    positions: [],
    uvs: [],
    uvSlices: [],
    normals: [],
    colors: [],
    indices: [],
    locationIndices: [],
    locations: [],
  };

  const modelFaceBuilder = new ModelFaceBuilder(
    mesh.positions,
    mesh.uvs,
    mesh.normals,
    mesh.colors,
    mesh.indices,
    mesh.uvSlices,
    textureInfoMap,
  );
  const modelBuilder = new ModelBuilder(models, modelFaceBuilder);
  const blockBuilder = new BlockBuilder(blockstates, modelBuilder);

  const cellToIndexMap = new Map<string, number[]>();
  let locationIndex = 0;
  for (const [key, cell] of cells) {
    // if (!cell.visible) continue;

    const prevFaceCount = modelFaceBuilder.getFaceCount();
    mesh.locations.push(cell.position[0], cell.position[1], cell.position[2]);

    const prevPositionsLength = mesh.positions.length;
    blockBuilder.buildBlock(cell.type, cell.state);

    const newPositionsLength = mesh.positions.length;
    for (let i = prevPositionsLength; i < newPositionsLength; i += 3) {
      mesh.positions[i] += cell.position[0];
      mesh.positions[i + 1] += cell.position[1];
      mesh.positions[i + 2] += cell.position[2];
    }

    const newFaceCount = modelFaceBuilder.getFaceCount();
    const indexes: number[] = [];
    for (let i = prevFaceCount; i < newFaceCount; i++) {
      indexes.push(prevFaceCount + i);
      mesh.locationIndices.push(locationIndex, locationIndex);
    }
    locationIndex++;
    cellToIndexMap.set(key, indexes);
  }

  return {
    positions: numbersToFloat32Array(mesh.positions),
    uvs: numbersToFloat32Array(mesh.uvs),
    uvSlices: numbersToFloat32Array(mesh.uvSlices),
    normals: numbersToFloat32Array(mesh.normals),
    colors: numbersToFloat32Array(mesh.colors),
    indices: numbersToUint32Array(mesh.indices),
    locationIndices: numbersToUint32Array(mesh.locationIndices),
    locations: numbersToFloat32Array(mesh.locations),
    cellToIndexMap,
  };
};

export const Rebuild = (
  dimensions: Vector3,
  fromX: number,
  fromY: number,
  fromZ: number,
  blockstates: Blockstates,
  models: Models,
  textureInfoMap: Record<string, TextureInfo>,
  blocks: Blocks,
) => {
  const terrainVoxels = CreateTerrain(dimensions, fromX, fromY, fromZ, blocks);
  return BuildMeshDataFromVoxels(
    terrainVoxels,
    blockstates,
    models,
    textureInfoMap,
  );
};
