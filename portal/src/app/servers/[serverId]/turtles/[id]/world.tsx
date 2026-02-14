"use client";

import {
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  Color,
  InstancedMesh,
  Matrix4,
  TextureLoader,
  Vector3,
  Group,
  Mesh,
} from "three";
import SparseBlock, { SparseBlockHandle } from "./sparseBlock";
import { Direction, useTurtle } from "../../../../hooks/useTurtle";
import { useLoader } from "@react-three/fiber";
import Turtle3D from "./turtle3D";
import OtherTurtles from "./otherTurtles";
import HomeMarker from "./homeMarker";
import BuildBlock, { BuildBlockHandle } from "./buildBlock";
import SchemaPlacer, { SchemaPlacerHandle } from "./schemaPlacer";
import { Location } from "../../../../types/location";
import { useParams } from "next/navigation";
import { Block } from "../../../../types/block";
import { useWebSocket } from "../../../../contexts/webSocketContext";
import { useAtlases } from "../../../../hooks/useAtlases";
import { useModels } from "../../../../hooks/useModels";
import { useBlockstates } from "../../../../hooks/useBlockstates";
import { useTextures } from "../../../../hooks/useTextures";
import { Blocks } from "../../../../types/blocks";

export enum WorldState {
  MOVE,
  BUILD,
  SELECT_SINGLE,
  SELECT_CHUNK,
  SELECT_CHUNK_FULL,
}

const mathematicalModulo = (a: number, b: number) => {
  const quotient = Math.floor(a / b);
  return a - quotient * b;
};

export interface WorldChunk {
  x: number;
  y: number;
  z: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}

interface Props {
  chunkSize: number;
  visibleChunkRadius: number;
}

export type WorldHandle = {
  setState: (state: WorldState | null) => void;
  setBlocksToPlace: (blocks: Omit<Block, "tags">[]) => void;
  getSelectedBlocks: () => Location[];
  getBuiltBlocks: () => Omit<Block, "tags">[];
  setBuildBlockType: (type: string) => void;
};

const World = forwardRef<WorldHandle, Props>(function World(props: Props, ref) {
  const { chunkSize, visibleChunkRadius } = props;
  const { serverId, id } = useParams() as { serverId: string; id: string };
  const { data: turtle } = useTurtle(serverId, id);
  const { action } = useWebSocket();
  const groupRef = useRef<Group>(null!);
  const worldStateRef = useRef<WorldState | null>(null);
  const indicatorMeshRef = useRef<InstancedMesh>(null!);
  const indicatorMeshVisibleRef = useRef<boolean>(false);
  const chunkRefs = useRef<SparseBlockHandle[]>([]);
  const buildBlockRef = useRef<BuildBlockHandle>(null!);
  const schemaPlacerRef = useRef<SchemaPlacerHandle>(null!);
  const buildBlockTypeRef = useRef<string>("minecraft:cobblestone");
  const selectedBlocks = useRef(new Map<string, Location>());
  const outlineMap = useLoader(TextureLoader, "/outline.png");
  const moveTurtleColorArray = useRef<Float32Array>(
    Float32Array.from([...new Color("#444").toArray(), 0.5]),
  );
  const previousFaceIndex = useRef<number | null>(null);
  const turtleRotationRef = useRef<Direction | null>(null);
  const tempMatrix = useMemo(() => new Matrix4(), []);
  const tempColor = useMemo(() => new Color(), []);
  const tempVector = useMemo(() => new Vector3(), []);
  const cellDimensions = useMemo(
    () => new Vector3(chunkSize, chunkSize, chunkSize),
    [chunkSize],
  );
  const visibleDimensions = [visibleChunkRadius, visibleChunkRadius];

  useImperativeHandle(ref, () => {
    return {
      setState(state: WorldState | null) {
        if (indicatorMeshRef.current == null) return;

        worldStateRef.current = state;
        switch (state) {
          case WorldState.MOVE:
            tempColor.set("#444").toArray(moveTurtleColorArray.current, 0);
            moveTurtleColorArray.current[3] = 0.5;
            indicatorMeshRef.current.geometry.attributes.color.needsUpdate = true;
            break;
          case WorldState.BUILD:
          case WorldState.SELECT_SINGLE:
          case WorldState.SELECT_CHUNK:
          case WorldState.SELECT_CHUNK_FULL:
            tempColor.set("#4287f5").toArray(moveTurtleColorArray.current, 0);
            moveTurtleColorArray.current[3] = 0.5;
            indicatorMeshRef.current.geometry.attributes.color.needsUpdate = true;
            break;
          case null:
            buildBlockRef.current?.reset();
            previousFaceIndex.current = null;
            indicatorMeshRef.current.visible = false;
            indicatorMeshVisibleRef.current = false;
            if (selectedBlocks.current.size > 0) {
              const locations = Array.from(selectedBlocks.current.values());
              for (const location of locations) {
                const { x, y, z } = location;
                const chunkX = Math.floor(x / cellDimensions.x);
                const chunkY = Math.floor(y / cellDimensions.y);
                const chunkZ = Math.floor(z / cellDimensions.z);
                const chunkIndex = chunks.findIndex(
                  (chunk) =>
                    chunk.x === chunkX &&
                    chunk.y === chunkY &&
                    chunk.z === chunkZ,
                );
                if (chunkIndex === -1) continue;
                chunkRefs.current[chunkIndex].setBlockSelected(x, y, z, false);
              }
            }

            selectedBlocks.current.clear();

            if (schemaPlacerRef.current.getSchema() != null) {
              schemaPlacerRef.current.reset();
            }
            break;
        }
      },
      setBlocksToPlace(blocks: Omit<Block, "tags">[]) {
        const blocksMap: Blocks = {};
        for (const block of blocks) {
          const { x, y, z } = block;
          blocksMap[`${x},${y},${z}`] = block as Block;
        }

        schemaPlacerRef.current.setSchema(blocksMap);
        indicatorMeshRef.current.visible = false;
        indicatorMeshVisibleRef.current = false;
      },
      getSelectedBlocks() {
        return Array.from(selectedBlocks.current.values());
      },
      getBuiltBlocks() {
        return buildBlockRef.current.getBuiltBlocks();
      },
      setBuildBlockType(type: string) {
        buildBlockTypeRef.current = type;
      },
    };
  }, []);

  const { data: atlases } = useAtlases();
  const { data: blockstates } = useBlockstates();
  const { data: models } = useModels();
  const { data: textures } = useTextures();

  const location = turtle?.location ?? null;
  const chunks = useMemo(() => {
    if (location == null) return [];

    const { x, y, z } = location;
    const chunkX = Math.floor(x / cellDimensions.x);
    const chunkY = Math.floor(y / cellDimensions.y);
    const chunkZ = Math.floor(z / cellDimensions.z);
    const chunks: WorldChunk[] = [];

    const xs = visibleDimensions[0];
    const ys = 1;
    const zs = visibleDimensions[1];

    for (let x = -xs; x <= xs; x++) {
      for (let z = -zs; z <= zs; z++) {
        for (let y = -ys; y <= ys; y++) {
          chunks.push({
            x: chunkX + x,
            y: chunkY + y,
            z: chunkZ + z,
            offsetX: x * cellDimensions.x,
            offsetY: y * cellDimensions.y,
            offsetZ: z * cellDimensions.z,
          });
        }
      }
    }

    return chunks;
  }, [location, cellDimensions, visibleDimensions]);

  useEffect(() => {
    turtleRotationRef.current = turtle?.direction ?? null;
  }, [turtle?.direction]);

  if (atlases == null) return null;
  if (blockstates == null) return null;
  if (models == null) return null;
  if (textures == null) return null;
  if (turtle == null) return null;

  const turtleRotation = (() => {
    switch (turtle.direction) {
      case Direction.North:
        return Math.PI * 0.5;
      case Direction.East:
        return 0;
      case Direction.South:
        return 1.5 * Math.PI;
      case Direction.West:
        return Math.PI;
    }
  })();

  const { home } = turtle;
  return (
    <>
      {location != null && home != null ? (
        <Suspense fallback={null}>
          <HomeMarker
            position={[
              home.x - location.x,
              home.y - location.y + 0.2,
              home.z - location.z,
            ]}
          />
        </Suspense>
      ) : null}
      <OtherTurtles
        blockstates={blockstates}
        models={models}
        textures={textures}
      />
      <instancedMesh
        ref={indicatorMeshRef}
        args={[undefined, undefined, 1]}
        visible={indicatorMeshVisibleRef.current}
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1.05, 1.05, 1.05]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[moveTurtleColorArray.current, 4]}
          />
        </boxGeometry>
        <meshBasicMaterial
          attach="material"
          vertexColors
          transparent
          alphaTest={0.1}
          map={outlineMap}
        />
      </instancedMesh>
      {turtle.location != null ? (
        <group
          ref={groupRef}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (worldStateRef.current == null) return;
            if (!(e.intersections.length > 0)) return;

            const intersection = e.intersections.find(
              (intersection) =>
                intersection.object?.userData?.isSchema !== true,
            );
            if (intersection?.faceIndex == null) return;
            const schema = schemaPlacerRef.current.getSchema();
            if (previousFaceIndex.current === null) {
              if (schema != null) {
                schemaPlacerRef.current.setVisible(true);
              } else {
                indicatorMeshRef.current.visible = true;
                indicatorMeshVisibleRef.current = true;
              }
            }

            previousFaceIndex.current = intersection.faceIndex ?? null;

            const intersectionObject = intersection.object as Mesh;
            if (intersectionObject == null) return;

            const geom = intersectionObject.geometry;
            const idxAttr = geom.index;
            if (idxAttr == null || idxAttr.array == null) return;

            const idxArray = idxAttr.array as ArrayLike<number>;
            const tri = intersection.faceIndex;
            const a = idxArray[tri * 3];

            const locAttr = geom.attributes?.locationIndex;
            if (locAttr == null || locAttr.array == null) return;

            const locArray = locAttr.array as ArrayLike<number>;
            const locationIndex = locArray[a];
            if (locationIndex == null) return;

            let x = locationIndex % 16;
            let y = Math.floor(locationIndex / 16) % 16;
            let z = Math.floor(locationIndex / 256);

            switch (worldStateRef.current) {
              case WorldState.MOVE:
              case WorldState.BUILD:
                (() => {
                  if (intersection.face == null) return;
                  const absX = Math.abs(intersection.face.normal.x);
                  const absY = Math.abs(intersection.face.normal.y);
                  const absZ = Math.abs(intersection.face.normal.z);

                  if (intersectionObject.userData?.isTurtle === true) {
                    if (absX > absZ && absX > absZ) {
                      if (intersection.face.normal.x > 0) {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            z++;
                            break;
                          case Direction.South:
                            x--;
                            break;
                          case Direction.West:
                            z--;
                            break;
                          default:
                            x++;
                            break;
                        }
                      } else {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            z--;
                            break;
                          case Direction.South:
                            x++;
                            break;
                          case Direction.West:
                            z++;
                            break;
                          default:
                            x--;
                            break;
                        }
                      }
                    } else if (absZ > absX && absZ > absY) {
                      if (intersection.face.normal.z > 0) {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            x--;
                            break;
                          case Direction.South:
                            z--;
                            break;
                          case Direction.West:
                            x++;
                            break;
                          default:
                            z++;
                            break;
                        }
                      } else {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            x++;
                            break;
                          case Direction.South:
                            z++;
                            break;
                          case Direction.West:
                            x--;
                            break;
                          default:
                            z--;
                            break;
                        }
                      }
                    } else {
                      if (intersection.face.normal.y > 0) {
                        y++;
                      } else {
                        y--;
                      }
                    }
                  } else {
                    if (absX > absZ && absX > absZ) {
                      if (intersection.face.normal.x > 0) {
                        x++;
                      } else {
                        x--;
                      }
                    } else if (absZ > absX && absZ > absY) {
                      if (intersection.face.normal.z > 0) {
                        z++;
                      } else {
                        z--;
                      }
                    } else {
                      if (intersection.face.normal.y > 0) {
                        y++;
                      } else {
                        y--;
                      }
                    }
                  }
                })();
                break;
            }

            if (
              intersectionObject.userData?.isBlocks !== true &&
              intersectionObject.userData?.isTurtle !== true
            ) {
              x +=
                intersectionObject.position.x -
                mathematicalModulo(turtle.location.x, cellDimensions.x);
              y +=
                intersectionObject.position.y -
                mathematicalModulo(turtle.location.y, cellDimensions.y);
              z +=
                intersectionObject.position.z -
                mathematicalModulo(turtle.location.z, cellDimensions.z);
            }

            if (schema != null) {
              schemaPlacerRef.current.setMeshPosition(x, y, z);
            } else {
              tempMatrix.setPosition(tempVector.set(x, y, z));
              indicatorMeshRef.current.setMatrixAt(0, tempMatrix);
              indicatorMeshRef.current.instanceMatrix.needsUpdate = true;
            }
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            previousFaceIndex.current = null;
            schemaPlacerRef.current.setVisible(false);
            indicatorMeshRef.current.visible = false;
            indicatorMeshVisibleRef.current = false;
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (worldStateRef.current == null) return;
            if (!(e.intersections.length > 0)) return;
            if (!turtle) return;

            const intersection = e.intersections.find(
              (intersection) =>
                intersection.object?.userData?.isSchema !== true,
            );
            if (intersection?.faceIndex == null) return;

            const intersectionObject = intersection.object as Mesh;
            if (intersectionObject == null) return;

            const geom = intersectionObject.geometry;
            const idxAttr = geom.index;
            if (idxAttr == null || idxAttr.array == null) return;

            const idxArray = idxAttr.array as ArrayLike<number>;
            const tri = intersection.faceIndex;
            const a = idxArray[tri * 3];

            const locAttr = geom.attributes?.locationIndex;
            if (locAttr == null || locAttr.array == null) return;

            const locArray = locAttr.array as ArrayLike<number>;
            const locationIndex = locArray[a];
            if (locationIndex == null) return;

            let x = locationIndex % 16;
            let y = Math.floor(locationIndex / 16) % 16;
            let z = Math.floor(locationIndex / 256);

            switch (worldStateRef.current) {
              case WorldState.MOVE:
              case WorldState.BUILD:
                (() => {
                  if (intersection.face == null) return;
                  const absX = Math.abs(intersection.face.normal.x);
                  const absY = Math.abs(intersection.face.normal.y);
                  const absZ = Math.abs(intersection.face.normal.z);

                  if (intersectionObject.userData?.isTurtle === true) {
                    if (absX > absZ && absX > absZ) {
                      if (intersection.face.normal.x > 0) {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            z++;
                            break;
                          case Direction.South:
                            x--;
                            break;
                          case Direction.West:
                            z--;
                            break;
                          default:
                            x++;
                            break;
                        }
                      } else {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            z--;
                            break;
                          case Direction.South:
                            x++;
                            break;
                          case Direction.West:
                            z++;
                            break;
                          default:
                            x--;
                            break;
                        }
                      }
                    } else if (absZ > absX && absZ > absY) {
                      if (intersection.face.normal.z > 0) {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            x--;
                            break;
                          case Direction.South:
                            z--;
                            break;
                          case Direction.West:
                            x++;
                            break;
                          default:
                            z++;
                            break;
                        }
                      } else {
                        switch (turtleRotationRef.current) {
                          case Direction.East:
                            x++;
                            break;
                          case Direction.South:
                            z++;
                            break;
                          case Direction.West:
                            x--;
                            break;
                          default:
                            z--;
                            break;
                        }
                      }
                    } else {
                      if (intersection.face.normal.y > 0) {
                        y++;
                      } else {
                        y--;
                      }
                    }
                  } else {
                    if (absX > absZ && absX > absZ) {
                      if (intersection.face.normal.x > 0) {
                        x++;
                      } else {
                        x--;
                      }
                    } else if (absZ > absX && absZ > absY) {
                      if (intersection.face.normal.z > 0) {
                        z++;
                      } else {
                        z--;
                      }
                    } else {
                      if (intersection.face.normal.y > 0) {
                        y++;
                      } else {
                        y--;
                      }
                    }
                  }
                })();
                break;
            }

            if (
              intersectionObject.userData?.isBlocks !== true &&
              intersectionObject.userData?.isTurtle !== true
            ) {
              x +=
                intersectionObject.position.x -
                mathematicalModulo(turtle.location.x, cellDimensions.x);
              y +=
                intersectionObject.position.y -
                mathematicalModulo(turtle.location.y, cellDimensions.y);
              z +=
                intersectionObject.position.z -
                mathematicalModulo(turtle.location.z, cellDimensions.z);
            }

            const { x: tx, y: ty, z: tz } = turtle.location;
            switch (worldStateRef.current) {
              case WorldState.MOVE:
                action({
                  type: "ACTION",
                  action: "move",
                  data: {
                    serverId: turtle.serverId,
                    id: turtle.id,
                    x: x + tx,
                    y: y + ty,
                    z: z + tz,
                  },
                });
                break;
              case WorldState.BUILD:
                (() => {
                  const schema = schemaPlacerRef.current.getSchema();
                  if (schema != null) {
                    const addedBlocks: Omit<Block, "tags">[] = [];
                    const meshPosition =
                      schemaPlacerRef.current.getMeshPosition();
                    for (const block of Object.values(schema)) {
                      const { x, y, z, name, state } = block;
                      addedBlocks.push({
                        x: x + meshPosition.x,
                        y: y + meshPosition.y,
                        z: z + meshPosition.z,
                        name,
                        state,
                      });
                    }

                    buildBlockRef.current.addBlocks(addedBlocks);
                    schemaPlacerRef.current.reset();
                  } else {
                    buildBlockRef.current.addBlocks([
                      {
                        x,
                        y,
                        z,
                        name: buildBlockTypeRef.current,
                        state: {},
                      },
                    ]);
                  }
                })();
                break;
              case WorldState.SELECT_SINGLE:
                (() => {
                  const chunkX = Math.floor((x + tx) / cellDimensions.x);
                  const chunkY = Math.floor((y + ty) / cellDimensions.y);
                  const chunkZ = Math.floor((z + tz) / cellDimensions.z);
                  const chunkIndex = chunks.findIndex(
                    (chunk) =>
                      chunk.x === chunkX &&
                      chunk.y === chunkY &&
                      chunk.z === chunkZ,
                  );
                  if (chunkIndex === -1) return;

                  const kx = x + tx;
                  const ky = y + ty;
                  const kz = z + tz;
                  const key = `${kx},${ky},${kz}`;
                  const selectedBlock = selectedBlocks.current.get(key);
                  if (selectedBlock == null) {
                    selectedBlocks.current.set(key, {
                      x: kx,
                      y: ky,
                      z: kz,
                    });
                    chunkRefs.current[chunkIndex].setBlockSelected(
                      kx,
                      ky,
                      kz,
                      true,
                    );
                  } else {
                    selectedBlocks.current.delete(key);
                    chunkRefs.current[chunkIndex].setBlockSelected(
                      kx,
                      ky,
                      kz,
                      false,
                    );
                  }
                })();
                break;
              case WorldState.SELECT_CHUNK:
                (() => {
                  const chunkX = Math.floor((x + tx) / cellDimensions.x);
                  const chunkY = Math.floor((y + ty) / cellDimensions.y);
                  const chunkZ = Math.floor((z + tz) / cellDimensions.z);
                  const chunkIndex = chunks.findIndex(
                    (chunk) =>
                      chunk.x === chunkX &&
                      chunk.y === chunkY &&
                      chunk.z === chunkZ,
                  );
                  if (chunkIndex === -1) return;

                  const kx = x + tx;
                  const ky = y + ty;
                  const kz = z + tz;
                  const key = `${kx},${ky},${kz}`;
                  const selectedBlock = selectedBlocks.current.get(key);
                  if (selectedBlock == null) {
                    const chunk = chunks[chunkIndex];
                    for (let x = 0; x < cellDimensions.x; x++) {
                      for (let y = 0; y < cellDimensions.y; y++) {
                        for (let z = 0; z < cellDimensions.z; z++) {
                          const nx = chunk.x * cellDimensions.x + x;
                          const ny = chunk.y * cellDimensions.y + y;
                          const nz = chunk.z * cellDimensions.z + z;
                          selectedBlocks.current.set(`${nx},${ny},${nz}`, {
                            x: nx,
                            y: ny,
                            z: nz,
                          });
                        }
                      }
                    }
                    chunkRefs.current[chunkIndex].setChunkSelected(true);
                  } else {
                    const chunk = chunks[chunkIndex];
                    for (let x = 0; x < cellDimensions.x; x++) {
                      for (let y = 0; y < cellDimensions.y; y++) {
                        for (let z = 0; z < cellDimensions.z; z++) {
                          const nx = chunk.x * cellDimensions.x + x;
                          const ny = chunk.y * cellDimensions.y + y;
                          const nz = chunk.z * cellDimensions.z + z;
                          selectedBlocks.current.delete(`${nx},${ny},${nz}`);
                        }
                      }
                    }
                    chunkRefs.current[chunkIndex].setChunkSelected(false);
                  }
                })();
                break;
              case WorldState.SELECT_CHUNK_FULL:
                (() => {
                  const chunkX = Math.floor((x + tx) / cellDimensions.x);
                  const chunkZ = Math.floor((z + tz) / cellDimensions.z);
                  const filteredChunks = chunks
                    .map((chunk, i) => ({ chunk, i }))
                    .filter(
                      ({ chunk }) => chunk.x === chunkX && chunk.z === chunkZ,
                    );
                  if (filteredChunks == null || filteredChunks.length === 0)
                    return;

                  const kx = x + tx;
                  const ky = y + ty;
                  const kz = z + tz;
                  const key = `${kx},${ky},${kz}`;
                  const selectedBlock = selectedBlocks.current.get(key);
                  if (selectedBlock == null) {
                    selectedBlocks.current.set(key, {
                      x: kx,
                      y: ky,
                      z: kz,
                    });

                    filteredChunks.forEach(({ chunk, i: chunkIndex }) => {
                      for (let x = 0; x < cellDimensions.x; x++) {
                        for (let y = 0; y < cellDimensions.y; y++) {
                          for (let z = 0; z < cellDimensions.z; z++) {
                            const nx = chunk.x * cellDimensions.x + x;
                            const ny = chunk.y * cellDimensions.y + y;
                            const nz = chunk.z * cellDimensions.z + z;
                            selectedBlocks.current.set(`${nx},${ny},${nz}`, {
                              x: nx,
                              y: ny,
                              z: nz,
                            });
                          }
                        }
                      }
                      chunkRefs.current[chunkIndex].setChunkSelected(true);
                    });
                  } else {
                    filteredChunks.forEach(({ chunk, i: chunkIndex }) => {
                      for (let x = 0; x < cellDimensions.x; x++) {
                        for (let y = 0; y < cellDimensions.y; y++) {
                          for (let z = 0; z < cellDimensions.z; z++) {
                            const nx = chunk.x * cellDimensions.x + x;
                            const ny = chunk.y * cellDimensions.y + y;
                            const nz = chunk.z * cellDimensions.z + z;
                            selectedBlocks.current.delete(`${nx},${ny},${nz}`);
                          }
                        }
                      }

                      chunkRefs.current[chunkIndex].setChunkSelected(false);
                    });
                  }
                })();
                break;
            }
          }}
        >
          <Turtle3D
            name={turtle.name}
            rotation={[0, turtleRotation, 0]}
            blockstates={blockstates}
            models={models}
            textures={textures}
          />
          <BuildBlock
            ref={buildBlockRef}
            blockstates={blockstates}
            models={models}
            textures={textures}
          />
          <SchemaPlacer
            ref={schemaPlacerRef}
            blockstates={blockstates}
            models={models}
            textures={textures}
          />
          <group
            position={[
              -mathematicalModulo(turtle.location.x, cellDimensions.x),
              -mathematicalModulo(turtle.location.y, cellDimensions.y),
              -mathematicalModulo(turtle.location.z, cellDimensions.z),
            ]}
          >
            {chunks.map((chunk, i) => (
              <SparseBlock
                ref={(element) => {
                  if (element != null) {
                    chunkRefs.current[i] = element;
                  }
                }}
                key={`${chunk.x},${chunk.y},${chunk.z}`}
                dimensions={cellDimensions}
                chunk={chunk}
                blockstates={blockstates}
                models={models}
                textures={textures}
              />
            ))}
          </group>
        </group>
      ) : null}
    </>
  );
});

export default World;
