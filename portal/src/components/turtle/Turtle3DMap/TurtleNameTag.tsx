/* eslint-disable react/no-unknown-property */
import {useFrame} from '@react-three/fiber';
import {useEffect, useState} from 'react';
import {extend} from '@react-three/fiber';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry';
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader';
import {BoxGeometry, Color, Group, Mesh, MeshBasicMaterial} from 'three';

extend({TextGeometry});

type Props = {
    position: [number, number, number];
    text: string;
};

function TurtleNameTag({position, text}: Props) {
    const [group, setGroup] = useState<Group>(null!);

    useEffect(() => {
        const loader = new FontLoader();
        loader.load('/fonts/pixelify_sans_medium.json', function (font) {
            const textGeometry = new TextGeometry(text, {
                font: font,
                size: 0.2,
                height: 0.05,
            });

            textGeometry.computeBoundingBox();
            const boundingBox = textGeometry.boundingBox;
            let textWidth = 0;
            if (boundingBox != null) {
                textWidth = boundingBox.max.x - boundingBox.min.x;
            } else {
                textWidth = 0.146 * text.length;
            }

            textGeometry.translate(-textWidth / 2, 0, 0);

            const textMaterial = new MeshBasicMaterial({
                color: new Color('white'),
                depthTest: false,
                depthWrite: false,
            });
            const textMesh = new Mesh(textGeometry, textMaterial);

            const boxGeometry = new BoxGeometry(textWidth + 0.1, 0.28, 0.01);
            const boxMaterial = new MeshBasicMaterial({
                color: new Color('black'),
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false,
            });
            const boxMesh = new Mesh(boxGeometry, boxMaterial);
            boxMesh.position.set(0.03, 0.1, 0);

            const group = new Group();
            group.add(textMesh);
            group.add(boxMesh);
            setGroup(group);
        });
    }, [text]);

    useFrame(({camera}) => {
        if (group == null) return;

        group.lookAt(camera.position);
    });

    return group ? <primitive object={group} position={position} /> : null;
}

export default TurtleNameTag;
