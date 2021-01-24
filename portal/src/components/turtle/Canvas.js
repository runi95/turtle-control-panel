import React, { useRef, useEffect } from 'react';

const circleSizeMul = 0.35;
const spriteSize = 10;
const spriteRadius = 0.5 * spriteSize;

const Canvas = (props) => {
    const { canvasSize, turtles, selectedTurtle, world, ...rest } = props;
    const canvasRef = useRef(null);

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
                const turtle = turtles[selectedTurtle];
                const { x, y, z } = turtle.location;

                // Clear
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                // Draw blocks
                const drawRange = 0.5 * mul;
                for (let i = -drawRange; i <= drawRange; i++) {
                    for (let j = -drawRange; j <= drawRange; j++) {
                        const wX = x + i;
                        const wZ = z + j;
                        if (world[`${wX},${y},${wZ}`] !== undefined) {
                            ctx.fillStyle = 'black';
                            ctx.fillRect(
                                (i + drawRange) * spriteSize - spriteRadius,
                                (j + drawRange) * spriteSize - spriteRadius,
                                spriteSize,
                                spriteSize,
                            );
                        }
                    }
                }

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

    return <canvas ref={canvasRef} {...rest} height={canvasSize} width={canvasSize} />;
};

export default Canvas;
