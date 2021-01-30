import React, { useRef, useState, useEffect } from 'react';
import { Row, Col, Button, Modal, Form } from 'react-bootstrap';
import styled from 'styled-components';
import './TurtleMap.css';

const circleSizeMul = 0.35;
const spriteSize = 10;
const spriteRadius = 0.5 * spriteSize;
const colors = ['#ff0000', '#ff6a00', '#ffd800', '#4cff00', '#00ffff', '#0094ff', '#0026ff', '#b200ff', '#ff006e'];

const TurtleMap = (props) => {
    const { canvasSize, turtles, selectedTurtle, world, areas, action, ...rest } = props;
    const canvasRef = useRef(undefined);
    const [mousePosition, setMousePosition] = useState(undefined);
    const [isCreatingArea, setIsCreatingArea] = useState(false);
    const [isClearingCreateArea, setIsClearingCreateArea] = useState(false);
    const [createdArea, setCreatedArea] = useState({});
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [isModalShown, setIsModalShown] = useState(false);
    const [areaName, setAreaName] = useState('');
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [selectedColor, setSelectedColor] = useState(colors[0]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        let animationFrameId;

        const render = () => {
            const draw = (ctx, canvasSize, turtles, selectedTurtle, world) => {
                if (!turtles || !turtles[selectedTurtle] || !world) {
                    return;
                }

                const mul = canvasSize / spriteSize;
                const centerX = 0.5 * spriteSize * mul;
                const centerY = 0.5 * spriteSize * mul;
                const drawRange = 0.5 * mul;
                const turtle = turtles[selectedTurtle];
                const { x, y, z } = turtle.location;

                // Clear
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                ctx.fillStyle = '#323232';

                // Draw floor
                for (let i = -drawRange; i <= drawRange; i++) {
                    for (let j = -drawRange; j <= drawRange; j++) {
                        const wX = x + i;
                        const wZ = z + j;
                        if (world[`${wX},${y - 1},${wZ}`] !== undefined) {
                            ctx.fillRect(
                                (i + drawRange) * spriteSize - spriteRadius,
                                (j + drawRange) * spriteSize - spriteRadius,
                                spriteSize,
                                spriteSize,
                            );
                        }
                    }
                }

                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
                ctx.globalAlpha = 0.4;

                // Draw lines
                for (let i = -drawRange; i <= drawRange; i++) {
                    // Horizontal
                    ctx.beginPath();
                    ctx.moveTo(-canvasSize, (i + drawRange) * spriteSize - spriteRadius);
                    ctx.lineTo(canvasSize, (i + drawRange) * spriteSize - spriteRadius);
                    ctx.stroke();

                    // Vertical
                    ctx.beginPath();
                    ctx.moveTo((i + drawRange) * spriteSize - spriteRadius, -canvasSize);
                    ctx.lineTo((i + drawRange) * spriteSize - spriteRadius, canvasSize);
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
                        false,
                    );
                    ctx.fill();
                }

                ctx.globalAlpha = 1;
                ctx.fillStyle = 'black';

                // Draw blocks
                for (let i = -drawRange; i <= drawRange; i++) {
                    for (let j = -drawRange; j <= drawRange; j++) {
                        const wX = x + i;
                        const wZ = z + j;
                        if (world[`${wX},${y},${wZ}`] !== undefined) {
                            ctx.fillRect(
                                (i + drawRange) * spriteSize - spriteRadius,
                                (j + drawRange) * spriteSize - spriteRadius,
                                spriteSize,
                                spriteSize,
                            );
                        }
                    }
                }

                ctx.globalAlpha = 0.4;

                // Draw areas
                const areaKeys = Object.keys(areas);
                for (let key of areaKeys) {
                    let smallestX = Number.POSITIVE_INFINITY;
                    let smallestY = Number.POSITIVE_INFINITY;
                    ctx.fillStyle = areas[key].color;
                    for (let position of areas[key].area) {
                        const posX = (position.x - turtle.location.x) * spriteSize + centerX - spriteRadius;
                        const posY = (position.z - turtle.location.z) * spriteSize + centerY - spriteRadius;
                        smallestX = Math.min(smallestX, posX);
                        smallestY = Math.min(smallestY, posY);
                        ctx.fillRect(posX, posY, spriteSize, spriteSize);
                    }

                    ctx.textAlign = 'start';
                    ctx.font = '12px Ariel';
                    ctx.lineWidth = 4;
                    ctx.strokeText(areas[key].id, smallestX, smallestY - spriteRadius);
                    ctx.fillText(areas[key].id, smallestX, smallestY - spriteRadius);
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
                for (let key of keys) {
                    if (key !== turtle.id.toString()) {
                        const otherTurtle = turtles[key];
                        if (otherTurtle.location.y === turtle.location.y) {
                            ctx.beginPath();
                            ctx.fillStyle = otherTurtle.isOnline ? 'white' : '#696969';
                            const posX = (otherTurtle.location.x - turtle.location.x) * spriteSize + centerX;
                            const posY = (otherTurtle.location.z - turtle.location.z) * spriteSize + centerY;
                            ctx.arc(posX, posY, circleSizeMul * spriteSize, 0, 2 * Math.PI, false);
                            ctx.fill();

                            ctx.textAlign = 'center';
                            ctx.strokeStyle = 'black';
                            ctx.font = '10px Ariel';
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
                ctx.font = '10px Ariel';
                ctx.lineWidth = 4;
                ctx.strokeText(turtle.name, centerX, centerY - spriteRadius);
                ctx.fillText(turtle.name, centerX, centerY - spriteRadius);
            };
            draw(context, canvasSize, turtles, selectedTurtle, world);

            animationFrameId = window.requestAnimationFrame(render);
        };
        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    });

    const handleFormSubmit = (e) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            const turtle = turtles && turtles[selectedTurtle];
            const { x, y, z } = turtle.location;
            action({
                type: 'AREA',
                action: 'create',
                data: {
                    id: areaName,
                    color: selectedColor,
                    area: Object.keys(createdArea)
                        .map((key) => {
                            const tempX = (createdArea[key].x + spriteRadius - canvasSize * 0.5) / spriteSize + x;
                            const tempZ = (createdArea[key].y + spriteRadius - canvasSize * 0.5) / spriteSize + z;
                            return { x: tempX, y: y, z: tempZ };
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
                },
            });
            setIsCreatingArea(false);
            setCreatedArea({});
            setIsModalShown(false);
            setAreaName('');
            setIsFormValidated(false);
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    return (
        <Col key="canvas" md="auto">
            <Modal show={isModalShown} onHide={() => setIsModalShown(false)}>
                <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>Create New Area</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Area name</Form.Label>
                            <Form.Control
                                required
                                type="text"
                                placeholder="name"
                                value={areaName}
                                onChange={(e) => setAreaName(e.target.value)}
                            ></Form.Control>
                            <Form.Control.Feedback type="invalid">Please enter a non-empty name</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Color</Form.Label>
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                {colors.map((color) =>
                                    color === selectedColor ? (
                                        <ColorBox style={{ backgroundColor: color, border: '1px solid #fff' }}></ColorBox>
                                    ) : (
                                        <ColorBox style={{ backgroundColor: color }} onClick={() => setSelectedColor(color)}></ColorBox>
                                    ),
                                )}
                            </div>
                            <Form.Control.Feedback type="invalid">Please enter a non-empty name</Form.Control.Feedback>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="success" type="submit">
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
                            const tileX = Math.floor((e.nativeEvent.offsetX - spriteRadius) / spriteSize) * spriteSize + spriteRadius;
                            const tileY = Math.floor((e.nativeEvent.offsetY - spriteRadius) / spriteSize) * spriteSize + spriteRadius;

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

                            setIsMouseDown(true);
                        }}
                        onMouseMove={(e) => {
                            const mouseX = e.nativeEvent.offsetX;
                            const mouseY = e.nativeEvent.offsetY;

                            if (isCreatingArea && isMouseDown) {
                                const tileX = Math.floor((mouseX - spriteRadius) / spriteSize) * spriteSize + spriteRadius;
                                const tileY = Math.floor((mouseY - spriteRadius) / spriteSize) * spriteSize + spriteRadius;

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
                            const turtle = turtles && turtles[selectedTurtle];
                            if (!isCreatingArea && turtle && turtle.isOnline) {
                                const { x, y, z } = turtle.location;
                                action({
                                    type: 'ACTION',
                                    action: 'move',
                                    data: {
                                        id: turtle.id,
                                        x:
                                            (Math.floor((e.nativeEvent.offsetX - spriteRadius) / spriteSize) * spriteSize +
                                                spriteRadius +
                                                spriteRadius -
                                                canvasSize * 0.5) /
                                                spriteSize +
                                            x,
                                        y,
                                        z:
                                            (Math.floor((e.nativeEvent.offsetY - spriteRadius) / spriteSize) * spriteSize +
                                                spriteRadius +
                                                spriteRadius -
                                                canvasSize * 0.5) /
                                                spriteSize +
                                            z,
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
                        <div>
                            <Button
                                variant="outline-success"
                                block
                                onClick={() => {
                                    setAreaName('');
                                    setIsFormValidated(false);
                                    setIsModalShown(true);
                                }}
                            >
                                Create
                            </Button>
                            <Button
                                variant="outline-danger"
                                block
                                onClick={() => {
                                    setIsCreatingArea(false);
                                    setCreatedArea({});
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline-success" block onClick={() => setIsCreatingArea(true)}>
                            New Area
                        </Button>
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
