import * as winston from 'winston';

const logLevel = process.env.LOG_LEVEL ?? 'debug';
export default winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({format: 'DD-MM-YYYY hh:mm:ss'}),
        winston.format.printf((info) => `${info.level}\t${[info.timestamp]}\t${info.stack ?? info.message}`)
    ),
    transports: [new winston.transports.Console()],
    exitOnError: false,
});
