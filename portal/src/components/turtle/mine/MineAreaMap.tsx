import {useRef, useState, useEffect} from 'react';
import {Row, Col} from 'react-bootstrap';
import './MineAreaMap.css';
import {useParams} from 'react-router-dom';
import {Blocks} from '../../../App';
import SpriteTable from '../../../SpriteTable';
import {useBlocks} from '../../../api/UseBlocks';
import {Turtle, useTurtle} from '../../../api/UseTurtle';
import {CreatedArea} from './MineModal';

const circleSizeMul = 0.35;
const spriteSize = 8;
const spriteRadius = 0.5 * spriteSize;

export interface MineAreaMapProps {
    createdArea: CreatedArea;
    setCreatedArea: (createdArea: CreatedArea) => void;
}

const MineAreaMap = (props: MineAreaMapProps) => {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {createdArea, setCreatedArea} = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isClearingCreateArea, setIsClearingCreateArea] = useState(false);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const {data: turtle} = useTurtle(serverId, id);
    const {data: blocks} = useBlocks(
        serverId,
        {
            fromX: turtle !== undefined ? turtle.location?.x - 28 : 0,
            toX: turtle !== undefined ? turtle.location?.x + 28 : 0,
            fromY: turtle !== undefined ? turtle.location?.y - 20 : 0,
            toY: turtle !== undefined ? turtle.location?.y + 20 : 0,
            fromZ: turtle !== undefined ? turtle.location?.z - 15 : 0,
            toZ: turtle !== undefined ? turtle.location?.z + 15 : 0,
        },
        turtle !== undefined && turtle.location !== null && turtle.direction !== null
    );

    useEffect(() => {
        if (turtle === undefined) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        let animationFrameId: number;

        const render = () => {
            const draw = (ctx: CanvasRenderingContext2D | null, blocks: Blocks | undefined, turtle: Turtle) => {
                if (!ctx || !turtle || !blocks) {
                    return;
                }

                const canvasHeight = 336;
                const canvasWidth = 464;
                const canvasSize = canvasHeight;
                const mul = canvasSize / spriteSize;
                const centerX = 0.5 * spriteSize * mul;
                const centerY = 0.5 * spriteSize * mul;
                const drawRange = 0.5 * mul;
                if (!turtle?.location) return;
                const {x, y, z} = turtle.location;

                // Clear
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                // Draw floor
                for (let i = -20; i <= 20; i++) {
                    for (let j = -28; j <= 28; j++) {
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

                // Draw horizontal lines
                for (let i = -20; i <= 20; i++) {
                    const lineLength = (i + 21) * spriteSize - spriteRadius + 0.5;

                    ctx.beginPath();
                    ctx.moveTo(0, lineLength);
                    ctx.lineTo(canvasWidth, lineLength);
                    ctx.stroke();
                }

                // Draw vertical lines
                for (let i = -28; i <= 28; i++) {
                    const lineLength = (i + 29) * spriteSize - spriteRadius + 0.5;

                    ctx.beginPath();
                    ctx.moveTo(lineLength, 0);
                    ctx.lineTo(lineLength, canvasHeight);
                    ctx.stroke();
                }

                ctx.globalAlpha = 0.4;

                // Draw creatingArea
                ctx.fillStyle = '#0094ff';
                const keys = Object.keys(createdArea);
                for (let i = 0; i < keys.length; i++) {
                    ctx.fillRect(createdArea[keys[i]].x, createdArea[keys[i]].y, spriteSize, spriteSize);
                }

                ctx.globalAlpha = 1;

                // Draw current turtle
                ctx.beginPath();
                ctx.fillStyle = 'yellow';
                ctx.arc(centerX, centerY, circleSizeMul * spriteSize, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.beginPath();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 0.8;
                ctx.arc(centerX, centerY, circleSizeMul * spriteSize, 0, 2 * Math.PI, false);
                ctx.stroke();
            };
            draw(context, blocks, turtle);

            animationFrameId = window.requestAnimationFrame(render);
        };
        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    });

    if (turtle === undefined) return null;

    return (
        <Col key='canvas' style={{marginLeft: 'auto'}} md='auto'>
            <Row>
                <Col>
                    <canvas
                        ref={canvasRef}
                        style={{border: '1px solid #fff'}}
                        height={336}
                        width={464}
                        onMouseDown={(e) => {
                            const tileX =
                                Math.floor((e.nativeEvent.offsetX - spriteRadius) / spriteSize) * spriteSize +
                                spriteRadius;
                            const tileY =
                                Math.floor((e.nativeEvent.offsetY - spriteRadius) / spriteSize) * spriteSize +
                                spriteRadius;

                            if (createdArea[`${tileX},${tileY}`]) {
                                const newArea = {
                                    ...createdArea,
                                };
                                delete newArea[`${tileX},${tileY}`];
                                setCreatedArea(newArea);
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

                            if (isMouseDown) {
                                const tileX =
                                    Math.floor((mouseX - spriteRadius) / spriteSize) * spriteSize + spriteRadius;
                                const tileY =
                                    Math.floor((mouseY - spriteRadius) / spriteSize) * spriteSize + spriteRadius;

                                if (isClearingCreateArea) {
                                    const newArea = {
                                        ...createdArea,
                                    };
                                    delete newArea[`${tileX},${tileY}`];
                                    setCreatedArea(newArea);
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
                        }}
                        onMouseUp={() => {
                            if (!blocks) return;

                            setIsMouseDown(false);
                        }}
                    />
                </Col>
            </Row>
        </Col>
    );
};

export default MineAreaMap;
