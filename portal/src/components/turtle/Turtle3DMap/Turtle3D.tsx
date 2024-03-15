/* eslint-disable react/no-unknown-property */
import {BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, PlaneGeometry, ShaderMaterial} from 'three';
import {useMemo} from 'react';
import {AtlasMap} from './TextureAtlas';

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

interface CellMesh {
    positions: Float32Array;
    uvs: Float32Array;
    uvSlices: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
}

const BuildMeshDataFromVoxels = (geometries: PlaneGeometry[], atlasMap: AtlasMap): CellMesh => {
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

    const cell = {
        position: [0, 0, 0],
        visible: true,
    };
    const color = new Color(0xffffff);
    color.convertSRGBToLinear();
    for (let i = 0; i < 6; ++i) {
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

        const blockType = atlasMap['computercraft:computer_advanced'];
        for (let v = 0; v < 4; ++v) {
            if (blockType == null) {
                mesh.uvSlices.push(atlasMap['unknown'][i]);
            } else {
                mesh.uvSlices.push(blockType[i]);
            }

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

interface Props {
    geometries: PlaneGeometry[];
    atlasMap: AtlasMap;
    materialOpaque: ShaderMaterial;
}

function Turtle3D(props: Props) {
    const {geometries, atlasMap, materialOpaque} = props;
    const opaqueGeometry = useMemo(() => {
        return createGeometry(BuildMeshDataFromVoxels(geometries, atlasMap));
    }, [geometries, atlasMap]);

    return <mesh receiveShadow args={[opaqueGeometry, materialOpaque]} />;
}

export default Turtle3D;
