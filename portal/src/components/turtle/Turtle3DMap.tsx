/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable react/no-unknown-property */
import './Turtle3DMap.css';
import {Canvas, useFrame, useLoader} from '@react-three/fiber';
import {Color, InstancedMesh, Matrix4, Quaternion, TextureLoader, Vector3} from 'three';
import type * as threelib from 'three-stdlib';
import {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Direction, useTurtle} from '../../api/UseTurtle';
import {useBlocks} from '../../api/UseBlocks';
import SpriteTable from '../../SpriteTable';
import {Edges, OrbitControls} from '@react-three/drei';
import {EffectComposer, N8AO} from '@react-three/postprocessing';
import {Action} from '../../App';
import CameraIcon from '../../icons/CameraIcon';
import CarIcon from '../../icons/CarIcon';

const tempColor = new Color();
const tempMatrix = new Matrix4();
const tempQuaternion = new Quaternion();
const matrixScale = 64;
const matrixScalePow = matrixScale * matrixScale;
const height = 16;
const matrixSize = matrixScalePow * height;

const matrixScaleDiv = matrixScale * 0.5;
const heightDiv = height * 0.5;

enum MapModes {
    TURTLE_MOVE_MODE,
    CAMERA_MODE,
}

interface Turtle3DMapProps {
    action: Action;
}

function Turtle3DMap(props: Turtle3DMapProps) {
    const {action} = props;
    const worldMeshRef = useRef<{setMode: (mapMode: MapModes) => void}>(null!);
    const [mapMode, setMapMode] = useState<MapModes>(MapModes.CAMERA_MODE);

    useEffect(() => {
        if (!worldMeshRef.current) return;

        worldMeshRef.current.setMode(mapMode);
    }, [mapMode]);

    return (
        <>
            <Canvas
                gl={{
                    antialias: false,
                    depth: true,
                }}
                camera={{
                    fov: 25,
                    near: 1,
                    far: 750,
                    position: [0, 30, 60],
                }}
                className='canvas'
            >
                <ambientLight args={[0xeeeeee, 1.5]} />
                <directionalLight args={[0xffffff, 2]} castShadow position={[1, 1, 0.5]} />
                <WorldMesh action={action} ref={worldMeshRef} />
                <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshLambertMaterial color='#D3CD5F' />
                    <Edges />
                </mesh>
                <EffectComposer disableNormalPass>
                    <N8AO aoRadius={0.75} intensity={2.5} distanceFalloff={1} quality='high' halfRes />
                </EffectComposer>
            </Canvas>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'fixed',
                    gap: 8,
                    right: 10,
                    top: 80,
                    opacity: 0.8,
                }}
            >
                <div
                    className={
                        mapMode === MapModes.CAMERA_MODE ? 'camera-button-container active' : 'camera-button-container'
                    }
                    onClick={() => {
                        setMapMode(MapModes.CAMERA_MODE);
                    }}
                >
                    <CameraIcon width={40} height={40} />
                </div>
                <div
                    className={
                        mapMode === MapModes.TURTLE_MOVE_MODE
                            ? 'camera-button-container active'
                            : 'camera-button-container'
                    }
                    onClick={() => {
                        setMapMode(MapModes.TURTLE_MOVE_MODE);
                    }}
                >
                    <CarIcon width={40} height={40} />
                </div>
            </div>
        </>
    );
}

const WorldMesh = forwardRef(function WorldMesh({action}: {action: Action}, ref) {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const previousInstanceId = useRef<number | null>(null);
    const sphereMeshRef = useRef<InstancedMesh>(null!);
    const instancedMeshRef = useRef<InstancedMesh>(null!);
    const orbitControlsRef = useRef<threelib.OrbitControls>(null!);
    const mapModeRef = useRef<MapModes>(MapModes.CAMERA_MODE);
    const outlineMap = useLoader(TextureLoader, '/outline.png');

    useImperativeHandle(
        ref,
        () => {
            return {
                setMode(mapMode: MapModes) {
                    mapModeRef.current = mapMode;
                    switch (mapMode) {
                        case MapModes.CAMERA_MODE:
                            orbitControlsRef.current.enablePan = true;
                            orbitControlsRef.current.enableRotate = true;
                            orbitControlsRef.current.enableZoom = true;
                            sphereMeshRef.current.visible = false;
                            break;
                        case MapModes.TURTLE_MOVE_MODE:
                            orbitControlsRef.current.enablePan = false;
                            orbitControlsRef.current.enableRotate = false;
                            orbitControlsRef.current.enableZoom = false;
                            if (previousInstanceId.current !== null) {
                                sphereMeshRef.current.visible = true;
                            }
                            break;
                    }
                },
            };
        },
        []
    );

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

    // Only runs once!
    useEffect(() => {
        if (instancedMeshRef.current === null) return;

        for (let i = 0; i < matrixSize; i++) {
            const x = (i % matrixScale) - matrixScaleDiv;
            const z = (Math.floor(i / matrixScale) % matrixScale) - matrixScaleDiv;
            const y = Math.floor(i / matrixScalePow) - heightDiv;

            tempMatrix.setPosition(new Vector3(x, y, z));
            instancedMeshRef.current.setMatrixAt(i, tempMatrix);
        }

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }, [instancedMeshRef.current]);

    // Only runs once!
    useEffect(() => {
        if (sphereMeshRef.current === null) return;

        tempMatrix.setPosition(new Vector3(0, 1, 0));
        sphereMeshRef.current.setMatrixAt(0, tempMatrix);
        sphereMeshRef.current.instanceMatrix.needsUpdate = true;
    }, [sphereMeshRef.current]);

    useEffect(() => {
        if (!blocks) return;
        if (!turtle) return;
        if (!instancedMeshRef.current) return;

        const {x: tx, y: ty, z: tz} = turtle.location;
        for (let i = 0; i < matrixSize; i++) {
            const x = (i % matrixScale) - matrixScaleDiv;
            const z = (Math.floor(i / matrixScale) % matrixScale) - matrixScaleDiv;
            const y = Math.floor(i / matrixScalePow) - heightDiv;

            const pos = `${x + tx},${y + ty},${z + tz}`;
            const block = blocks[pos];
            if (block) {
                const {r, g, b} = SpriteTable[block.name]?.avg_color ?? {
                    r: 255,
                    g: 255,
                    b: 255,
                };

                // Set color
                tempColor.set(r / 255, g / 255, b / 255).toArray(colorArray.current, i * 4);

                // Set transparency
                colorArray.current[i * 4 + 3] = 1;
            } else {
                // Set color
                tempColor.set('#000').toArray(colorArray.current, i * 4);

                // Set transparency
                colorArray.current[i * 4 + 3] = 0;
            }
        }

        instancedMeshRef.current.geometry.attributes.color.needsUpdate = true;
    }, [blocks, turtle, instancedMeshRef.current]);

    const colorArray = useRef<Float32Array>(
        Float32Array.from(
            new Array(matrixSize).fill(undefined, undefined).flatMap(() => [...tempColor.set('#000').toArray(), 0])
        )
    );
    const sphereColorArray = useRef<Float32Array>(Float32Array.from([...tempColor.set('#D6D160').toArray(), 0.5]));

    useEffect(() => {
        const rotationTarget = (() => {
            switch (turtle?.direction) {
                case Direction.East:
                    return Math.PI / 2;
                case Direction.South:
                    return Math.PI;
                case Direction.West:
                    return Math.PI + Math.PI / 2;
                default:
                    return 0;
            }
        })();

        tempQuaternion.setFromAxisAngle(new Vector3(0, 1, 0), rotationTarget);

        if (!sphereMeshRef.current) return;
        sphereMeshRef.current.rotation.set(0, rotationTarget, 0);
    }, [turtle?.direction, sphereMeshRef.current]);

    useFrame((_state) => {
        if (!instancedMeshRef.current.quaternion.equals(tempQuaternion)) {
            instancedMeshRef.current.quaternion.rotateTowards(tempQuaternion, 0.027);
            instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <>
            <instancedMesh ref={sphereMeshRef} args={[undefined, undefined, 1]} receiveShadow>
                <boxGeometry>
                    <instancedBufferAttribute attach='attributes-color' args={[sphereColorArray.current, 4]} />
                </boxGeometry>
                <meshLambertMaterial attach='material' vertexColors transparent alphaTest={0.1} map={outlineMap} />
            </instancedMesh>
            <instancedMesh
                ref={instancedMeshRef}
                args={[undefined, undefined, matrixSize]}
                receiveShadow
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (!(e.intersections.length > 0)) return;

                    const targetIndex = e.intersections.findIndex((intersection) => {
                        const i = intersection.instanceId;
                        if (!i) return false;
                        return colorArray.current[i * 4 + 3] === 1;
                    });
                    if (targetIndex === -1) return;

                    const target = e.intersections[targetIndex];
                    const {instanceId} = target;
                    if (!instanceId) return;

                    let realInstanceId = instanceId;
                    while (
                        realInstanceId + matrixScalePow < matrixSize &&
                        colorArray.current[(realInstanceId + matrixScalePow) * 4 + 3] === 1
                    ) {
                        realInstanceId += matrixScalePow;
                    }

                    if (!(realInstanceId < matrixSize)) return;
                    if (realInstanceId === previousInstanceId.current) return;
                    if (previousInstanceId.current === null && mapModeRef.current === MapModes.TURTLE_MOVE_MODE) {
                        sphereMeshRef.current.visible = true;
                    }

                    previousInstanceId.current = realInstanceId;

                    const x = (realInstanceId % matrixScale) - matrixScaleDiv;
                    const y = (Math.floor(realInstanceId / matrixScale) % matrixScale) - matrixScaleDiv;
                    const z = Math.floor(realInstanceId / matrixScalePow) - heightDiv;

                    tempMatrix.setPosition(new Vector3(x, z + 1, y));
                    sphereMeshRef.current.setMatrixAt(0, tempMatrix);
                    sphereMeshRef.current.instanceMatrix.needsUpdate = true;
                }}
                onPointerLeave={(e) => {
                    e.stopPropagation();
                    previousInstanceId.current = null;
                    sphereMeshRef.current.visible = false;
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!(e.intersections.length > 0)) return;
                    if (!turtle) return;
                    if (mapModeRef.current !== MapModes.TURTLE_MOVE_MODE) return;

                    const targetIndex = e.intersections.findIndex((intersection) => {
                        const i = intersection.instanceId;
                        if (!i) return false;
                        return colorArray.current[i * 4 + 3] === 1;
                    });
                    if (targetIndex === -1) return;

                    const target = e.intersections[targetIndex];
                    const {instanceId} = target;
                    if (!instanceId) return;

                    let realInstanceId = instanceId;
                    while (
                        realInstanceId + matrixScalePow < matrixSize &&
                        colorArray.current[(realInstanceId + matrixScalePow) * 4 + 3] === 1
                    ) {
                        realInstanceId += matrixScalePow;
                    }

                    if (!(realInstanceId < matrixSize)) return;

                    const x = (realInstanceId % matrixScale) - matrixScaleDiv;
                    const y = (Math.floor(realInstanceId / matrixScale) % matrixScale) - matrixScaleDiv;
                    const z = Math.floor(realInstanceId / matrixScalePow) - heightDiv;
                    const {x: tx, y: ty, z: tz} = turtle.location;

                    action({
                        type: 'ACTION',
                        action: 'move',
                        data: {
                            serverId,
                            id: turtle.id,
                            x: x + tx,
                            y: z + ty + 1,
                            z: y + tz,
                        },
                    });
                }}
            >
                <boxGeometry>
                    <instancedBufferAttribute attach='attributes-color' args={[colorArray.current, 4]} />
                </boxGeometry>
                <meshLambertMaterial attach='material' vertexColors alphaTest={0.1} map={outlineMap} />
            </instancedMesh>
            <OrbitControls ref={orbitControlsRef} />
        </>
    );
});

export default Turtle3DMap;
