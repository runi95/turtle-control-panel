import {useState} from 'react';
import {Button, Col, Form, InputGroup, Modal, Row} from 'react-bootstrap';
import TurtleMap, {DrawnArea} from './TurtleMap';
import styled from 'styled-components';
import {Location, Turtle} from '../../api/UseTurtle';
import {Action} from '../../App';
import {useParams} from 'react-router-dom';
import {useChunk} from '../../api/UseChunk';
import ItemSprite from './ItemSprite';

const colors = ['#ff0000', '#ff6a00', '#ffd800', '#4cff00', '#00ffff', '#0094ff', '#0026ff', '#b200ff', '#ff006e'];

export interface InventoryMapProps {
    turtle: Turtle;
    action: Action;
}

function InventoryMap(props: InventoryMapProps) {
    const {turtle, action} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const [isModalShown, setIsModalShown] = useState(false);
    const [areaName, setAreaName] = useState('');
    const [yLevel, setYLevel] = useState<number>(turtle.location?.y ?? 0);
    const [upperYLevel, setUpperYLevel] = useState<number>(turtle.location?.y ?? 0);
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [createdArea, setCreatedArea] = useState<Omit<Location, 'y'>[]>([]);
    const [isCreatingArea, setIsCreatingArea] = useState(false);
    const [drawnArea, setDrawnArea] = useState<DrawnArea>({});

    const chunkX = turtle !== undefined ? Math.floor(turtle.location?.x / 16) : 0;
    const chunkZ = turtle !== undefined ? Math.floor(turtle.location?.z / 16) : 0;
    const {data: chunk} = useChunk(serverId, chunkX, chunkZ);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsFormValidated(true);
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            const minYLevel = Math.min(yLevel, upperYLevel);
            const maxYLevel = Math.max(yLevel, upperYLevel);
            const area: Location[] = [];
            const sortedCreatedArea = [...createdArea].sort((a, b) => {
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
            });
            for (let i = minYLevel; i <= maxYLevel; i++) {
                for (const areaLocation of sortedCreatedArea) {
                    area.push({
                        x: areaLocation.x,
                        y: i,
                        z: areaLocation.z,
                    });
                }
            }
            action({
                type: 'AREA',
                action: 'create',
                data: {
                    serverId,
                    name: areaName,
                    color: selectedColor,
                    area,
                },
            });
            setDrawnArea({});
            setIsCreatingArea(false);
            setIsModalShown(false);
            setAreaName('');
            setIsFormValidated(false);
        } else {
            e.stopPropagation();
        }
    };

    return (
        <>
            <Modal show={isModalShown} onHide={() => setIsModalShown(false)}>
                <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>Create New Area</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className='mb-2'>
                            <Form.Label>Area name</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    required
                                    type='text'
                                    placeholder='name'
                                    value={areaName}
                                    onChange={(e) => setAreaName(e.target.value)}
                                />
                                <Form.Control.Feedback type='invalid'>
                                    Please enter a non-empty name
                                </Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className='mb-2'>
                            <Form.Label>Y level</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type='number'
                                    placeholder={turtle?.location?.y?.toString() ?? ''}
                                    value={yLevel}
                                    onChange={(e) => setYLevel(Number(e.target.value))}
                                />
                                <div className='input-group-prepend input-group-append'>
                                    <InputGroup.Text>-</InputGroup.Text>
                                </div>
                                <Form.Control
                                    type='number'
                                    placeholder={turtle?.location?.y?.toString() ?? ''}
                                    value={upperYLevel}
                                    onChange={(e) => setUpperYLevel(Number(e.target.value))}
                                />
                                <Form.Control.Feedback type='invalid'>Please enter valid numbers</Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className='mb-2'>
                            <Form.Label>Color</Form.Label>
                            <div style={{display: 'flex', flexDirection: 'row'}}>
                                {colors.map((color, i) =>
                                    color === selectedColor ? (
                                        <ColorBox
                                            key={`color-${i}`}
                                            style={{backgroundColor: color, border: '1px solid #fff'}}
                                        ></ColorBox>
                                    ) : (
                                        <ColorBox
                                            key={`color-${i}`}
                                            style={{backgroundColor: color}}
                                            onClick={() => setSelectedColor(color)}
                                        ></ColorBox>
                                    )
                                )}
                            </div>
                            <Form.Control.Feedback type='invalid'>Please enter a non-empty name</Form.Control.Feedback>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant='success' type='submit'>
                            Save
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <TurtleMap
                style={{border: '2px solid #fff', borderRadius: '50%'}}
                height={208}
                width={208}
                drawColor={selectedColor}
                canDrawArea={isCreatingArea}
                canDrawCurrentlySelectedBlock={!isCreatingArea}
                onClick={(x, y, z) => {
                    action({
                        type: 'ACTION',
                        action: 'move',
                        data: {
                            serverId,
                            id: turtle.id,
                            x,
                            y,
                            z,
                        },
                    });
                }}
                drawnArea={drawnArea}
                setDrawnArea={setDrawnArea}
                setTranslatedDrawnArea={setCreatedArea}
            />
            <Row>
                <Col>
                    {isCreatingArea ? (
                        <div className='d-grid gap-2'>
                            <Button
                                variant='outline-success'
                                size='sm'
                                disabled={createdArea.length < 1}
                                onClick={() => {
                                    setAreaName('');
                                    setIsFormValidated(false);
                                    setIsModalShown(true);
                                }}
                            >
                                {createdArea.length < 1 ? '(draw on map)' : 'Create'}
                            </Button>
                            <Button
                                variant='outline-danger'
                                size='sm'
                                onClick={() => {
                                    setIsCreatingArea(false);
                                    setCreatedArea([]);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <div className='d-grid gap-2'>
                            <Button
                                variant='outline-success'
                                size='sm'
                                disabled={!turtle?.location}
                                onClick={() => setIsCreatingArea(true)}
                            >
                                New Area
                            </Button>
                            <Button
                                variant='outline-secondary'
                                size='sm'
                                disabled={!turtle?.location}
                                onClick={() =>
                                    action({
                                        type: 'ACTION',
                                        action: 'set-home',
                                        data: {
                                            serverId,
                                            id,
                                        },
                                    })
                                }
                            >
                                Set Home
                            </Button>
                        </div>
                    )}
                </Col>
            </Row>
            {chunk ? (
                <Row>
                    <Col>
                        <div style={{marginTop: 10}}>
                            <hr />
                            <div>Chunk analysis:</div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5}}>
                                {Object.keys(chunk.analysis).map((key, i) => (
                                    <div key={i} style={{display: 'flex', gap: 5, alignItems: 'center'}}>
                                        <ItemSprite name={key} />
                                        <div>× {chunk.analysis[key]}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Col>
                </Row>
            ) : null}
        </>
    );
}

export default InventoryMap;

const ColorBox = styled.div`
    height: 24px;
    width: 40px;
    cursor: pointer;
    border-radius: 2px;
    margin: 5px;
`;
