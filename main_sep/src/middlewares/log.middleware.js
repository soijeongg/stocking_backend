import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

// Transport for info level
const infoFileTransport = new winstonDaily({
  level: 'info', // Capture logs of info and below
  dirname: `logs/info`, // Store in a separate directory
  filename: '%DATE%-info.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

// Transport for error level
const errorFileTransport = new winstonDaily({
  level: 'error', // Capture only error logs
  dirname: `logs/error`, // Store in a separate directory
  filename: '%DATE%-error.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const logger = winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    infoFileTransport,
    errorFileTransport, // Add the error transport
  ],
});

export { logger };

export default function (req, res, next) {
  const start = new Date().getTime();

  res.on('finish', () => {
    const duration = new Date().getTime() - start;
    logger.info(`Method: ${req.method}, URL: ${req.url}, Status: ${res.statusCode}, Duration: ${duration}ms`);
  });

  next();
}
