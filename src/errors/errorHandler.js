import logger from '../utils/logger.js';
import { config } from '../config/env.js';
import ApiError from './ApiError.js';
import ValidationError from './ValidationError.js';

/**
 * Global Error Handler Middleware
 * Catches and formats all errors in the application
 */

export const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    // Handle known error types
    if (err instanceof ApiError || err instanceof ValidationError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    // Handle Prisma errors
    if (err.code && err.code.startsWith('P')) {
        return res.status(400).json({
            error: {
                message: 'Database operation failed',
                details: config.nodeEnv === 'development' ? err.message : undefined,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Handle unexpected errors
    const statusCode = err.statusCode || 500;
    const message = config.nodeEnv === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: {
            message,
            statusCode,
            timestamp: new Date().toISOString(),
            ...(config.nodeEnv === 'development' && { stack: err.stack })
        }
    });
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            statusCode: 404,
            path: req.path,
            timestamp: new Date().toISOString()
        }
    });
};

export default errorHandler;
