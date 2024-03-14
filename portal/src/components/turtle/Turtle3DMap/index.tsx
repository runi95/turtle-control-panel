/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable react/no-unknown-property */
import {Canvas, useLoader} from '@react-three/fiber';
import World from './World';
import {Edges, OrbitControls} from '@react-three/drei';
import {useParams} from 'react-router-dom';
import {useBlocks} from '../../../api/UseBlocks';
import {useTurtle} from '../../../api/UseTurtle';
import {Color, InstancedMesh, Matrix4, TextureLoader, Vector3} from 'three';
import {useRef} from 'react';
import {useWebSocket} from '../../../api/UseWebSocket';

const tempMatrix = new Matrix4();

const matrixScaleDiv = 32;
const heightDiv = 8;

function Turtle3DMap() {
    const {action} = useWebSocket();
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const moveTurtleMeshRef = useRef<InstancedMesh>(null!);
    const outlineMap = useLoader(TextureLoader, '/outline.png');
    const moveTurtleColorArray = useRef<Float32Array>(Float32Array.from([...new Color('#D6D160').toArray(), 0.5]));
    const previousFaceIndex = useRef<number | null>(null);
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
            <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color='#D6D160' />
                <Edges />
            </mesh>
            <instancedMesh ref={moveTurtleMeshRef} args={[undefined, undefined, 1]} receiveShadow>
                <boxGeometry>
                    <instancedBufferAttribute attach='attributes-color' args={[moveTurtleColorArray.current, 4]} />
                </boxGeometry>
                <meshLambertMaterial attach='material' vertexColors transparent alphaTest={0.1} map={outlineMap} />
            </instancedMesh>
            <World
                chunkSize={32}
                visibleChunkRadius={1}
                turtle={turtle}
                blocks={blocks}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (!(e.intersections.length > 0)) return;

                    const intersection = e.intersections[0];
                    if (intersection.faceIndex === previousFaceIndex.current) return;
                    if (previousFaceIndex.current === null) {
                        moveTurtleMeshRef.current.visible = true;
                    }

                    previousFaceIndex.current = intersection.faceIndex ?? null;

                    const {x, y, z} = intersection.point;
                    const vx = Math.ceil(x - 0.5);
                    const vy = Math.ceil(y - 0.5) + 1;
                    const vz = Math.ceil(z - 0.5);
                    tempMatrix.setPosition(new Vector3(vx, vy, vz));
                    moveTurtleMeshRef.current.setMatrixAt(0, tempMatrix);
                    moveTurtleMeshRef.current.instanceMatrix.needsUpdate = true;
                }}
                onPointerLeave={(e) => {
                    e.stopPropagation();
                    previousFaceIndex.current = null;
                    moveTurtleMeshRef.current.visible = false;
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!(e.intersections.length > 0)) return;
                    if (!turtle) return;

                    const intersection = e.intersections[0];
                    const {x, y, z} = intersection.point;
                    const vx = Math.ceil(x - 0.5);
                    const vy = Math.ceil(y - 0.5) + 1;
                    const vz = Math.ceil(z - 0.5);
                    const {x: tx, y: ty, z: tz} = turtle.location;

                    action({
                        type: 'ACTION',
                        action: 'move',
                        data: {
                            serverId,
                            id: turtle.id,
                            x: vx + tx,
                            y: vy + ty,
                            z: vz + tz,
                        },
                    });
                }}
            />
            <OrbitControls />
        </Canvas>
    );
}

export default Turtle3DMap;
