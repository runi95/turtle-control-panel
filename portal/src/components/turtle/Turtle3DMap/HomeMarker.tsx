/* eslint-disable react/no-unknown-property */
import {useGLTF} from '@react-three/drei';
import {GroupProps, useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import {Color, Mesh, MeshBasicMaterial} from 'three';

export default function HomeMarker(props?: GroupProps) {
    const meshRef = useRef<Mesh>(null!);
    const {nodes} = useGLTF('/models/home_marker.gltf');

    useFrame(({clock}) => {
        if (meshRef.current == null) return;

        meshRef.current.position.y = 0.1 * Math.sin(clock.getElapsedTime());
    });

    return (
        <group dispose={null} {...props}>
            <mesh
                ref={meshRef}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                geometry={(nodes.Marker as any).geometry}
                material={
                    new MeshBasicMaterial({
                        color: new Color(0.56, 0.55, 0.05),
                        opacity: 0.8,
                        transparent: true,
                    })
                }
            />
        </group>
    );
}

useGLTF.preload('/models/home_marker.gltf');
