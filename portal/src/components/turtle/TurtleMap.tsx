import {useRef, useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {Location, Turtle, useTurtle} from '../../api/UseTurtle';
import {useBlocks} from '../../api/UseBlocks';
import {Blocks} from '../../App';
import SpriteTable from '../../SpriteTable';
import './TurtleMap.css';

export interface DrawnArea {
    [key: string]: {
        x: number;
        y: number;
    };
}

export interface TurtleMapProps {
    style?: React.CSSProperties;
    height?: number;
    width?: number;
    blockSize?: number;
    blockDepth?: number;
    drawColor?: string;
    canDrawCurrentlySelectedBlock?: boolean;
    onClick?: (x: number, y: number, z: number) => void;
    canDrawArea?: boolean;
    drawnArea?: DrawnArea;
    setDrawnArea?: (drawnArea: DrawnArea) => void;
    setTranslatedDrawnArea?: (translatedDrawnArea: Omit<Location, 'y'>[]) => void;
}

const TurtleMap = ({
    style = {border: '1px solid #fff'},
    height = 336,
    width = 464,
    blockSize = 8,
    blockDepth = 10,
    drawColor = '#0094ff',
    canDrawArea = true,
    drawnArea,
    setDrawnArea,
    setTranslatedDrawnArea,
    canDrawCurrentlySelectedBlock = false,
    onClick,
}: TurtleMapProps) => {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isClearingDrawnArea, setIsClearingDrawnArea] = useState(false);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [mousePosition, setMousePosition] = useState<[number, number] | undefined>(undefined);
    const {data: turtle} = useTurtle(serverId, id);
    const blockRadius = 0.5 * blockSize;
    const centerX = 0.5 * width;
    const centerY = 0.5 * height;
    const blocksInWidthRadius = Math.ceil(centerX / blockSize);
    const blocksInHeightRadius = Math.ceil(centerY / blockSize);
    const {data: blocks} = useBlocks(
        serverId,
        {
            fromX: turtle !== undefined ? turtle.location?.x - blocksInWidthRadius : 0,
            toX: turtle !== undefined ? turtle.location?.x + blocksInWidthRadius : 0,
            fromY: turtle !== undefined ? turtle.location?.y - blockDepth : 0,
            toY: turtle !== undefined ? turtle.location?.y + blockDepth : 0,
            fromZ: turtle !== undefined ? turtle.location?.z - blocksInHeightRadius : 0,
            toZ: turtle !== undefined ? turtle.location?.z + blocksInHeightRadius : 0,
        },
        turtle !== undefined && turtle.location !== null && turtle.direction !== null
    );

    useEffect(() => {
        if (!turtle) return;
        if (!setTranslatedDrawnArea) return;
        if (!drawnArea) return;

        const {x: turtleX, z: turtleZ} = turtle.location;
        setTranslatedDrawnArea(
            Object.values(drawnArea).map(({x, y}) => {
                return {
                    x: (x + blockRadius - centerX) / blockSize + turtleX,
                    z: (y + blockRadius - centerY) / blockSize + turtleZ,
                };
            })
        );
    }, [drawnArea, turtle]);

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

                if (!turtle?.location) return;
                const {x, y, z} = turtle.location;

                // Clear
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                // Draw floor
                const widthOffsetCorrection = centerX / blockSize - blocksInWidthRadius;
                const heightOffsetCorrection = centerY / blockSize - blocksInHeightRadius;
                for (let i = -blocksInWidthRadius; i <= blocksInWidthRadius; i++) {
                    for (let j = -blocksInHeightRadius; j <= blocksInHeightRadius; j++) {
                        const wX = x + i;
                        const wZ = z + j;
                        for (let k = y + blockDepth; k > y - blockDepth; k--) {
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
                                    (widthOffsetCorrection + i + blocksInWidthRadius) * blockSize - blockRadius,
                                    (heightOffsetCorrection + j + blocksInHeightRadius) * blockSize - blockRadius,
                                    blockSize,
                                    blockSize
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
                for (let i = -blocksInHeightRadius; i <= blocksInHeightRadius; i++) {
                    const lineLength =
                        (heightOffsetCorrection + i + blocksInHeightRadius) * blockSize - blockRadius + 0.5;

                    ctx.beginPath();
                    ctx.moveTo(0, lineLength);
                    ctx.lineTo(ctx.canvas.width, lineLength);
                    ctx.stroke();
                }

                // Draw vertical lines
                for (let i = -blocksInWidthRadius; i <= blocksInWidthRadius; i++) {
                    const lineLength =
                        (widthOffsetCorrection + i + blocksInWidthRadius) * blockSize - blockRadius + 0.5;

                    ctx.beginPath();
                    ctx.moveTo(lineLength, 0);
                    ctx.lineTo(lineLength, ctx.canvas.height);
                    ctx.stroke();
                }

                // Draw currently selected block
                if (canDrawCurrentlySelectedBlock && mousePosition !== undefined) {
                    ctx.beginPath();
                    ctx.fillStyle = 'yellow';
                    ctx.arc(
                        Math.floor((mousePosition[0] - blockRadius) / blockSize) * blockSize + blockSize,
                        Math.floor((mousePosition[1] - blockRadius) / blockSize) * blockSize + blockSize,
                        0.35 * blockSize,
                        0,
                        2 * Math.PI,
                        false
                    );
                    ctx.fill();
                }

                // Draw creatingArea
                if (!!canDrawArea && !!setDrawnArea && !!drawnArea) {
                    ctx.globalAlpha = 0.4;
                    ctx.fillStyle = drawColor;

                    const keys = Object.keys(drawnArea);
                    for (let i = 0; i < keys.length; i++) {
                        ctx.fillRect(drawnArea[keys[i]].x, drawnArea[keys[i]].y, blockSize, blockSize);
                    }
                }

                ctx.globalAlpha = 1;

                // Draw current turtle
                ctx.beginPath();
                ctx.fillStyle = 'yellow';
                ctx.arc(centerX, centerY, 0.35 * blockSize, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.beginPath();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 0.8;
                ctx.arc(centerX, centerY, 0.35 * blockSize, 0, 2 * Math.PI, false);
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
        <canvas
            ref={canvasRef}
            style={style}
            height={height}
            width={width}
            onMouseDown={(e) => {
                if (!canDrawArea) return;
                if (!setDrawnArea) return;
                if (!drawnArea) return;

                const tileX = Math.floor((e.nativeEvent.offsetX - blockRadius) / blockSize) * blockSize + blockRadius;
                const tileY = Math.floor((e.nativeEvent.offsetY - blockRadius) / blockSize) * blockSize + blockRadius;

                if (drawnArea[`${tileX},${tileY}`]) {
                    const newArea = {
                        ...drawnArea,
                    };
                    delete newArea[`${tileX},${tileY}`];
                    setDrawnArea(newArea);
                    setIsClearingDrawnArea(true);
                } else {
                    setDrawnArea({
                        ...drawnArea,
                        [`${tileX},${tileY}`]: {
                            x: tileX,
                            y: tileY,
                        },
                    });
                    setIsClearingDrawnArea(false);
                }

                setIsMouseDown(true);
            }}
            onMouseMove={(e) => {
                const mouseX = e.nativeEvent.offsetX;
                const mouseY = e.nativeEvent.offsetY;
                if (canDrawCurrentlySelectedBlock) {
                    setMousePosition([mouseX, mouseY]);
                }

                if (!canDrawArea) return;
                if (!setDrawnArea) return;
                if (!drawnArea) return;

                if (isMouseDown) {
                    const tileX = Math.floor((mouseX - blockRadius) / blockSize) * blockSize + blockRadius;
                    const tileY = Math.floor((mouseY - blockRadius) / blockSize) * blockSize + blockRadius;
                    if (isClearingDrawnArea) {
                        const newArea = {
                            ...drawnArea,
                        };
                        delete newArea[`${tileX},${tileY}`];
                        setDrawnArea(newArea);
                    } else {
                        setDrawnArea({
                            ...drawnArea,
                            [`${tileX},${tileY}`]: {
                                x: tileX,
                                y: tileY,
                            },
                        });
                    }
                }
            }}
            onMouseUp={(e) => {
                if (!blocks) return;

                setIsMouseDown(false);
                if (!onClick) return;

                const {x, y, z} = turtle.location;
                const tx =
                    (Math.floor((e.nativeEvent.offsetX - blockRadius) / blockSize) * blockSize +
                        blockRadius +
                        blockRadius -
                        width * 0.5) /
                        blockSize +
                    x;
                const tz =
                    (Math.floor((e.nativeEvent.offsetY - blockRadius) / blockSize) * blockSize +
                        blockRadius +
                        blockRadius -
                        height * 0.5) /
                        blockSize +
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

                onClick(tx, ty, tz);
            }}
            onMouseLeave={() => setMousePosition(undefined)}
        />
    );
};

export default TurtleMap;
