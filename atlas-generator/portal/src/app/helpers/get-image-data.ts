export const getImageData = async (
    canvas: HTMLCanvasElement,
    imageSrc: string,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    color?: string
) => {
    const image = new Image();
    const imageDataPromise = new Promise<ImageData>((resolve, reject) => {
        image.addEventListener('load', () => {
            const mul = image.width / 16;
            dx *= mul;
            dy *= mul;
            dw *= mul;
            dh *= mul;
            const context = canvas.getContext('2d');
            if (context == null) {
                reject('Missing context!');
                return;
            }

            // Prepare canvas for redrawing
            context.clearRect(0, 0, canvas.width, canvas.height);

            // context.patternQuality = 'nearest';
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, dx, dy, dw, dh, 0, 0, 16, 16);

            if (color != null) {
                const match = new RegExp('^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$', 'i').exec(color);
                if (match == null) {
                    reject(`Broken color ${color}!`);
                    return;
                }
                const [, rString, gString, bString] = match;
                const r = parseInt(rString, 16);
                const g = parseInt(gString, 16);
                const b = parseInt(bString, 16);
                const imageData = context.getImageData(0, 0, 16, 16);
                const {data} = imageData;

                for (let i = 0; i < data.length; i++) {
                    const mod = i % 4;
                    switch (mod) {
                        case 0:
                            data[i] = (data[i] * r) / 255;
                            break;
                        case 1:
                            data[i] = (data[i] * g) / 255;
                            break;
                        case 2:
                            data[i] = (data[i] * b) / 255;
                            break;
                        case 3:
                            // Alpha layer
                            break;
                    }
                }

                context.putImageData(imageData, 0, 0);
            }

            resolve(context.getImageData(0, 0, 16, 16));
        });

        image.addEventListener('error', (err) => {
            reject(err);
        });
    });

    image.src = imageSrc;
    return await imageDataPromise;
};
