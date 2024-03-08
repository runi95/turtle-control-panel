import {useEffect, useMemo} from 'react';
import {FrontSide, PlaneGeometry, ShaderMaterial, Vector3} from 'three';
import {fragmentShader, vertexShader} from './CustomShader';
import {useAtlas, useAtlasMap} from './TextureAtlas';
import SparseBlock from './SparseBlock';
import {Blocks} from '../../../App';
import {Turtle} from '../../../api/UseTurtle';

interface Props {
    turtle: Turtle;
    chunkSize: number;
    visibleChunkRadius: number;
    blocks: Blocks;
}

function World(props: Props) {
    const {turtle, chunkSize, visibleChunkRadius, blocks} = props;
    const cellDimensions = useMemo(() => new Vector3(chunkSize, chunkSize, chunkSize), [chunkSize]);
    const visibleDimensions = [visibleChunkRadius, visibleChunkRadius];
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

    const offsets = useMemo(() => {
        const BlockIndex = (xp: number, zp: number) => {
            const x = Math.floor(xp / cellDimensions.x);
            const z = Math.floor(zp / cellDimensions.z);
            return [x, z];
        };

        // TODO: BlockIndex args should not be hardcoded! (should maybe be turtle location instead?)
        const cellIndex = BlockIndex(0, 0);

        const xs = visibleDimensions[0];
        const zs = visibleDimensions[1];
        const cells = new Map<string, [number, number]>();

        for (let x = -xs; x <= xs; x++) {
            for (let z = -zs; z <= zs; z++) {
                const xi = x + cellIndex[0];
                const zi = z + cellIndex[1];
                cells.set(`${xi},0,${zi}`, [xi, zi]);
            }
        }

        const sortedDifference: [number, string, [number, number]][] = [];
        for (const [key, cell] of cells) {
            const [xi, zi] = cell;
            const d = ((cellIndex[0] - xi) ** 2 + (cellIndex[1] - zi) ** 2) ** 0.5;
            sortedDifference.push([d, key, cell]);
        }

        sortedDifference.sort((a, b) => {
            return a[0] - b[0];
        });

        const offsets = [];
        for (let i = 0; i < sortedDifference.length; ++i) {
            const [xi, zi] = sortedDifference[i][2];
            const offset = new Vector3(xi * cellDimensions.x, 0, zi * cellDimensions.z);

            offsets.push(offset);
        }

        return offsets;
    }, [cellDimensions, visibleDimensions]);

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
    return offsets.map((offset, i) => (
        <SparseBlock
            key={i}
            location={turtle.location}
            dimensions={cellDimensions}
            offset={offset}
            geometries={geometries}
            atlasMap={atlasMap}
            materialOpaque={shaderMaterial}
            blocks={blocks}
        />
    ));
}

export default World;
