const getLocalCoordinatesForDirection = (direction) => {
    return [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
    ][direction - 1];
};

module.exports = {
    getLocalCoordinatesForDirection,
};
