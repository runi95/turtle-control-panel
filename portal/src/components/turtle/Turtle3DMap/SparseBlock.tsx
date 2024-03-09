/* eslint-disable react/no-unknown-property */
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    PlaneGeometry,
    ShaderMaterial,
    Vector3,
} from 'three';
import {useMemo} from 'react';
import {Blocks} from '../../../App';
import {AtlasMap} from './TextureAtlas';
import {Location} from '../../../api/UseTurtle';

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
    facesHidden: [boolean, boolean, boolean, boolean, boolean];
    ao: [null, null, null, null, null, null];
}

const CreateTerrain = (location: Location, dimensions: Vector3, offset: Vector3, blocks: Blocks) => {
    const cells = new Map<string, Cell>();
    const xn = -1;
    const zn = -1;
    const xp = dimensions.x + 1;
    const zp = dimensions.x + 1;

    for (let x = xn; x < xp; x++) {
        for (let z = zn; z < zp; z++) {
            for (let y = 0; y < 16; y++) {
                const xPos = x - offset.x;
                const zPos = z - offset.z;
                const yPos = y - 8 - offset.y;
                const key = `${xPos},${yPos},${zPos}`;

                const block = blocks[`${location.x + xPos},${location.y + yPos},${location.z + zPos}`];
                if (block) {
                    cells.set(key, {
                        position: [xPos, yPos, zPos],
                        type: block.name,
                        visible: true,
                        facesHidden: [false, false, false, false, false],
                        ao: [null, null, null, null, null, null],
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
    atlasMap: AtlasMap
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

    for (const [_key, cell] of cells) {
        for (let i = 0; i < 6; ++i) {
            if (cell.facesHidden[i]) {
                continue;
            }

            const bi = mesh.positions.length / 3;
            const localPositions = [...geometries[i].attributes.position.array];
            for (let j = 0; j < 3; ++j) {
                for (let v = 0; v < 4; ++v) {
                    localPositions[v * 3 + j] += cell.position[j];
                }
            }
            mesh.positions.push(...localPositions);
            mesh.uvs.push(...geometries[i].attributes.uv.array);
            mesh.normals.push(...geometries[i].attributes.normal.array);

            const blockType = atlasMap[cell.type];
            for (let v = 0; v < 4; ++v) {
                if (blockType == null) {
                    mesh.uvSlices.push(atlasMap['unknown'][i]);
                } else {
                    mesh.uvSlices.push(blockType[i]);
                }

                const color = new Color(0xffffff);
                const cellAO = cell.ao[i];
                if (cellAO != null) {
                    color.multiplyScalar(cellAO[v]);
                }

                color.convertSRGBToLinear();

                mesh.colors.push(color.r, color.g, color.b);
            }

            const index = geometries[i].index;
            if (index == null) continue;
            const localIndices = [...index.array];
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
    location: Location,
    dimensions: Vector3,
    offset: Vector3,
    geometries: PlaneGeometry[],
    atlasMap: AtlasMap,
    blocks: Blocks
) => {
    const terrainVoxels = CreateTerrain(location, dimensions, offset, blocks);
    return BuildMeshDataFromVoxels(terrainVoxels, geometries, atlasMap);
};

interface Props {
    location: Location;
    dimensions: Vector3;
    offset: Vector3;
    geometries: PlaneGeometry[];
    atlasMap: AtlasMap;
    materialOpaque: ShaderMaterial;
    blocks: Blocks;
}

function SparseBlock(props: Props) {
    const {location, dimensions, offset, geometries, atlasMap, materialOpaque, blocks} = props;
    const opaqueGeometry = useMemo(
        () => createGeometry(Rebuild(location, dimensions, offset, geometries, atlasMap, blocks)),
        [dimensions, offset, geometries, atlasMap]
    );

    return <mesh receiveShadow args={[opaqueGeometry, materialOpaque]} />;
}

export default SparseBlock;
