// log levels:
//
// DEBUG
// INFO
// WARNING
// ERROR
module.exports = (() => {
    switch (process.env.TURTLE_LOG_LEVEL?.toUpperCase() || 'INFO') {
        case 'ERROR':
            return 3;
        case 'WARNING':
            return 2;
        case 'INFO':
            return 1;
        case 'DEBUG':
        default:
            return 0;
    }
})();
