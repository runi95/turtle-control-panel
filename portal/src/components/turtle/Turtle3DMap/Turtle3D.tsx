/* eslint-disable react/no-unknown-property */
import {FrontSide} from 'three';
import {useMemo} from 'react';
import {fragmentShader, vertexShader} from './CustomShader';
import {useAtlas} from './TextureAtlas';

function Turtle3D() {
    const {data: atlas} = useAtlas();
    const positions = useMemo(() => {
        return new Float32Array([
            0.34375, 0.375, 0.375, 0.34375, 0.375, -0.375, 0.34375, -0.375, 0.375, 0.34375, -0.375, -0.375, -0.375,
            0.375, -0.375, -0.375, 0.375, 0.375, -0.375, -0.375, -0.375, -0.375, -0.375, 0.375, -0.375, 0.375, -0.375,
            0.34375, 0.375, -0.375, -0.375, 0.375, 0.375, 0.34375, 0.375, 0.375, -0.375, -0.375, 0.375, 0.34375, -0.375,
            0.375, -0.375, -0.375, -0.375, 0.34375, -0.375, -0.375, -0.375, 0.375, 0.375, 0.34375, 0.375, 0.375, -0.375,
            -0.375, 0.375, 0.34375, -0.375, 0.375, 0.34375, 0.375, -0.375, -0.375, 0.375, -0.375, 0.34375, -0.375,
            -0.375, -0.375, -0.375, -0.375,
        ]);
    }, []);
    const uvs = useMemo(() => {
        return new Float32Array([
            0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0,
            0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1,
        ]);
    }, []);
    const uvSlices = useMemo(() => {
        return new Float32Array([
            614, 614, 614, 614, 615, 615, 615, 615, 616, 616, 616, 616, 616, 616, 616, 616, 614, 614, 614, 614, 614,
            614, 614, 614,
        ]);
    }, []);
    const indicies = useMemo(() => {
        return new Uint32Array([
            0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20,
            22, 21, 22, 23, 21,
        ]);
    }, []);

    if (atlas == null) return null;
    return (
        <mesh receiveShadow>
            <bufferGeometry>
                <float32BufferAttribute attach='attributes-position' args={[positions, 3]} />
                <float32BufferAttribute attach='attributes-uv' args={[uvs, 2]} />
                <float32BufferAttribute attach='attributes-uvSlice' args={[uvSlices, 1]} />
                <bufferAttribute attach='index' args={[indicies, 1]} />
            </bufferGeometry>
            <shaderMaterial
                uniforms={{
                    diffuseMap: {
                        value: atlas,
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
    );
}

export default Turtle3D;
