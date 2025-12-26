/**
 * Validation Error Class
 * For request validation failures
 */

export class ValidationError extends Error {
    constructor(message, fields = []) {
        super(message);

        this.name = 'ValidationError';
        this.statusCode = 422;
        this.fields = fields;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                message: this.message,
                statusCode: this.statusCode,
                fields: this.fields,
                timestamp: this.timestamp
            }
        };
    }
}

export default ValidationError;
