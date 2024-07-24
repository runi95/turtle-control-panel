import {useState} from 'react';
import {Modal, Form, Button, Row, Col, CloseButton} from 'react-bootstrap';
import {Action} from '../../../App';
import {useParams} from 'react-router-dom';
import {Location, Turtle} from '../../../api/UseTurtle';
import './MineModal.css';
import {BlockNames} from './MinecraftBlockNames';

export interface MineModalProps {
    turtle: Turtle;
    action: Action;
    hideModal: () => void;
    createdArea: Location[];
}

function MineModal({turtle, action, hideModal, createdArea}: MineModalProps) {
    const {serverId} = useParams() as {serverId: string};
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [miningType, setMiningType] = useState<number>(1);
    const [includeOrExclude, setIncludeOrExclude] = useState<number>(1);
    const [includeOrExcludeList, setIncludeOrExcludeList] = useState<string[]>([]);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({
                type: 'ACTION',
                action: miningType === 3 ? 'extract' : 'mine',
                data: {
                    serverId,
                    id: turtle.id,
                    area: createdArea.sort((a, b) => {
                        if (a.y < b.y) {
                            return -1;
                        } else if (a.y > b.y) {
                            return 1;
                        } else if (a.x < b.x) {
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
                    isExcludeMode: includeOrExclude === 1,
                    includeOrExcludeList,
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
                        <Col className='ms-0 ps-0' sm={5}>
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
                                !Object.values(turtle.peripherals).some(
                                    ({types}) =>
                                        types.includes('geoScanner') ||
                                        types.includes('plethora:scanner') ||
                                        types.includes('universal_scanner')
                                )) ? (
                                <div className='text-danger'>* requires a scanner</div>
                            ) : null}
                        </Col>
                        <Col className='ms-0 ps-0' sm={3}>
                            <Form.Control
                                value={includeOrExclude}
                                onChange={(e) => setIncludeOrExclude(Number(e.target.value))}
                                as='select'
                                required
                            >
                                <option value={1}>except for</option>
                                <option value={2}>with name</option>
                            </Form.Control>
                            <Btn
                                variant='link'
                                size='sm'
                                onClick={() => {
                                    setIncludeOrExcludeList((prev) => [...prev, '']);
                                }}
                            >
                                {includeOrExclude === 1 ? 'add exception' : 'add name'}
                            </Btn>
                        </Col>
                    </Row>
                    <Row className='mb-3'>
                        <Col className='offset-md-3'>
                            {includeOrExcludeList.map((value, index) => (
                                <Row className='mb-3' key={index}>
                                    <Col sm={1}>
                                        <CloseButton
                                            className='shadow-none'
                                            aria-label='Remove'
                                            onClick={() => {
                                                setIncludeOrExcludeList((prev) => prev.filter((_, i) => i !== index));
                                            }}
                                        />
                                    </Col>
                                    <Col sm={11}>
                                        <Form.Control
                                            value={value}
                                            type='text'
                                            list='blocks'
                                            onChange={(e) =>
                                                setIncludeOrExcludeList((prev) =>
                                                    prev.map((prevVal, i) => (i === index ? e.target.value : prevVal))
                                                )
                                            }
                                        />
                                    </Col>
                                </Row>
                            ))}
                            <datalist id='blocks'>
                                {BlockNames.map((name, i) => (
                                    <option key={i}>{name}</option>
                                ))}
                            </datalist>
                        </Col>
                    </Row>
                    <Row>
                        <Form.Label className='me-0 pe-0 text-secondary' sm={12} column>
                            within the marked area on the map
                        </Form.Label>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Btn variant='outline-success' type='submit'>
                        Mine
                    </Btn>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default MineModal;
