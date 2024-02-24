import {useState} from 'react';
import {Modal, Form, Button, Row, Col} from 'react-bootstrap';
import {Action} from '../../../App';
import {useParams} from 'react-router-dom';
import {Location, Turtle} from '../../../api/UseTurtle';
import {BlockNames} from '../mine/MinecraftBlockNames';
import TurtleMap, {DrawnArea} from '../TurtleMap';
import './BuildModal.css';

export interface BuildModalProps {
    turtle: Turtle;
    action: Action;
    hideModal: () => void;
}

function BuildModal(props: BuildModalProps) {
    const {serverId} = useParams() as {serverId: string};
    const {turtle, action, hideModal} = props;
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [buildingBlock, setBuildingBlock] = useState('');
    const [fromYLevel, setFromYLevel] = useState(turtle.location.y);
    const [toYLevel, setToYLevel] = useState(turtle.location.y);
    const [createdArea, setCreatedArea] = useState<Omit<Location, 'y'>[]>([]);
    const [drawnArea, setDrawnArea] = useState<DrawnArea>({});

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({
                type: 'ACTION',
                action: 'build',
                data: {
                    serverId,
                    id: turtle.id,
                    area: createdArea.sort((a, b) => {
                        if (a.x < b.x) {
                            return -1;
                        } else if (a.x > b.x) {
                            return 1;
                        } else if (a.z < b.z) {
                            return -1;
                        } else if (a.z > b.z) {
                            return 1;
                        }

                        return 0;
                    }),
                    fromYLevel,
                    toYLevel,
                    buildingBlock,
                },
            });
            hideModal();
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    const createdAreaLength = Object.keys(createdArea).length;
    return (
        <Modal show={true} onHide={() => hideModal()}>
            <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Building</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className='mb-3'>
                        <Form.Label className='me-0 pe-0' sm={5} column>
                            The turtle should place down
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={7}>
                            <Form.Control
                                value={buildingBlock}
                                type='text'
                                list='blocks'
                                onChange={(e) => setBuildingBlock(e.target.value)}
                                required
                            />
                            <datalist id='blocks'>
                                {BlockNames.map((name, i) => (
                                    <option key={i}>{name}</option>
                                ))}
                            </datalist>
                        </Col>
                    </Row>
                    <Row className='mb-3'>
                        <Form.Label className='me-0 pe-0' sm={3} column>
                            from y-level
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={3}>
                            <Form.Control
                                value={fromYLevel}
                                onChange={(e) => setFromYLevel(Number(e.target.value))}
                                type='number'
                                required
                            />
                        </Col>
                        <Form.Label className='me-0 pe-0' sm={1} column>
                            to
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={3}>
                            <Form.Control
                                value={toYLevel}
                                onChange={(e) => setToYLevel(Number(e.target.value))}
                                type='number'
                                required
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Form.Label className='me-0 pe-0 text-secondary' sm={12} column>
                            on the marked area on the map
                        </Form.Label>
                    </Row>
                    <Row className='mb-3'>
                        <Col md='auto'>
                            <TurtleMap
                                drawnArea={drawnArea}
                                setDrawnArea={setDrawnArea}
                                setTranslatedDrawnArea={setCreatedArea}
                            />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Btn disabled={createdAreaLength < 1} variant='outline-success' type='submit'>
                        {createdAreaLength < 1 ? '(draw area on map)' : 'Build'}
                    </Btn>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default BuildModal;
