/* eslint-disable react/no-unknown-property */
import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef} from 'react';
import {
    Color,
    InstancedMesh,
    Matrix4,
    TextureLoader,
    FrontSide,
    PlaneGeometry,
    ShaderMaterial,
    Vector3,
    Group,
} from 'three';
import {fragmentShader, vertexShader} from './CustomShader';
import {useAtlas, useAtlasMap} from './TextureAtlas';
import SparseBlock from './SparseBlock';
import {Direction, useTurtle} from '../../../api/UseTurtle';
import {useLoader} from '@react-three/fiber';
import {useParams} from 'react-router-dom';
import {useWebSocket} from '../../../api/UseWebSocket';
import Turtle3D from './Turtle3D';

const mathematicalModulo = (a: number, b: number) => {
    const quotient = Math.floor(a / b);
    return a - quotient * b;
};

export interface WorldChunk {
    x: number;
    y: number;
    z: number;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
}

interface Props {
    chunkSize: number;
    visibleChunkRadius: number;
}

export type WorldHandle = {
    setMoveState: (moveState: boolean) => void;
};

const World = forwardRef<WorldHandle, Props>(function World(props: Props, ref) {
    const {chunkSize, visibleChunkRadius} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {data: turtle} = useTurtle(serverId, id);
    const {action} = useWebSocket();
    const groupRef = useRef<Group>(null!);
    const canMoveTurtleRef = useRef(false);
    const moveTurtleMeshRef = useRef<InstancedMesh>(null!);
    const outlineMap = useLoader(TextureLoader, '/outline.png');
    const moveTurtleColorArray = useRef<Float32Array>(Float32Array.from([...new Color('#D6D160').toArray(), 0.5]));
    const previousFaceIndex = useRef<number | null>(null);
    const tempMatrix = useMemo(() => new Matrix4(), []);
    const cellDimensions = useMemo(() => new Vector3(chunkSize, chunkSize, chunkSize), [chunkSize]);
    const visibleDimensions = [visibleChunkRadius, visibleChunkRadius];

    useImperativeHandle(
        ref,
        () => {
            return {
                setMoveState(moveState: boolean) {
                    canMoveTurtleRef.current = moveState;
                    if (!moveState) {
                        previousFaceIndex.current = null;
                        moveTurtleMeshRef.current.visible = false;
                    }
                },
            };
        },
        []
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
    const {data: atlasMap} = useAtlasMap();

    useEffect(() => {
        if (!atlas) return;
        shaderMaterial.uniforms.diffuseMap.value = atlas;
    }, [atlas]);

    const location = turtle?.location ?? null;
    const chunks = useMemo(() => {
        if (location == null) return [];

        const {x, y, z} = location;
        const chunkX = Math.floor(x / cellDimensions.x);
        const chunkY = Math.floor(y / cellDimensions.y);
        const chunkZ = Math.floor(z / cellDimensions.z);
        const chunks: WorldChunk[] = [];

        const xs = visibleDimensions[0];
        const ys = 1;
        const zs = visibleDimensions[1];

        for (let x = -xs; x <= xs; x++) {
            for (let z = -zs; z <= zs; z++) {
                for (let y = -ys; y <= ys; y++) {
                    chunks.push({
                        x: chunkX + x,
                        y: chunkY + y,
                        z: chunkZ + z,
                        offsetX: x * cellDimensions.x,
                        offsetY: y * cellDimensions.y,
                        offsetZ: z * cellDimensions.z,
                    });
                }
            }
        }

        return chunks;
    }, [location, cellDimensions, visibleDimensions]);

    const geometries = useMemo(() => {
        const pxGeometry = new PlaneGeometry(1, 1);
        pxGeometry.rotateY(Math.PI / 2);
        pxGeometry.translate(0.5, 0, 0);

        const nxGeometry = new PlaneGeometry(1, 1);
        nxGeometry.rotateY(-Math.PI / 2);
        nxGeometry.translate(-0.5, 0, 0);

        const pyGeometry = new PlaneGeometry(1, 1);
        pyGeometry.rotateX(-Math.PI / 2);
        pyGeometry.translate(0, 0.5, 0);

        const nyGeometry = new PlaneGeometry(1, 1);
        nyGeometry.rotateX(Math.PI / 2);
        nyGeometry.translate(0, -0.5, 0);

        const pzGeometry = new PlaneGeometry(1, 1);
        pzGeometry.translate(0, 0, 0.5);

        const nzGeometry = new PlaneGeometry(1, 1);
        nzGeometry.rotateY(Math.PI);
        nzGeometry.translate(0, 0, -0.5);

        const geometriesToInvert = [pxGeometry, nxGeometry, pzGeometry, nzGeometry];
        for (const geometry of geometriesToInvert) {
            for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
                geometry.attributes.uv.array[i + 1] = 1.0 - geometry.attributes.uv.array[i + 1];
            }
        }

        return [pxGeometry, nxGeometry, pyGeometry, nyGeometry, pzGeometry, nzGeometry];
    }, []);

    if (atlasMap == null) return null;
    if (turtle == null) return null;

    const turtleRotation = (() => {
        switch (turtle.direction) {
            case Direction.North:
                return 1.5 * Math.PI;
            case Direction.East:
                return Math.PI;
            case Direction.South:
                return Math.PI * 0.5;
            case Direction.West:
                return 0;
        }
    })();

    return (
        <>
            <group rotation={[0, turtleRotation, 0]}>
                <Turtle3D geometries={geometries} atlasMap={atlasMap} materialOpaque={shaderMaterial} />
            </group>
            <instancedMesh ref={moveTurtleMeshRef} args={[undefined, undefined, 1]} visible={false} receiveShadow>
                <boxGeometry>
                    <instancedBufferAttribute attach='attributes-color' args={[moveTurtleColorArray.current, 4]} />
                </boxGeometry>
                <meshLambertMaterial attach='material' vertexColors transparent alphaTest={0.1} map={outlineMap} />
            </instancedMesh>
            <group
                ref={groupRef}
                position={[
                    -mathematicalModulo(turtle.location.x, cellDimensions.x),
                    -mathematicalModulo(turtle.location.y, cellDimensions.y),
                    -mathematicalModulo(turtle.location.z, cellDimensions.z),
                ]}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (!canMoveTurtleRef.current) return;
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
                    if (!canMoveTurtleRef.current) return;
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
                            serverId: turtle.serverId,
                            id: turtle.id,
                            x: vx + tx,
                            y: vy + ty,
                            z: vz + tz,
                        },
                    });
                }}
            >
                {chunks.map((chunk) => (
                    <SparseBlock
                        key={`${chunk.x},${chunk.y},${chunk.z}`}
                        dimensions={cellDimensions}
                        chunk={chunk}
                        geometries={geometries}
                        atlasMap={atlasMap}
                        materialOpaque={shaderMaterial}
                    />
                ))}
            </group>
        </>
    );
});

export default World;
