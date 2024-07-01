/* eslint-disable react/no-unknown-property */
import {
    ClampToEdgeWrapping,
    DataArrayTexture,
    FrontSide,
    LinearMipMapLinearFilter,
    NearestFilter,
    RGBAFormat,
    SRGBColorSpace,
    UnsignedByteType,
} from 'three';
import {useMemo} from 'react';
import {fragmentShader, vertexShader} from './CustomShader';
import {AtlasMap, useAtlas} from './TextureAtlas';
import TurtleNameTag from './TurtleNameTag';
import {MeshProps} from '@react-three/fiber';

type Props = {
    name: string;
    atlasMap: AtlasMap;
};

const turtleTextureName = 'computercraft:turtle_advanced';

function Turtle3D({name, atlasMap, ...meshProps}: Props & MeshProps) {
    const {data: atlas} = useAtlas();
    const minimizedAtlas = useMemo(() => {
        if (atlas == null) return null;

        const uniqueTextures = new Set<number>([0]);
        const unknown = atlasMap.textures['unknown'];
        const texture = atlasMap.textures[turtleTextureName] ?? unknown;
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
    }, [atlas, atlasMap]);

    const positions = useMemo(() => {
        return new Float32Array(
            atlasMap.models[(atlasMap.textures[turtleTextureName] ?? atlasMap.textures['unknown']).model]
                .map((m) => m.face)
                .flat()
        );
    }, []);
    const uvs = useMemo(() => {
        return new Float32Array([
            0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0,
            0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0,
            0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1,
        ]);
    }, []);
    const uvSlices = useMemo(() => {
        return new Float32Array([
            1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9,
            10, 10, 10, 10, 11, 11, 11, 11,
        ]);
    }, []);
    const indicies = useMemo(() => {
        return new Uint32Array(
            [
                0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17,
                20, 22, 21, 22, 23, 21,
            ].concat(
                [
                    0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19,
                    17, 20, 22, 21, 22, 23, 21,
                ].map((v) => v + 24)
            )
        );
    }, []);

    const locationIndices = useMemo(() => {
        return new Uint32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    }, []);

    const locations = useMemo(() => {
        return new Float32Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]);
    }, []);

    if (atlas == null) return null;
    return (
        <>
            <TurtleNameTag text={name} position={[0, 1, 0]} />
            <mesh
                {...meshProps}
                receiveShadow
                userData={{
                    isBlocks: false,
                    isTurtle: true,
                    isSchema: false,
                }}
            >
                <bufferGeometry>
                    <float32BufferAttribute attach='attributes-position' args={[positions, 3]} />
                    <float32BufferAttribute attach='attributes-uv' args={[uvs, 2]} />
                    <float32BufferAttribute attach='attributes-uvSlice' args={[uvSlices, 1]} />
                    <float32BufferAttribute attach='attributes-locationIndex' args={[locationIndices, 1]} />
                    <float32BufferAttribute attach='attributes-location' args={[locations, 3]} />
                    <bufferAttribute attach='index' args={[indicies, 1]} />
                </bufferGeometry>
                <shaderMaterial
                    uniforms={{
                        diffuseMap: {
                            value: minimizedAtlas?.atlasTexture,
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
                    }}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    side={FrontSide}
                />
            </mesh>
        </>
    );
}

export default Turtle3D;
