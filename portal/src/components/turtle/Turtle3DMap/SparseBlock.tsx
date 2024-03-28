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
    NearestFilter,
    PlaneGeometry,
    RGBAFormat,
    SRGBColorSpace,
    ShaderMaterial,
    UnsignedByteType,
    Vector3,
} from 'three';
import {useEffect, useMemo} from 'react';
import {fragmentShader, vertexShader} from './CustomShader';
import {Block, Blocks} from '../../../App';
import {AtlasMap, useAtlas} from './TextureAtlas';
import {useBlocks} from '../../../api/UseBlocks';
import {useParams} from 'react-router-dom';
import {WorldChunk} from './World';

const blockNameOverride = (blockName: string) => {
    switch (blockName) {
        case 'minecraft:wheat':
            return 'minecraft:wheat_stage7';
        case 'minecraft:cocoa':
            return 'minecraft:cocoa_stage2';
        case 'minecraft:beetroots':
            return 'minecraft:beetroots_stage3';
        case 'minecraft:carrots':
            return 'minecraft:carrots_stage3';
        case 'minecraft:melon_stem':
            return 'minecraft:melon_stem_stage6';
        case 'minecraft:pumpkin_stem':
            return 'minecraft:pumpkin_stem_stage6';
        case 'minecraft:nether_wart':
            return 'minecraft:nether_wart_stage2';
        case 'minecraft:potatoes':
            return 'minecraft:potatoes_stage3';
        case 'minecraft:sweet_berry_bush':
            return 'minecraft:sweet_berry_bush_stage3';
        case 'minecraft:torchflower_crop':
            return 'minecraft:torchflower_crop_stage1';
        case 'minecraft:bamboo':
            return 'minecraft:bamboo4_age1';
        case 'minecraft:snow':
            return 'minecraft:snow_height2';
        case 'minecraft:tall_grass':
            return 'minecraft:tall_grass_bottom';
        case 'minecraft:tall_seagrass':
            return 'minecraft:tall_seagrass_bottom';
        case 'computercraft:wireless_modem_normal':
            return 'computercraft:wireless_modem_normal_on';
        case 'computercraft:wired_modem':
            return 'computercraft:wired_modem_on';
        case 'computercraft:computer_normal':
            return 'computercraft:computer_normal_on';
        case 'computercraft:disk_drive':
            return 'computercraft:disk_drive_full';
        case 'computercraft:printer':
            return 'computercraft:printer_both_full';
        default:
            return blockName;
    }
};

const createGeometry = (data: CellMesh) => {
    const geo = new BufferGeometry();

    geo.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
    geo.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
    geo.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    geo.setAttribute('uvSlice', new Float32BufferAttribute(data.uvSlices, 1));
    geo.setAttribute('color', new Float32BufferAttribute(data.colors, 3));
    geo.setIndex(new BufferAttribute(data.indices, 1));

    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
};

interface Cell {
    position: [number, number, number];
    type: string;
    visible: boolean;
}

const CreateTerrain = (dimensions: Vector3, fromX: number, fromY: number, fromZ: number, blocks: Blocks) => {
    const cells = new Map<string, Cell>();
    const xn = -1;
    const yn = -1;
    const zn = -1;
    const xp = dimensions.x + 1;
    const yp = dimensions.y + 1;
    const zp = dimensions.z + 1;

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
    } = {
        positions: [],
        uvs: [],
        uvSlices: [],
        normals: [],
        colors: [],
        indices: [],
    };

    const color = new Color(0xffffff);
    color.convertSRGBToLinear();

    const unknown = atlasMap.textures['unknown'];
    for (const [_key, cell] of cells) {
        const atlasMapTexture = atlasMap.textures[blockNameOverride(cell.type)];
        if (atlasMapTexture == null) {
            console.log(`${cell.type} is broken!`);
        }
        const blockTextures = atlasMapTexture ?? unknown;

        const blockFaces = atlasMap.models[blockTextures.model];
        if (blockFaces == null) {
            console.log(`${cell.type} is broken!`);
            continue;
        }

        for (let i = 0; i < blockFaces.length; i++) {
            const blockFace = blockFaces[i];
            const bi = mesh.positions.length / 3;
            const localPositions = [...blockFace.face];
            for (let j = 0; j < 3; ++j) {
                for (let v = 0; v < 4; ++v) {
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

            for (let v = 0; v < 4; ++v) {
                mesh.uvSlices.push(textureOverrides[blockTexture]);
                mesh.colors.push(color.r, color.g, color.b);
            }

            const localIndices = [0, 2, 1, 2, 3, 1];
            for (let j = 0; j < localIndices.length; ++j) {
                localIndices[j] += bi;
            }
            mesh.indices.push(...localIndices);
        }
    }

    const bytesInFloat32 = 4;
    const bytesInInt32 = 4;

    const positions = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.positions.length));
    const uvs = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.uvs.length));
    const uvSlices = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.uvSlices.length));
    const normals = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.normals.length));
    const colors = new Float32Array(new ArrayBuffer(bytesInFloat32 * mesh.colors.length));
    const indices = new Uint32Array(new ArrayBuffer(bytesInInt32 * mesh.indices.length));

    positions.set(mesh.positions, 0);
    normals.set(mesh.normals, 0);
    uvs.set(mesh.uvs, 0);
    uvSlices.set(mesh.uvSlices, 0);
    colors.set(mesh.colors, 0);
    indices.set(mesh.indices, 0);

    return {
        positions,
        uvs,
        uvSlices,
        normals,
        colors,
        indices,
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

function SparseBlock(props: Props) {
    const {dimensions, chunk, geometries, atlasMap} = props;
    const {x: chunkX, y: chunkY, z: chunkZ, offsetX, offsetY, offsetZ} = chunk;
    const {serverId} = useParams() as {serverId: string};
    const fromX = chunkX * dimensions.x;
    const toX = fromX + dimensions.x;
    const fromY = chunkY * dimensions.y;
    const toY = fromY + dimensions.y;
    const fromZ = chunkZ * dimensions.z;
    const toZ = fromZ + dimensions.z;
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
            const texture = atlasMap.textures[blockNameOverride(block.name)] ?? unknown;
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

    const opaqueGeometry = useMemo(() => {
        if (blocks == null) return undefined;
        if (minimizedAtlas == null) return undefined;
        return createGeometry(
            Rebuild(dimensions, fromX, fromY, fromZ, geometries, atlasMap, minimizedAtlas.atlasTextureMap, blocks)
        );
    }, [dimensions, fromX, fromY, fromZ, geometries, atlasMap, minimizedAtlas?.atlasTextureMap, blocks]);

    return <mesh receiveShadow args={[opaqueGeometry, shaderMaterial]} position={[offsetX, offsetY, offsetZ]} />;
}

export default SparseBlock;
