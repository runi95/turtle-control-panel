import * as winston from 'winston';

const logLevel = process.env.LOG_LEVEL ?? 'debug';

export default winston.createLogger({
    level: logLevel,
    levels: Object.assign({fatal: 0, trace: 7, silent: 8}, winston.config.syslog.levels),
    format: winston.format.combine(
        winston.format.colorize({
            colors: {
                fatal: winston.config.syslog.colors['error'] as string,
                trace: winston.config.syslog.colors['debug'] as string,
                silent: winston.config.syslog.colors['debug'] as string,
            },
        }),
        winston.format.timestamp({format: 'DD-MM-YYYY hh:mm:ss'}),
        winston.format.printf((info) => `${info.level}\t${[info.timestamp]}\t${info.stack ?? info.message}`)
    ),
    transports: [new winston.transports.Console()],
    exitOnError: false,
}) as winston.Logger & {
    fatal: winston.LeveledLogMethod;
    trace: winston.LeveledLogMethod;
    silent: winston.LeveledLogMethod;
};
