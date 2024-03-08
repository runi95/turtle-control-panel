import {Canvas} from '@react-three/fiber';
import World from './World';
import {OrbitControls} from '@react-three/drei';
import {useParams} from 'react-router-dom';
import {useBlocks} from '../../../api/UseBlocks';
import {useTurtle} from '../../../api/UseTurtle';

const matrixScaleDiv = 32;
const heightDiv = 8;

function Turtle3DMap() {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {data: turtle} = useTurtle(serverId, id);
    const {data: blocks} = useBlocks(
        serverId,
        {
            fromX: turtle !== undefined ? turtle.location?.x - matrixScaleDiv : 0,
            toX: turtle !== undefined ? turtle.location?.x + matrixScaleDiv : 0,
            fromY: turtle !== undefined ? turtle.location?.y - heightDiv : 0,
            toY: turtle !== undefined ? turtle.location?.y + heightDiv : 0,
            fromZ: turtle !== undefined ? turtle.location?.z - matrixScaleDiv : 0,
            toZ: turtle !== undefined ? turtle.location?.z + matrixScaleDiv : 0,
        },
        turtle !== undefined && turtle.location !== null && turtle.direction !== null
    );

    if (blocks == null) return null;
    if (turtle == null) return null;
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
            <World chunkSize={32} visibleChunkRadius={1} turtle={turtle} blocks={blocks} />
            <OrbitControls />
        </Canvas>
    );
}

export default Turtle3DMap;
