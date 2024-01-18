import {useState} from 'react';
import {Modal, Form, Button, Row, Col} from 'react-bootstrap';
import {Action} from '../../../App';
import {useParams} from 'react-router-dom';
import {Turtle} from '../../../api/UseTurtle';
import './MineModal.css';
import MineAreaMap from './MineAreaMap';

export interface MineModalProps {
    turtle: Turtle;
    action: Action;
    hideModal: () => void;
}

export interface CreatedArea {
    [key: string]: {
        x: number;
        y: number;
    };
}

const spriteSize = 8;
const spriteRadius = 0.5 * spriteSize;

function MineModal(props: MineModalProps) {
    const {serverId} = useParams() as {serverId: string};
    const {turtle, action, hideModal} = props;
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [createdArea, setCreatedArea] = useState({} as CreatedArea);
    const [miningType, setMiningType] = useState<number>(1);
    const [fromYLevel, setFromYLevel] = useState(turtle.location.y);
    const [toYLevel, setToYLevel] = useState(-58);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            const {x, z} = turtle.location;
            action({
                type: 'ACTION',
                action: miningType === 3 ? 'extract' : 'mine',
                data: {
                    serverId,
                    id: turtle.id,
                    area: Object.keys(createdArea)
                        .map((key) => {
                            const tempX = (createdArea[key].x + spriteRadius - 336 * 0.5) / spriteSize + x;
                            const tempZ = (createdArea[key].y + spriteRadius - 336 * 0.5) / spriteSize + z;
                            return {x: tempX, z: tempZ};
                        })
                        .sort((a, b) => {
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
                },
            });
            hideModal();
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    const createdAreaLength = Object.keys(createdArea).length;
    return (
        <Modal show={true} onHide={() => hideModal()}>
            <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Mining</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className='mb-3'>
                        <Form.Label className='me-0 pe-0' sm={4} column>
                            The turtle should
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={8}>
                            <Form.Control
                                value={miningType}
                                onChange={(e) => setMiningType(Number(e.target.value))}
                                as='select'
                                required
                            >
                                <option value={1}>mine all blocks</option>
                                <option value={3}>extract all ores</option>
                            </Form.Control>
                            {miningType === 3 &&
                            (turtle.peripherals == null ||
                                !Object.values(turtle.peripherals).some(({types}) => types.includes('geoScanner'))) ? (
                                <div className='text-danger'>* requires a Geo Scanner</div>
                            ) : null}
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
                            within the marked area on the map
                        </Form.Label>
                    </Row>
                    <Row className='mb-3'>
                        <MineAreaMap createdArea={createdArea} setCreatedArea={setCreatedArea} />
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button disabled={createdAreaLength < 1} variant='outline-success' type='submit'>
                        {createdAreaLength < 1 ? '(draw area on map)' : 'Mine'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default MineModal;
