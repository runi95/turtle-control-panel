import {useState} from 'react';
import {Modal, Form, Button, Row, Col} from 'react-bootstrap';
import './GrabcraftModal.css';
import {httpServerUrl} from '../../../api';
import {useAtlasMap} from '../Turtle3DMap/TextureAtlas';
import {Block} from '../../../App';

const jaroWinklerDistance = (a: string, b: string): number => {
    const matches = (() => {
        const bound = Math.floor(Math.max(a.length, b.length) / 2) - 1;
        const matched = [];
        let matches = 0;
        for (let i = 0; i < a.length; i++) {
            for (let j = Math.max(0, i - bound); j <= Math.min(b.length, i + bound); j++) {
                if (a[i] === b[j] && !matched[j]) {
                    matched[j] = true;
                    matches++;
                    break;
                }
            }
        }

        return matches;
    })();

    if (matches > 0) {
        const transpositions = (() => {
            const bound = Math.max(a.length, b.length);

            let aMatches = '';
            const aMatched = [];
            for (let i = 0; i < a.length; i++) {
                for (let j = Math.max(0, i - bound); j <= Math.min(b.length, i + bound); j++) {
                    if (a[i] === b[j] && !aMatched[j]) {
                        aMatches += a[i];
                        aMatched[j] = true;
                        break;
                    }
                }
            }

            let bMatches = '';
            const bMatched = [];
            for (let i = 0; i < b.length; i++) {
                for (let j = Math.max(0, i - bound); j <= Math.min(a.length, i + bound); j++) {
                    if (b[i] === a[j] && !bMatched[j]) {
                        bMatches += b[i];
                        bMatched[j] = true;
                        break;
                    }
                }
            }

            let transpositions = 0;
            for (let i = 0; i < aMatches.length; i++) {
                if (aMatches[i] !== bMatches[i]) transpositions++;
            }

            return Math.floor(transpositions / 2);
        })();

        const similarity = (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
        if (similarity < 0.7) return similarity;

        const prefix = (() => {
            for (let i = 0; i < a.length && i < b.length; i++) {
                if (a[i] !== b[i]) return i;
            }

            return Math.min(a.length, b.length);
        })();
        return similarity + prefix * 0.1 * (1 - similarity);
    }

    return 0;
};

// const levenshteinDistance = (a: string, b: string): number => {
//     const arr = [];
//     for (let i = 0; i <= b.length; i++) {
//         arr[i] = [i];
//         for (let j = 1; j <= a.length; j++) {
//             arr[i][j] =
//                 i === 0
//                     ? j
//                     : Math.min(
//                           arr[i - 1][j] + 1,
//                           arr[i][j - 1] + 1,
//                           arr[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
//                       );
//         }
//     }

//     return arr[b.length][a.length];
// };

type Props = {
    hideModal: () => void;
    onBuild: (blocks: Omit<Block, 'state' | 'tags'>[]) => void;
};

type BuildData = {
    image: string | null;
    blocks: Omit<Block, 'state' | 'tags'>[];
};

type RenderObject = {
    [key: number]: {
        [key: number]: {
            [key: number]: {
                name: string;
            };
        };
    };
};

function GrabcraftModal({hideModal, onBuild}: Props) {
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [grabcraftUrl, setGrabcraftUrl] = useState<string>('');
    const [buildData, setBuildData] = useState<BuildData | null>(null);
    const {data: atlasMap} = useAtlasMap();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            setIsLoading(true);
            fetch(`${httpServerUrl}/grabcraft?url=${encodeURIComponent(grabcraftUrl)}`)
                .then((res) => res.text())
                .then((body) => {
                    const doc = new DOMParser().parseFromString(body, 'text/html');

                    let image: string | null = null;
                    const mainPictures = doc.getElementById('main_pics');
                    if (mainPictures != null) {
                        const pictureChild = mainPictures.firstElementChild as HTMLLinkElement;
                        if (pictureChild != null && pictureChild.href != null) {
                            image = pictureChild.href;
                        }
                    }

                    const scripts = doc.getElementsByTagName('script');
                    let myRenderObjectScript = null;
                    for (const script of scripts) {
                        const {src} = script;
                        if (src == null) continue;
                        if (src.includes('RenderObject/myRenderObject')) {
                            myRenderObjectScript = script;
                            break;
                        }
                    }
                    if (myRenderObjectScript == null) throw new Error('Failed to fetch render object');

                    return fetch(`${httpServerUrl}/grabcraft?url=${encodeURIComponent(myRenderObjectScript.src)}`)
                        .then((res) => res.text())
                        .then((body) => JSON.parse(body.substring(21)) as RenderObject)
                        .then((renderObject) => ({
                            image,
                            renderObject,
                        }));
                })
                .then(({image, renderObject}) => {
                    const blocks: Omit<Block, 'state' | 'tags'>[] = [];
                    const grabcraftNameToBlockNameMap = new Map<string, string>();

                    let largestX = 0;
                    let largestZ = 0;
                    for (const y in renderObject) {
                        for (const x in renderObject[y]) {
                            for (const z in renderObject[y][x]) {
                                const {name: grabcraftName} = renderObject[y][x][z];
                                const grabcraftNameLowered = grabcraftName.toLowerCase().replaceAll(' ', '_');

                                // Always skip layer 1 Dirt as it's not part of the actual build
                                if (y === '1' && grabcraftName === 'Dirt') continue;
                                if (y === '1' && grabcraftName === 'Still Water') continue;
                                if (grabcraftName === 'Grass') continue;
                                if (grabcraftName === 'Water') continue;

                                const name = (() => {
                                    const blockName = grabcraftNameToBlockNameMap.get(grabcraftNameLowered);
                                    if (blockName != null) {
                                        return blockName;
                                    }

                                    if (atlasMap == null) return null;
                                    let currentBestMatch = 0;
                                    let bestStringMatch: string | null = null;
                                    for (const texture in atlasMap.textures) {
                                        if (texture === 'unknown') continue;

                                        const split = texture.split(':');
                                        if (split.length !== 2) continue;
                                        if (split[0] !== 'minecraft') continue;

                                        const distance = jaroWinklerDistance(grabcraftNameLowered, split[1]);
                                        if (distance > currentBestMatch) {
                                            currentBestMatch = distance;
                                            bestStringMatch = texture;
                                        }
                                    }

                                    if (bestStringMatch == null) return null;

                                    grabcraftNameToBlockNameMap.set(grabcraftNameLowered, bestStringMatch);
                                    return bestStringMatch;
                                })();

                                const parsedX = Number(x);
                                const parsedY = Number(y);
                                const parsedZ = Number(z);
                                if (parsedX > largestX) {
                                    largestX = parsedX;
                                }

                                if (parsedZ > largestZ) {
                                    largestZ = parsedZ;
                                }

                                blocks.push({
                                    x: parsedX,
                                    y: parsedY - 1,
                                    z: parsedZ,
                                    name: name == null ? 'minecraft:dirt' : name,
                                });
                            }
                        }
                    }

                    const xOffset = Math.floor(largestX / 2);
                    const zOffset = Math.floor(largestZ / 2);
                    setBuildData({
                        image,
                        blocks: blocks.map(({x, y, z, name}) => ({
                            x: x - xOffset,
                            y,
                            z: z - zOffset,
                            name,
                        })),
                    });
                })
                .catch((err) => {
                    console.error(err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    return (
        <Modal show={true} onHide={() => hideModal()}>
            <Modal.Header closeButton>
                <Modal.Title>Building</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form validated={isFormValidated} onSubmit={handleFormSubmit}>
                    <Row className='mb-3'>
                        <Form.Label className='me-0 pe-0' sm={2} column>
                            URL:
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={10}>
                            <Form.Control
                                value={grabcraftUrl}
                                placeholder='https://www.grabcraft.com/minecraft/fantasy-steampunk-house-6'
                                type='text'
                                onChange={(e) => setGrabcraftUrl(e.target.value)}
                                required
                                pattern='^https://(?:www.)?grabcraft.com/minecraft/.+'
                            />
                        </Col>
                    </Row>
                    <Row className='mb-3'>
                        <Btn variant='outline-success' type='submit' disabled={isLoading || buildData != null}>
                            Load
                        </Btn>
                    </Row>
                    {buildData != null ? (
                        <Row>{buildData.image != null ? <img src={buildData.image} /> : null}</Row>
                    ) : null}
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Btn variant='outline-secondary' onClick={() => hideModal()}>
                    Cancel
                </Btn>
                <Btn
                    variant='outline-success'
                    onClick={() => {
                        if (buildData != null) {
                            onBuild(buildData.blocks);
                        }
                    }}
                    disabled={buildData == null}
                >
                    Place
                </Btn>
            </Modal.Footer>
        </Modal>
    );
}

export default GrabcraftModal;
