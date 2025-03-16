/* eslint-disable react/no-unknown-property */
import {
    BufferAttribute,
    BufferGeometry,
    ClampToEdgeWrapping,
    Color,
    DataArrayTexture,
    Float32BufferAttribute,
    FrontSide,
    LinearMipMapLinearFilter,
    Mesh,
    NearestFilter,
    PlaneGeometry,
    RGBAFormat,
    SRGBColorSpace,
    ShaderMaterial,
    UnsignedByteType,
    Vector3,
} from 'three';
import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef} from 'react';
import {fragmentShader, vertexShader} from './CustomShader';
import {Block, BlockState, Blocks} from '../../../App';
import {AtlasMap, useAtlas} from './TextureAtlas';
import {useBlocks} from '../../../api/UseBlocks';
import {useParams} from 'react-router-dom';
import {WorldChunk} from './World';

interface Cell {
    position: [number, number, number];
    type: string;
    visible: boolean;
    state?: BlockState;
}

const CreateTerrain = (dimensions: Vector3, fromX: number, fromY: number, fromZ: number, blocks: Blocks) => {
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
                        visible: true,
                        state: block.state,
                    });
                }
            }
        }
    }

    return cells;
};

interface CellMesh {
    positions: Float32Array;
    uvs: Float32Array;
    uvSlices: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
    locationIndices: Uint32Array;
    locations: Float32Array;
    cellToIndexMap: Map<string, number[]>;
}

const BuildMeshDataFromVoxels = (
    cells: Map<string, Cell>,
    geometries: PlaneGeometry[],
    atlasMap: AtlasMap,
    textureOverrides: {
        [key: number]: number;
    }
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

    const color = new Color(0xffffff);
    color.convertSRGBToLinear();

    const blue = new Color(0x0000ff);
    color.convertSRGBToLinear();

    const cellToIndexMap = new Map<string, number[]>();
    const unknownTexture = atlasMap.textures['unknown'];
    let index = 0;
    let locationIndex = 0;
    for (const [key, cell] of cells) {
        const atlasMapBlock = atlasMap.blockstates[cell.type];
        if (atlasMapBlock == null) {
            console.log(`${cell.type} is broken!`);
        }

        const matchingBlock =
            atlasMapBlock?.find((block) => {
                if (block == null) return false;

                const {state} = block;
                if (state == null) return true;

                const {state: cellState = {}} = cell;

                const stateKeys = Object.keys(state);
                for (const stateKey of stateKeys) {
                    if (cellState[stateKey]?.toString() ?? 'false' !== state[stateKey]) return false;
                }

                return true;
            }) ?? null;

        const blockTextures = (matchingBlock != null ? atlasMap.textures[matchingBlock.model] : null) ?? unknownTexture;
        const blockFaces = atlasMap.models[blockTextures.model];
        if (blockFaces == null) {
            console.log(`${cell.type} is broken!`);
            continue;
        }

        mesh.locations.push(cell.position[0], cell.position[1], cell.position[2]);

        const indexes = [];
        for (let i = 0; i < blockFaces.length; i++) {
            const blockFace = blockFaces[i];
            const bi = mesh.positions.length / 3;
            const localPositions = (() => {
                if (matchingBlock == null) return [...blockFace.face];
                if (matchingBlock.x == null && matchingBlock.y == null) return [...blockFace.face];

                const planeGeometry = new PlaneGeometry();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (planeGeometry.attributes.position as any).array = [...blockFace.face];

                const {x, y} = matchingBlock;
                if (x != null) {
                    planeGeometry.rotateX(-(x * Math.PI) / 180);
                }

                if (y != null) {
                    planeGeometry.rotateY(-(y * Math.PI) / 180);
                }

                return planeGeometry.attributes['position']['array'];
            })();
            for (let j = 0; j < 3; j++) {
                for (let v = 0; v < 4; v++) {
                    localPositions[v * 3 + j] += cell.position[j];
                }
            }

            mesh.positions.push(...localPositions);
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
                if (typeof blockTexture === 'number') {
                    return blockTexture;
                } else {
                    return blockTexture[i];
                }
            })();

            for (let v = 0; v < 4; v++) {
                mesh.uvSlices.push(textureOverrides[blockTexture]);
                if (cell.state?.facing === 'foo') {
                    mesh.colors.push(blue.r, blue.g, blue.b);
                } else {
                    mesh.colors.push(color.r, color.g, color.b);
                }
            }

            for (let v = 0; v < 2; v++) {
                mesh.locationIndices.push(locationIndex);
            }

            const localIndices = [0, 2, 1, 2, 3, 1];
            for (let j = 0; j < localIndices.length; j++) {
                localIndices[j] += bi;
            }
            mesh.indices.push(...localIndices);
            indexes.push(index++);
        }

        locationIndex++;
        cellToIndexMap.set(key, indexes);
    }

    const bytesInFloat32 = 4;
    const bytesInInt32 = 4;

    const positions = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.positions.length));
    const uvs = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.uvs.length));
    const uvSlices = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.uvSlices.length));
    const normals = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.normals.length));
    const colors = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.colors.length));
    const indices = new Uint32Array(new ArrayBuffer(bytesInInt32 * mesh.indices.length));
    const locationIndices = new Uint32Array(new ArrayBuffer(bytesInInt32 * mesh.locationIndices.length));
    const locations = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.locations.length));

    positions.set(mesh.positions, 0);
    normals.set(mesh.normals, 0);
    uvs.set(mesh.uvs, 0);
    uvSlices.set(mesh.uvSlices, 0);
    colors.set(mesh.colors, 0);
    indices.set(mesh.indices, 0);
    locationIndices.set(mesh.locationIndices, 0);
    locations.set(mesh.locations, 0);

    return {
        positions,
        uvs,
        uvSlices,
        normals,
        colors,
        indices,
        locationIndices,
        locations,
        cellToIndexMap,
    };
};

const Rebuild = (
    dimensions: Vector3,
    fromX: number,
    fromY: number,
    fromZ: number,
    geometries: PlaneGeometry[],
    atlasMap: AtlasMap,
    textureOverrides: {
        [key: number]: number;
    },
    blocks: Blocks
) => {
    const terrainVoxels = CreateTerrain(dimensions, fromX, fromY, fromZ, blocks);
    return BuildMeshDataFromVoxels(terrainVoxels, geometries, atlasMap, textureOverrides);
};

interface Props {
    dimensions: Vector3;
    chunk: WorldChunk;
    geometries: PlaneGeometry[];
    atlasMap: AtlasMap;
}

export type SparseBlockHandle = {
    setBlockColor: (x: number, y: number, z: number, color: Color) => void;
    setChunkColor: (color: Color) => void;
};

const SparseBlock = forwardRef<SparseBlockHandle, Props>(function SparseBlock(props, ref) {
    const {dimensions, chunk, geometries, atlasMap} = props;
    const {x: chunkX, y: chunkY, z: chunkZ, offsetX, offsetY, offsetZ} = chunk;
    const {serverId} = useParams() as {serverId: string};
    const meshRef = useRef<Mesh>(null!);
    const fromX = chunkX * dimensions.x;
    const toX = fromX + dimensions.x - 1;
    const fromY = chunkY * dimensions.y;
    const toY = fromY + dimensions.y - 1;
    const fromZ = chunkZ * dimensions.z;
    const toZ = fromZ + dimensions.z - 1;
    const {data: blocks} = useBlocks(
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
        true
    );
    const shaderMaterial = useMemo(
        () =>
            new ShaderMaterial({
                name: 'shaderMaterial - materialOpqaque',
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
        []
    );
    const {data: atlas} = useAtlas();
    const minimizedAtlas = useMemo(() => {
        if (atlas == null) return null;
        if (blocks == null) return null;

        const blockKeys = Object.keys(blocks);
        const uniqueBlocks = blockKeys.reduce((acc, curr) => {
            const block = blocks[curr];
            acc.set(block.name, block);
            return acc;
        }, new Map<string, Block>());

        const uniqueTextures = new Set<number>([0]);
        const unknown = atlasMap.textures['unknown'];
        for (const block of uniqueBlocks.values()) {
            const blockStates = atlasMap.blockstates[block.name];
            if (blockStates == null) continue;

            for (const blockState of blockStates) {
                const texture = atlasMap.textures[blockState.model] ?? unknown;
                const {model: _model, ...textureKeys} = texture;
                Object.keys(textureKeys).forEach((key) => {
                    const textureIndex = texture[key];
                    if (typeof textureIndex === 'number') {
                        uniqueTextures.add(textureIndex);
                    } else {
                        Object.keys(textureIndex).forEach((textureIndexKey) =>
                            uniqueTextures.add(textureIndex[textureIndexKey])
                        );
                    }
                });
            }
        }

        const originalUintArray = new Uint8Array(atlas);
        const newUintArray = new Uint8Array(uniqueTextures.size * 1024);

        let i = 0;
        const atlasTextureMap: {
            [key: number]: number;
        } = {};
        for (const uniqueTexture of uniqueTextures.values()) {
            const start = uniqueTexture * 1024;
            atlasTextureMap[uniqueTexture] = i;
            newUintArray.set(originalUintArray.subarray(start, start + 1024), 1024 * i++);
        }

        const atlasTexture = new DataArrayTexture(newUintArray, 16, 16, newUintArray.length / 1024);
        atlasTexture.format = RGBAFormat;
        atlasTexture.type = UnsignedByteType;
        atlasTexture.minFilter = LinearMipMapLinearFilter;
        atlasTexture.magFilter = NearestFilter;
        atlasTexture.wrapS = ClampToEdgeWrapping;
        atlasTexture.wrapT = ClampToEdgeWrapping;
        atlasTexture.generateMipmaps = true;
        atlasTexture.colorSpace = SRGBColorSpace;

        atlasTexture.needsUpdate = true;
        return {
            atlasTexture,
            atlasTextureMap,
        };
    }, [atlas, atlasMap, blocks]);

    useEffect(() => {
        if (minimizedAtlas == null) return;
        shaderMaterial.uniforms.diffuseMap.value = minimizedAtlas.atlasTexture;
    }, [minimizedAtlas]);

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
            geometries,
            atlasMap,
            minimizedAtlas.atlasTextureMap,
            blocks
        );

        geometry.current.setAttribute('position', new Float32BufferAttribute(build.positions, 3));
        geometry.current.setAttribute('normal', new Float32BufferAttribute(build.normals, 3));
        geometry.current.setAttribute('uv', new Float32BufferAttribute(build.uvs, 2));
        geometry.current.setAttribute('uvSlice', new Float32BufferAttribute(build.uvSlices, 1));
        geometry.current.setAttribute('color', new Float32BufferAttribute(build.colors, 3));
        geometry.current.setAttribute('locationIndex', new BufferAttribute(build.locationIndices, 1));
        geometry.current.setAttribute('location', new Float32BufferAttribute(build.locations, 3));
        geometry.current.setIndex(new BufferAttribute(build.indices, 1));

        geometry.current.attributes.position.needsUpdate = true;
        geometry.current.attributes.normal.needsUpdate = true;
        geometry.current.attributes.color.needsUpdate = true;

        geometry.current.computeBoundingBox();
        geometry.current.computeBoundingSphere();

        cellToIndexMap.current = build.cellToIndexMap;
    }, [dimensions, fromX, fromY, fromZ, geometries, atlasMap, minimizedAtlas?.atlasTextureMap, blocks]);

    useImperativeHandle(
        ref,
        () => {
            return {
                setBlockColor(x: number, y: number, z: number, color: Color) {
                    if (meshRef.current == null) return;

                    const cell = cellToIndexMap.current?.get(`${x},${y},${z}`);
                    if (cell == null) return;

                    for (const cellIndex of cell) {
                        for (let i = 0; i < 4; i++) {
                            meshRef.current.geometry.attributes.color.array[12 * cellIndex + 3 * i] = color.r;
                            meshRef.current.geometry.attributes.color.array[12 * cellIndex + 3 * i + 1] = color.g;
                            meshRef.current.geometry.attributes.color.array[12 * cellIndex + 3 * i + 2] = color.b;
                        }
                    }

                    meshRef.current.geometry.attributes.color.needsUpdate = true;
                },
                setChunkColor(color: Color) {
                    if (meshRef.current == null) return;

                    for (let i = 0; i < meshRef.current.geometry.attributes.color.array.length; i++) {
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
        },
        []
    );

    return (
        <mesh
            ref={meshRef}
            args={[geometry.current, shaderMaterial]}
            receiveShadow
            position={[offsetX, offsetY, offsetZ]}
            userData={{
                isBlocks: false,
                isTurtle: false,
            }}
        />
    );
});

export default SparseBlock;
