import winston from 'winston';
import { config } from '../config/env.js';

/**
 * Winston Logger Configuration
 * Structured logging for AssetLink Custody
 */

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
});

// Create logger instance
const logger = winston.createLogger({
    level: config.logLevel,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
    ),
    defaultMeta: { service: 'assetlink-custody' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: combine(
                colorize(),
                customFormat
            )
        })
    ]
});

// Add file transports in production
if (config.nodeEnv === 'production') {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log'
    }));
}

export default logger;
