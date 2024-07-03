import {useState} from 'react';
import {Modal, Form, Button, Row, Col} from 'react-bootstrap';
import './GrabcraftModal.css';
import {httpServerUrl} from '../../../api';
import {Block} from '../../../App';
import {grabcraftNameToBlockMap} from './GrabcraftBlockNames';

const levenshteinDistance = (a: string, b: string): number => {
    const arr = [];
    for (let i = 0; i <= b.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= a.length; j++) {
            arr[i][j] =
                i === 0
                    ? j
                    : Math.min(
                          arr[i - 1][j] + 1,
                          arr[i][j - 1] + 1,
                          arr[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
                      );
        }
    }

    return arr[b.length][a.length];
};

type Props = {
    hideModal: () => void;
    onBuild: (blocks: Omit<Block, 'tags'>[]) => void;
};

type BuildData = {
    image: string | null;
    blocks: Omit<Block, 'tags'>[];
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
                    const blocks: Omit<Block, 'tags'>[] = [];
                    const grabcraftNameToBlockNameMap = new Map<string, string>();

                    let largestX = 0;
                    let largestZ = 0;
                    const mapKeys = Object.keys(grabcraftNameToBlockMap);
                    const grabcraftNameRegexp = new RegExp('([\\d\\w-_ ]+) ?(\\([^)]+\\))?');
                    for (const y in renderObject) {
                        for (const x in renderObject[y]) {
                            for (const z in renderObject[y][x]) {
                                const capturedGrabcraftName = grabcraftNameRegexp.exec(renderObject[y][x][z].name);
                                if (capturedGrabcraftName == null) continue;
                                if (capturedGrabcraftName.length < 2) continue;

                                const grabcraftName = capturedGrabcraftName[1];

                                // Always skip layer 1 Dirt as it's not part of the actual build
                                if (y === '1' && grabcraftName === 'Dirt') continue;
                                if (y === '1' && grabcraftName === 'Still Water') continue;
                                if (grabcraftName === 'Air') continue;
                                if (grabcraftName === 'Grass') continue;
                                if (grabcraftName === 'Water') continue;

                                const name = (() => {
                                    const blockName = grabcraftNameToBlockNameMap.get(grabcraftName);
                                    if (blockName != null) {
                                        return blockName;
                                    }

                                    let currentBestMatch = Number.MAX_VALUE;
                                    let bestStringMatch: string | null = null;
                                    for (const key of mapKeys) {
                                        const distance = levenshteinDistance(grabcraftName, key);
                                        if (distance < currentBestMatch) {
                                            currentBestMatch = distance;
                                            bestStringMatch = grabcraftNameToBlockMap[key];
                                        }
                                    }

                                    if (bestStringMatch == null) return null;

                                    grabcraftNameToBlockNameMap.set(grabcraftName, bestStringMatch);
                                    return bestStringMatch;
                                })();

                                const state = (() => {
                                    const blockState: {
                                        [key: string]: string;
                                    } = {};
                                    if (capturedGrabcraftName.length < 3) return blockState;
                                    const grabcraftCapturedState = capturedGrabcraftName[2];
                                    if (grabcraftCapturedState == null) return blockState;

                                    let facing: 'north' | 'east' | 'south' | 'west' | null = null;
                                    const split = grabcraftCapturedState
                                        .substring(1, grabcraftCapturedState.length - 1)
                                        .split(',');
                                    for (const grabcraftState of split) {
                                        switch (grabcraftState.toLowerCase().trim()) {
                                            case 'north':
                                                facing = 'north';
                                                break;
                                            case 'east':
                                                facing = 'east';
                                                break;
                                            case 'south':
                                                facing = 'south';
                                                break;
                                            case 'west':
                                                facing = 'west';
                                                break;
                                        }
                                    }

                                    if (facing != null) {
                                        blockState['facing'] = facing;
                                    }

                                    return blockState;
                                })() as {
                                    [key: string]: string;
                                };

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
                                    state,
                                });
                            }
                        }
                    }

                    const xOffset = Math.floor(largestX / 2);
                    const zOffset = Math.floor(largestZ / 2);
                    setBuildData({
                        image,
                        blocks: blocks.map(({x, y, z, name, state}) => ({
                            x: x - xOffset,
                            y,
                            z: z - zOffset,
                            name,
                            state,
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
