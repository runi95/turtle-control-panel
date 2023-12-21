import {useRef, useState, useEffect} from 'react';
import {Row, Col, Button, Modal, Form, InputGroup} from 'react-bootstrap';
import styled from 'styled-components';
import './TurtleMap.css';
import {useParams} from 'react-router-dom';
import {Action, Areas, Blocks, Location, Turtle, Turtles} from '../../App';
import SpriteTable from '../../SpriteTable';
import {useBlocks} from '../../api/UseBlocks';

const circleSizeMul = 0.35;
const spriteSize = 8;
const spriteRadius = 0.5 * spriteSize;
const colors = ['#ff0000', '#ff6a00', '#ffd800', '#4cff00', '#00ffff', '#0094ff', '#0026ff', '#b200ff', '#ff006e'];

interface TurtleMapProps {
    style?: React.CSSProperties;
    canvasSize: number;
    turtles: Turtles;
    areas: Areas;
    action: Action;
}

const TurtleMap = (props: TurtleMapProps) => {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {canvasSize, turtles, areas, action, ...rest} = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [mousePosition, setMousePosition] = useState<[number, number] | undefined>(undefined);
    const [isCreatingArea, setIsCreatingArea] = useState(false);
    const [isClearingCreateArea, setIsClearingCreateArea] = useState(false);
    const [createdArea, setCreatedArea] = useState<{
        [key: string]: {
            x: number;
            y: number;
        };
    }>({});
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [isModalShown, setIsModalShown] = useState(false);
    const [areaName, setAreaName] = useState('');
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [yLevel, setYLevel] = useState<number | undefined>(undefined);
    const [upperYLevel, setUpperYLevel] = useState<number | undefined>(undefined);
    const turtle = turtles?.[id];
    const {data: blocks} = useBlocks(serverId, {
        fromX: turtle.location.x - 15,
        toX: turtle.location.x + 15,
        fromY: turtle.location.y - 10,
        toY: turtle.location.y + 10,
        fromZ: turtle.location.z - 15,
        toZ: turtle.location.z + 15,
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        let animationFrameId: number;

        const render = () => {
            const draw = (
                ctx: CanvasRenderingContext2D | null,
                canvasSize: number,
                turtles: Turtles,
                blocks: Blocks | undefined,
                turtle: Turtle
            ) => {
                if (!ctx || !turtle || !blocks) {
                    return;
                }

                const mul = canvasSize / spriteSize;
                const centerX = 0.5 * spriteSize * mul;
                const centerY = 0.5 * spriteSize * mul;
                const drawRange = 0.5 * mul;
                if (!turtle?.location) return;
                const {x, y, z} = turtle.location;

                // Clear
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                // Draw floor
                for (let i = -drawRange; i <= drawRange; i++) {
                    for (let j = -drawRange; j <= drawRange; j++) {
                        const wX = x + i;
                        const wZ = z + j;
                        for (let k = y + 10; k > y - 10; k--) {
                            const block = blocks[`${wX},${k},${wZ}`];
                            if (block !== undefined) {
                                const fillColor = SpriteTable[block.name]?.avg_color ?? {
                                    r: 255,
                                    g: 255,
                                    b: 255,
                                };
                                if (k > y - 1) {
                                    ctx.fillStyle = `#${fillColor.r.toString(16)}${fillColor.g.toString(
                                        16
                                    )}${fillColor.b.toString(16)}`;
                                } else {
                                    const diff = y - k;
                                    ctx.fillStyle = `#${Math.floor(Math.sqrt(Math.pow(fillColor.r, 2) / diff)).toString(
                                        16
                                    )}${Math.floor(Math.sqrt(Math.pow(fillColor.g, 2) / diff)).toString(
                                        16
                                    )}${Math.floor(Math.sqrt(Math.pow(fillColor.b, 2) / diff)).toString(16)}`;
                                }
                                ctx.fillRect(
                                    (i + drawRange) * spriteSize - spriteRadius,
                                    (j + drawRange) * spriteSize - spriteRadius,
                                    spriteSize,
                                    spriteSize
                                );
                                break;
                            }
                        }
                    }
                }

                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
                ctx.globalAlpha = 0.4;

                // Draw lines
                for (let i = -drawRange; i <= drawRange; i++) {
                    const lineLength = (i + drawRange) * spriteSize - spriteRadius + 0.5;

                    // Horizontal
                    ctx.beginPath();
                    ctx.moveTo(-canvasSize, lineLength);
                    ctx.lineTo(canvasSize, lineLength);
                    ctx.stroke();

                    // Vertical
                    ctx.beginPath();
                    ctx.moveTo(lineLength, -canvasSize);
                    ctx.lineTo(lineLength, canvasSize);
                    ctx.stroke();
                }

                // Draw currently selected block
                if (!isCreatingArea && turtle.isOnline && mousePosition !== undefined) {
                    ctx.beginPath();
                    ctx.fillStyle = 'yellow';
                    ctx.arc(
                        Math.floor((mousePosition[0] - spriteRadius) / spriteSize) * spriteSize + spriteSize,
                        Math.floor((mousePosition[1] - spriteRadius) / spriteSize) * spriteSize + spriteSize,
                        circleSizeMul * spriteSize,
                        0,
                        2 * Math.PI,
                        false
                    );
                    ctx.fill();
                }

                ctx.globalAlpha = 0.4;

                // Draw areas
                const areaKeys = Object.keys(areas);
                for (const key of areaKeys) {
                    let smallestX = Number.POSITIVE_INFINITY;
                    let smallestY = Number.POSITIVE_INFINITY;
                    ctx.fillStyle = areas[key].color;
                    for (const position of areas[key].area) {
                        const posX = (position.x - turtle.location.x) * spriteSize + centerX - spriteRadius;
                        const posY = (position.z - turtle.location.z) * spriteSize + centerY - spriteRadius;
                        smallestX = Math.min(smallestX, posX);
                        smallestY = Math.min(smallestY, posY);
                        ctx.fillRect(posX, posY, spriteSize, spriteSize);
                    }

                    ctx.textAlign = 'start';
                    ctx.font = '10px Tahoma';
                    ctx.lineWidth = 4;
                    ctx.strokeText(areas[key].name.toString(), smallestX, smallestY - spriteRadius);
                    ctx.fillText(areas[key].name.toString(), smallestX, smallestY - spriteRadius);
                }

                // Draw creatingArea
                if (isCreatingArea) {
                    ctx.fillStyle = selectedColor;
                    const keys = Object.keys(createdArea);
                    for (let i = 0; i < keys.length; i++) {
                        ctx.fillRect(createdArea[keys[i]].x, createdArea[keys[i]].y, spriteSize, spriteSize);
                    }
                }

                ctx.globalAlpha = 1;

                // Draw other turtles
                const keys = Object.keys(turtles);
                for (const key of keys) {
                    if (key !== turtle.id.toString()) {
                        const otherTurtle = turtles[key];
                        if (otherTurtle?.location?.y === turtle?.location?.y) {
                            ctx.beginPath();
                            ctx.fillStyle = otherTurtle.isOnline ? 'white' : '#696969';
                            const posX = (otherTurtle.location.x - turtle.location.x) * spriteSize + centerX;
                            const posY = (otherTurtle.location.z - turtle.location.z) * spriteSize + centerY;
                            ctx.arc(posX, posY, circleSizeMul * spriteSize, 0, 2 * Math.PI, false);
                            ctx.fill();

                            ctx.textAlign = 'center';
                            ctx.strokeStyle = 'black';
                            ctx.font = '11px Tahoma';
                            ctx.lineWidth = 4;
                            ctx.strokeText(otherTurtle.name, posX, posY - spriteRadius);
                            ctx.fillText(otherTurtle.name, posX, posY - spriteRadius);
                        }
                    }
                }

                // Draw current turtle
                ctx.beginPath();
                ctx.fillStyle = 'yellow';
                ctx.arc(centerX, centerY, circleSizeMul * spriteSize, 0, 2 * Math.PI, false);
                ctx.fill();

                ctx.textAlign = 'center';
                ctx.strokeStyle = 'black';
                ctx.font = '11px Tahoma';
                ctx.lineWidth = 4;
                ctx.strokeText(turtle.name, centerX, centerY - spriteRadius);
                ctx.fillText(turtle.name, centerX, centerY - spriteRadius);
            };
            draw(context, canvasSize, turtles, blocks, turtle);

            animationFrameId = window.requestAnimationFrame(render);
        };
        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    });

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsFormValidated(true);
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            const {x, y, z} = turtle.location;
            const minYLevel = Math.min(yLevel || y, upperYLevel || y);
            const maxYLevel = Math.max(yLevel || y, upperYLevel || y);
            let area: Location[] = [];
            for (let i = minYLevel; i <= maxYLevel; i++) {
                area = area.concat(
                    Object.keys(createdArea)
                        .map((key) => {
                            const tempX = (createdArea[key].x + spriteRadius - canvasSize * 0.5) / spriteSize + x;
                            const tempZ = (createdArea[key].y + spriteRadius - canvasSize * 0.5) / spriteSize + z;
                            return {x: tempX, y: i, z: tempZ};
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
                        })
                );
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
            setIsCreatingArea(false);
            setCreatedArea({});
            setIsModalShown(false);
            setAreaName('');
            setIsFormValidated(false);
            setYLevel(undefined);
            setUpperYLevel(undefined);
        } else {
            e.stopPropagation();
        }
    };

    return (
        <Col key='canvas' md='auto'>
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
                                    min='1'
                                    max='255'
                                    placeholder={turtle?.location?.y?.toString() ?? ''}
                                    value={yLevel}
                                    onChange={(e) => setYLevel(Number(e.target.value))}
                                />
                                <div className='input-group-prepend input-group-append'>
                                    <InputGroup.Text>-</InputGroup.Text>
                                </div>
                                <Form.Control
                                    type='number'
                                    min='1'
                                    max='255'
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
            <Row>
                <Col>
                    <canvas
                        ref={canvasRef}
                        {...rest}
                        height={canvasSize}
                        width={canvasSize}
                        onMouseDown={(e) => {
                            if (isCreatingArea) {
                                const tileX =
                                    Math.floor((e.nativeEvent.offsetX - spriteRadius) / spriteSize) * spriteSize +
                                    spriteRadius;
                                const tileY =
                                    Math.floor((e.nativeEvent.offsetY - spriteRadius) / spriteSize) * spriteSize +
                                    spriteRadius;

                                if (createdArea[`${tileX},${tileY}`]) {
                                    delete createdArea[`${tileX},${tileY}`];
                                    setCreatedArea(createdArea);
                                    setIsClearingCreateArea(true);
                                } else {
                                    setCreatedArea({
                                        ...createdArea,
                                        [`${tileX},${tileY}`]: {
                                            x: tileX,
                                            y: tileY,
                                        },
                                    });
                                    setIsClearingCreateArea(false);
                                }
                            }

                            setIsMouseDown(true);
                        }}
                        onMouseMove={(e) => {
                            const mouseX = e.nativeEvent.offsetX;
                            const mouseY = e.nativeEvent.offsetY;

                            if (isCreatingArea && isMouseDown) {
                                const tileX =
                                    Math.floor((mouseX - spriteRadius) / spriteSize) * spriteSize + spriteRadius;
                                const tileY =
                                    Math.floor((mouseY - spriteRadius) / spriteSize) * spriteSize + spriteRadius;

                                if (isClearingCreateArea) {
                                    delete createdArea[`${tileX},${tileY}`];
                                    setCreatedArea(createdArea);
                                } else {
                                    setCreatedArea({
                                        ...createdArea,
                                        [`${tileX},${tileY}`]: {
                                            x: tileX,
                                            y: tileY,
                                        },
                                    });
                                }
                            }

                            setMousePosition([mouseX, mouseY]);
                        }}
                        onMouseUp={(e) => {
                            if (!blocks) return;

                            if (!isCreatingArea && turtle?.isOnline) {
                                const {x, y, z} = turtle.location;
                                const tx =
                                    (Math.floor((e.nativeEvent.offsetX - spriteRadius) / spriteSize) * spriteSize +
                                        spriteRadius +
                                        spriteRadius -
                                        canvasSize * 0.5) /
                                        spriteSize +
                                    x;
                                const tz =
                                    (Math.floor((e.nativeEvent.offsetY - spriteRadius) / spriteSize) * spriteSize +
                                        spriteRadius +
                                        spriteRadius -
                                        canvasSize * 0.5) /
                                        spriteSize +
                                    z;

                                let ty = null;
                                let previousOpenSpace = null;

                                // Attempt to go down
                                for (let k = y; k > -60; k--) {
                                    const block = blocks[`${tx},${k},${tz}`];
                                    if (block === undefined) {
                                        previousOpenSpace = k;
                                    } else if (previousOpenSpace !== null) {
                                        ty = previousOpenSpace;
                                        break;
                                    }
                                }

                                // Attempt to go up
                                if (ty === null) {
                                    for (let k = y; k < 256; k++) {
                                        const block = blocks[`${tx},${k},${tz}`];
                                        if (block === undefined) {
                                            ty = k;
                                            break;
                                        }
                                    }
                                }

                                if (ty === null) {
                                    ty = y;
                                }

                                action({
                                    type: 'ACTION',
                                    action: 'move',
                                    data: {
                                        id: turtle.id,
                                        x: tx,
                                        y: ty,
                                        z: tz,
                                    },
                                });
                            }

                            setIsMouseDown(false);
                        }}
                        onMouseLeave={() => setMousePosition(undefined)}
                    />
                </Col>
            </Row>
            <Row>
                <Col>
                    {isCreatingArea ? (
                        <div className='d-grid gap-2'>
                            <Button
                                variant='outline-success'
                                size='sm'
                                disabled={Object.keys(createdArea).length < 1}
                                onClick={() => {
                                    setAreaName('');
                                    setIsFormValidated(false);
                                    setIsModalShown(true);
                                }}
                            >
                                {Object.keys(createdArea).length < 1 ? '(draw on map)' : 'Create'}
                            </Button>
                            <Button
                                variant='outline-danger'
                                size='sm'
                                onClick={() => {
                                    setIsCreatingArea(false);
                                    setCreatedArea({});
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
                        </div>
                    )}
                </Col>
            </Row>
        </Col>
    );
};

const ColorBox = styled.div`
    height: 24px;
    width: 40px;
    cursor: pointer;
    border-radius: 2px;
    margin: 5px;
`;

export default TurtleMap;
