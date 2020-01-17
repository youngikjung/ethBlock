const winston = require('winston');
require('winston-daily-rotate-file');
require('date-utils');

const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.DailyRotateFile({
            filename : 'log/system.log', // log 폴더에 system.log 이름으로 저장
            zippedArchive: true, // 압축여부
            format: winston.format.printf(
                info => `${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')} [${info.level.toUpperCase()}] - ${info.message}`)
        }),

        new winston.transports.Console({
            format: winston.format.printf(
                info => `${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')} [${info.level.toUpperCase()}] - ${info.message}`)
        })
    ]
});

module.exports = logger;
