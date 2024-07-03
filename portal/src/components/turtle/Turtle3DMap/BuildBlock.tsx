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
} from 'three';
import {forwardRef, useImperativeHandle, useMemo, useRef} from 'react';
import {fragmentShader, vertexShader} from './CustomShader';
import {Block} from '../../../App';
import {AtlasMap, useAtlas} from './TextureAtlas';
import {blockNameOverride} from './Helpers';

interface CellMesh {
    positions: Float32Array;
    uvs: Float32Array;
    uvSlices: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
    locationIndices: Uint32Array;
    locations: Float32Array;
}

const BuildMeshDataFromVoxels = (
    blocks: BlockMap,
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

    const color = new Color('#4287f5');
    color.convertSRGBToLinear();

    const unknown = atlasMap.textures['unknown'];
    let index = 0;
    let locationIndex = 0;
    for (const block of blocks.values()) {
        const atlasMapTexture = atlasMap.textures[blockNameOverride(block.name)];
        if (atlasMapTexture == null) {
            console.log(`${block.name} is broken!`);
        }
        const blockTextures = atlasMapTexture ?? unknown;

        const blockFaces = atlasMap.models[blockTextures.model];
        if (blockFaces == null) {
            console.log(`${block.name} is broken!`);
            continue;
        }

        mesh.locations.push(block.x, block.y, block.z);

        const indexes = [];
        for (let i = 0; i < blockFaces.length; i++) {
            const blockFace = blockFaces[i];
            const bi = mesh.positions.length / 3;
            const localPositions = [...blockFace.face];
            for (let v = 0; v < 4; v++) {
                localPositions[v * 3] += block.x;
                localPositions[v * 3 + 1] += block.y;
                localPositions[v * 3 + 2] += block.z;
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
                mesh.colors.push(color.r, color.g, color.b);
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
    };
};

const Rebuild = (
    geometries: PlaneGeometry[],
    atlasMap: AtlasMap,
    textureOverrides: {
        [key: number]: number;
    },
    blocks: BlockMap
) => {
    return BuildMeshDataFromVoxels(blocks, geometries, atlasMap, textureOverrides);
};

type BlockMap = Map<string, Omit<Block, 'tags'>>;

interface Props {
    geometries: PlaneGeometry[];
    atlasMap: AtlasMap;
}

export type BuildBlockHandle = {
    addBlocks: (blocksToAdd: Omit<Block, 'tags'>[]) => void;
    reset: () => void;
    getBuiltBlocks: () => Omit<Block, 'tags'>[];
};

const BuildBlock = forwardRef<BuildBlockHandle, Props>(function SparseBlock({geometries, atlasMap}, ref) {
    const meshRef = useRef<Mesh>(null!);
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
    const blocks = useRef<BlockMap>(new Map());
    const uniqueBlocks = useRef(new Map<string, boolean>());
    const geometry = useRef<BufferGeometry>(new BufferGeometry());
    const atlasTextureMap = useRef<{
        [key: number]: number;
    }>({});

    useImperativeHandle(
        ref,
        () => {
            return {
                addBlocks: (blocksToAdd: Omit<Block, 'tags'>[]) => {
                    if (atlas == null) return;

                    // Create new minimized atlas
                    let hasNewBlockType = false;
                    for (const {name} of blocksToAdd) {
                        if (uniqueBlocks.current.get(name) == null) {
                            hasNewBlockType = true;
                            uniqueBlocks.current.set(name, true);
                        }
                    }

                    if (hasNewBlockType) {
                        const uniqueTextures = new Set<number>([0]);
                        const unknown = atlasMap.textures['unknown'];
                        for (const blockName of uniqueBlocks.current.keys()) {
                            const texture = atlasMap.textures[blockNameOverride(blockName)] ?? unknown;
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

                        const originalUintArray = new Uint8Array(atlas);
                        const newUintArray = new Uint8Array(uniqueTextures.size * 1024);

                        let i = 0;
                        const updatedAtlasTextureMap: {
                            [key: number]: number;
                        } = {};
                        for (const uniqueTexture of uniqueTextures.values()) {
                            const start = uniqueTexture * 1024;
                            updatedAtlasTextureMap[uniqueTexture] = i;
                            newUintArray.set(originalUintArray.subarray(start, start + 1024), 1024 * i++);
                        }

                        atlasTextureMap.current = updatedAtlasTextureMap;

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
                        shaderMaterial.uniforms.diffuseMap.value = atlasTexture;
                    }

                    for (const block of blocksToAdd) {
                        const {x, y, z} = block;
                        blocks.current.set(`${x},${y},${z}`, block);
                    }

                    const build = Rebuild(geometries, atlasMap, atlasTextureMap.current, blocks.current);
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
                    meshRef.current.visible = true;
                },
                reset: () => {
                    uniqueBlocks.current.clear();
                    blocks.current.clear();
                    meshRef.current.visible = false;

                    geometry.current.setAttribute('position', new Float32BufferAttribute([], 3));
                    geometry.current.setAttribute('normal', new Float32BufferAttribute([], 3));
                    geometry.current.setAttribute('uv', new Float32BufferAttribute([], 2));
                    geometry.current.setAttribute('uvSlice', new Float32BufferAttribute([], 1));
                    geometry.current.setAttribute('color', new Float32BufferAttribute([], 3));
                    geometry.current.setAttribute('locationIndex', new BufferAttribute(new Uint32Array(), 1));
                    geometry.current.setAttribute('location', new Float32BufferAttribute([], 3));
                    geometry.current.setIndex(new BufferAttribute(new Uint32Array(), 1));

                    geometry.current.attributes.position.needsUpdate = true;
                    geometry.current.attributes.normal.needsUpdate = true;
                    geometry.current.attributes.color.needsUpdate = true;

                    geometry.current.computeBoundingBox();
                    geometry.current.computeBoundingSphere();
                },
                getBuiltBlocks: () => {
                    return Array.from(blocks.current.values());
                },
            };
        },
        [atlas]
    );

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
