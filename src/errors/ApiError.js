/**
 * Custom API Error Class
 * Standardized error handling for AssetLink Custody
 */

export class ApiError extends Error {
    constructor(statusCode, message, details = null, isOperational = true) {
        super(message);

        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                message: this.message,
                statusCode: this.statusCode,
                details: this.details,
                timestamp: this.timestamp
            }
        };
    }
}

// Common error factory methods
export const BadRequestError = (message, details = null) => {
    return new ApiError(400, message, details);
};

export const UnauthorizedError = (message = 'Unauthorized', details = null) => {
    return new ApiError(401, message, details);
};

export const ForbiddenError = (message = 'Forbidden', details = null) => {
    return new ApiError(403, message, details);
};

export const NotFoundError = (message, details = null) => {
    return new ApiError(404, message, details);
};

export const ConflictError = (message, details = null) => {
    return new ApiError(409, message, details);
};

export const InternalServerError = (message = 'Internal server error', details = null) => {
    return new ApiError(500, message, details, false);
};

export default ApiError;
