/* eslint-disable react/no-unknown-property */
import {Suspense, forwardRef, useImperativeHandle, useMemo, useRef} from 'react';
import {Color, InstancedMesh, Matrix4, TextureLoader, PlaneGeometry, Vector3, Group, Mesh} from 'three';
import {useAtlasMap} from './TextureAtlas';
import SparseBlock, {SparseBlockHandle} from './SparseBlock';
import {Direction, Location, useTurtle} from '../../../api/UseTurtle';
import {useLoader} from '@react-three/fiber';
import {useParams} from 'react-router-dom';
import {useWebSocket} from '../../../api/UseWebSocket';
import Turtle3D from './Turtle3D';
import OtherTurtles from './OtherTurtles';
import HomeMarker from './HomeMarker';
import BuildBlock, {BuildBlockHandle} from './BuildBlock';
import {Block} from '../../../App';

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
    getSelectedBlocks: () => Location[];
    getBuiltBlocks: () => Omit<Block, 'state' | 'tags'>[];
    setBuildBlockType: (type: string) => void;
};

const World = forwardRef<WorldHandle, Props>(function World(props: Props, ref) {
    const {chunkSize, visibleChunkRadius} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {data: turtle} = useTurtle(serverId, id);
    const {action} = useWebSocket();
    const groupRef = useRef<Group>(null!);
    const worldStateRef = useRef<WorldState | null>(null);
    const indicatorMeshRef = useRef<InstancedMesh>(null!);
    const indicatorMeshVisibleRef = useRef<boolean>(false);
    const chunkRefs = useRef<SparseBlockHandle[]>([]);
    const buildBlockRef = useRef<BuildBlockHandle>(null!);
    const buildBlockTypeRef = useRef<string>('minecraft:cobblestone');
    const selectedBlocks = useRef(new Map<string, Location>());
    const outlineMap = useLoader(TextureLoader, '/outline.png');
    const moveTurtleColorArray = useRef<Float32Array>(Float32Array.from([...new Color('#444').toArray(), 0.5]));
    const previousFaceIndex = useRef<number | null>(null);
    const tempMatrix = useMemo(() => new Matrix4(), []);
    const tempColor = useMemo(() => new Color(), []);
    const tempVector = useMemo(() => new Vector3(), []);
    const cellDimensions = useMemo(() => new Vector3(chunkSize, chunkSize, chunkSize), [chunkSize]);
    const visibleDimensions = [visibleChunkRadius, visibleChunkRadius];

    useImperativeHandle(
        ref,
        () => {
            return {
                setState(state: WorldState | null) {
                    worldStateRef.current = state;
                    switch (state) {
                        case WorldState.MOVE:
                            tempColor.set('#444').toArray(moveTurtleColorArray.current, 0);
                            moveTurtleColorArray.current[3] = 0.5;
                            indicatorMeshRef.current.geometry.attributes.color.needsUpdate = true;
                            break;
                        case WorldState.BUILD:
                        case WorldState.SELECT_SINGLE:
                        case WorldState.SELECT_CHUNK:
                        case WorldState.SELECT_CHUNK_FULL:
                            tempColor.set('#4287f5').toArray(moveTurtleColorArray.current, 0);
                            moveTurtleColorArray.current[3] = 0.5;
                            indicatorMeshRef.current.geometry.attributes.color.needsUpdate = true;
                            break;
                        case null:
                            buildBlockRef.current.reset();
                            previousFaceIndex.current = null;
                            indicatorMeshRef.current.visible = false;
                            indicatorMeshVisibleRef.current = false;
                            if (selectedBlocks.current.size > 0) {
                                tempColor.set(0xffffff);
                                tempColor.convertSRGBToLinear();

                                const locations = Array.from(selectedBlocks.current.values());
                                for (const location of locations) {
                                    const {x, y, z} = location;
                                    const chunkX = Math.floor(x / cellDimensions.x);
                                    const chunkY = Math.floor(y / cellDimensions.y);
                                    const chunkZ = Math.floor(z / cellDimensions.z);
                                    const chunkIndex = chunks.findIndex(
                                        (chunk) => chunk.x === chunkX && chunk.y === chunkY && chunk.z === chunkZ
                                    );
                                    if (chunkIndex === -1) continue;
                                    chunkRefs.current[chunkIndex].setBlockColor(x, y, z, tempColor);
                                }
                            }

                            selectedBlocks.current.clear();
                            break;
                    }
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
        },
        []
    );

    const {data: atlasMap} = useAtlasMap();

    const location = turtle?.location ?? null;
    const chunks = useMemo(() => {
        if (location == null) return [];

        const {x, y, z} = location;
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

    const geometries = useMemo(() => {
        const pxGeometry = new PlaneGeometry(1, 1);
        pxGeometry.rotateY(Math.PI / 2);
        pxGeometry.translate(0.5, 0, 0);

        const nxGeometry = new PlaneGeometry(1, 1);
        nxGeometry.rotateY(-Math.PI / 2);
        nxGeometry.translate(-0.5, 0, 0);

        const pyGeometry = new PlaneGeometry(1, 1);
        pyGeometry.rotateX(-Math.PI / 2);
        pyGeometry.translate(0, 0.5, 0);

        const nyGeometry = new PlaneGeometry(1, 1);
        nyGeometry.rotateX(Math.PI / 2);
        nyGeometry.translate(0, -0.5, 0);

        const pzGeometry = new PlaneGeometry(1, 1);
        pzGeometry.translate(0, 0, 0.5);

        const nzGeometry = new PlaneGeometry(1, 1);
        nzGeometry.rotateY(Math.PI);
        nzGeometry.translate(0, 0, -0.5);

        const geometriesToInvert = [pxGeometry, nxGeometry, pzGeometry, nzGeometry];
        for (const geometry of geometriesToInvert) {
            for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
                geometry.attributes.uv.array[i + 1] = 1.0 - geometry.attributes.uv.array[i + 1];
            }
        }

        return [pxGeometry, nxGeometry, pyGeometry, nyGeometry, pzGeometry, nzGeometry];
    }, []);

    if (atlasMap == null) return null;
    if (turtle == null) return null;

    const turtleRotation = (() => {
        switch (turtle.direction) {
            case Direction.North:
                return 0;
            case Direction.East:
                return 1.5 * Math.PI;
            case Direction.South:
                return Math.PI;
            case Direction.West:
                return Math.PI * 0.5;
        }
    })();

    const {home} = turtle;
    return (
        <>
            {location != null && home != null ? (
                <Suspense fallback={null}>
                    <HomeMarker position={[home.x - location.x, home.y - location.y + 0.2, home.z - location.z]} />
                </Suspense>
            ) : null}
            <group rotation={[0, turtleRotation, 0]}>
                <Turtle3D atlasMap={atlasMap} name={turtle.name} />
            </group>
            <OtherTurtles />
            <instancedMesh
                ref={indicatorMeshRef}
                args={[undefined, undefined, 1]}
                visible={indicatorMeshVisibleRef.current}
                receiveShadow
                frustumCulled={false}
            >
                <boxGeometry args={[1.05, 1.05, 1.05]}>
                    <instancedBufferAttribute attach='attributes-color' args={[moveTurtleColorArray.current, 4]} />
                </boxGeometry>
                <meshBasicMaterial attach='material' vertexColors transparent alphaTest={0.1} map={outlineMap} />
            </instancedMesh>
            {turtle.location != null ? (
                <group
                    ref={groupRef}
                    onPointerMove={(e) => {
                        e.stopPropagation();
                        if (worldStateRef.current == null) return;
                        if (!(e.intersections.length > 0)) return;

                        const intersection = e.intersections[0];
                        if (intersection.faceIndex == null) return;
                        // if (intersection.faceIndex === previousFaceIndex.current) return;
                        if (previousFaceIndex.current === null) {
                            indicatorMeshRef.current.visible = true;
                            indicatorMeshVisibleRef.current = true;
                        }

                        previousFaceIndex.current = intersection.faceIndex ?? null;

                        const locationIndex = (intersection.object as Mesh)?.geometry?.attributes.locationIndex
                            ?.array?.[intersection.faceIndex];
                        if (locationIndex == null) return;
                        let x = (intersection.object as Mesh).geometry.attributes.location.array[3 * locationIndex];
                        let y = (intersection.object as Mesh).geometry.attributes.location.array[3 * locationIndex + 1];
                        let z = (intersection.object as Mesh).geometry.attributes.location.array[3 * locationIndex + 2];

                        switch (worldStateRef.current) {
                            case WorldState.MOVE:
                            case WorldState.BUILD:
                                (() => {
                                    if (intersection.face == null) return;
                                    const absX = Math.abs(intersection.face.normal.x);
                                    const absY = Math.abs(intersection.face.normal.y);
                                    const absZ = Math.abs(intersection.face.normal.z);

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
                                })();
                                break;
                        }

                        if ((intersection.object as Mesh).userData?.isBlocks !== true) {
                            x +=
                                (intersection.object as Mesh).position.x -
                                mathematicalModulo(turtle.location.x, cellDimensions.x);
                            y +=
                                (intersection.object as Mesh).position.y -
                                mathematicalModulo(turtle.location.y, cellDimensions.y);
                            z +=
                                (intersection.object as Mesh).position.z -
                                mathematicalModulo(turtle.location.z, cellDimensions.z);
                        }

                        tempMatrix.setPosition(tempVector.set(x, y, z));
                        indicatorMeshRef.current.setMatrixAt(0, tempMatrix);
                        indicatorMeshRef.current.instanceMatrix.needsUpdate = true;
                    }}
                    onPointerLeave={(e) => {
                        e.stopPropagation();
                        previousFaceIndex.current = null;
                        indicatorMeshRef.current.visible = false;
                        indicatorMeshVisibleRef.current = false;
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (worldStateRef.current == null) return;
                        if (!(e.intersections.length > 0)) return;
                        if (!turtle) return;

                        const intersection = e.intersections[0];
                        if (intersection.faceIndex == null) return;

                        const locationIndex = (intersection.object as Mesh)?.geometry?.attributes?.locationIndex
                            ?.array?.[intersection.faceIndex];
                        if (locationIndex == null) return;
                        let x = (intersection.object as Mesh).geometry.attributes.location.array[3 * locationIndex];
                        let y = (intersection.object as Mesh).geometry.attributes.location.array[3 * locationIndex + 1];
                        let z = (intersection.object as Mesh).geometry.attributes.location.array[3 * locationIndex + 2];

                        switch (worldStateRef.current) {
                            case WorldState.MOVE:
                            case WorldState.BUILD:
                                (() => {
                                    if (intersection.face == null) return;
                                    const absX = Math.abs(intersection.face.normal.x);
                                    const absY = Math.abs(intersection.face.normal.y);
                                    const absZ = Math.abs(intersection.face.normal.z);

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
                                })();
                                break;
                        }

                        if ((intersection.object as Mesh).userData?.isBlocks !== true) {
                            x +=
                                (intersection.object as Mesh).position.x -
                                mathematicalModulo(turtle.location.x, cellDimensions.x);
                            y +=
                                (intersection.object as Mesh).position.y -
                                mathematicalModulo(turtle.location.y, cellDimensions.y);
                            z +=
                                (intersection.object as Mesh).position.z -
                                mathematicalModulo(turtle.location.z, cellDimensions.z);
                        }

                        const {x: tx, y: ty, z: tz} = turtle.location;
                        switch (worldStateRef.current) {
                            case WorldState.MOVE:
                                action({
                                    type: 'ACTION',
                                    action: 'move',
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
                                    buildBlockRef.current.addBlock(x, y, z, buildBlockTypeRef.current);
                                })();
                                break;
                            case WorldState.SELECT_SINGLE:
                                (() => {
                                    const chunkX = Math.floor((x + tx) / cellDimensions.x);
                                    const chunkY = Math.floor((y + ty) / cellDimensions.y);
                                    const chunkZ = Math.floor((z + tz) / cellDimensions.z);
                                    const chunkIndex = chunks.findIndex(
                                        (chunk) => chunk.x === chunkX && chunk.y === chunkY && chunk.z === chunkZ
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
                                        tempColor.set('#4287f5');
                                        tempColor.convertSRGBToLinear();

                                        chunkRefs.current[chunkIndex].setBlockColor(kx, ky, kz, tempColor);
                                    } else {
                                        selectedBlocks.current.delete(key);
                                        tempColor.set(0xffffff);
                                        tempColor.convertSRGBToLinear();

                                        chunkRefs.current[chunkIndex].setBlockColor(kx, ky, kz, tempColor);
                                    }
                                })();
                                break;
                            case WorldState.SELECT_CHUNK:
                                (() => {
                                    const chunkX = Math.floor((x + tx) / cellDimensions.x);
                                    const chunkY = Math.floor((y + ty) / cellDimensions.y);
                                    const chunkZ = Math.floor((z + tz) / cellDimensions.z);
                                    const chunkIndex = chunks.findIndex(
                                        (chunk) => chunk.x === chunkX && chunk.y === chunkY && chunk.z === chunkZ
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
                                        tempColor.set('#4287f5');
                                        tempColor.convertSRGBToLinear();

                                        chunkRefs.current[chunkIndex].setChunkColor(tempColor);
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

                                        tempColor.set(0xffffff);
                                        tempColor.convertSRGBToLinear();

                                        chunkRefs.current[chunkIndex].setChunkColor(tempColor);
                                    }
                                })();
                                break;
                            case WorldState.SELECT_CHUNK_FULL:
                                (() => {
                                    const chunkX = Math.floor((x + tx) / cellDimensions.x);
                                    const chunkZ = Math.floor((z + tz) / cellDimensions.z);
                                    const filteredChunks = chunks
                                        .map((chunk, i) => ({chunk, i}))
                                        .filter(({chunk}) => chunk.x === chunkX && chunk.z === chunkZ);
                                    if (filteredChunks == null || filteredChunks.length === 0) return;

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
                                        tempColor.set('#4287f5');
                                        tempColor.convertSRGBToLinear();

                                        filteredChunks.forEach(({chunk, i: chunkIndex}) => {
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
                                            chunkRefs.current[chunkIndex].setChunkColor(tempColor);
                                        });
                                    } else {
                                        tempColor.set(0xffffff);
                                        tempColor.convertSRGBToLinear();

                                        filteredChunks.forEach(({chunk, i: chunkIndex}) => {
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

                                            chunkRefs.current[chunkIndex].setChunkColor(tempColor);
                                        });
                                    }
                                })();
                                break;
                        }
                    }}
                >
                    <BuildBlock ref={buildBlockRef} atlasMap={atlasMap} geometries={geometries} />
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
                                geometries={geometries}
                                atlasMap={atlasMap}
                            />
                        ))}
                    </group>
                </group>
            ) : null}
        </>
    );
});

export default World;
