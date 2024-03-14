import {Canvas} from '@react-three/fiber';
import World from './World';
import {OrbitControls} from '@react-three/drei';

function Turtle3DMap() {
    return (
        <Canvas
            gl={{
                antialias: false,
                depth: true,
            }}
            camera={{
                fov: 60,
                aspect: 1920 / 1080,
                near: 0.5,
                far: 10000.0,
                position: [15, 50, 15],
            }}
            className='canvas'
        >
            <World chunkSize={16} visibleChunkRadius={1} />
            <OrbitControls />
        </Canvas>
    );
}

export default Turtle3DMap;
