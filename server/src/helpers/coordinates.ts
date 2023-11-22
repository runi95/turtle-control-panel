export const getLocalCoordinatesForDirection = (direction: number) => {
    return [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
    ][direction - 1];
};
