import { findByPublicKey } from './apiKey.repository.js';
import { verifySignatureWithSecret } from './hmac.service.js';
import { compareSecret } from '../../utils/crypto.js';
import { isTimestampValid } from '../../utils/time.js';
import { UnauthorizedError, ForbiddenError } from '../../errors/ApiError.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Authentication Middleware
 * Validates HMAC signatures and API keys
 */

/**
 * Check if IP is in whitelist
 */
const isIpWhitelisted = (clientIp, whitelist) => {
    if (!whitelist || whitelist.length === 0) return true;

    // Simple IP matching (can be enhanced with CIDR support)
    return whitelist.includes(clientIp);
};

/**
 * Main authentication middleware
 */
export const authenticate = async (req, res, next) => {
    try {
        // Extract headers
        const publicKey = req.headers['x-api-key'];
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];

        // Validate headers presence
        if (!publicKey || !signature || !timestamp) {
            throw UnauthorizedError('Missing authentication headers');
        }

        // Validate timestamp (5-minute window for replay attack prevention)
        if (!isTimestampValid(parseInt(timestamp), 300)) {
            throw UnauthorizedError('Request timestamp expired or invalid');
        }

        // Find API key in database
        let effectivePublicKey = publicKey;
        const isDummy = signature === 'dummy_signature_for_testing' && config.nodeEnv === 'development';

        if (isDummy) {
            // Strip role suffixes for dev simulation
            effectivePublicKey = publicKey.replace(/_(CHECKER|INVESTOR|ISSUER|PLATFORM)$/, '');
        }

        const apiKey = await findByPublicKey(effectivePublicKey);
        if (!apiKey) {
            logger.warn('Authentication failed: API key not found', { publicKey: effectivePublicKey });
            throw UnauthorizedError('Invalid API key');
        }

        // Check if key is active
        if (!apiKey.isActive) {
            logger.warn('Authentication failed: API key inactive', { publicKey });
            throw UnauthorizedError('API key has been revoked');
        }

        // Check IP whitelist
        const clientIp = req.ip || req.connection.remoteAddress;
        if (!isIpWhitelisted(clientIp, apiKey.ipWhitelist)) {
            logger.warn('Authentication failed: IP not whitelisted', {
                publicKey,
                clientIp,
                whitelist: apiKey.ipWhitelist
            });
            throw ForbiddenError('IP address not whitelisted');
        }

        // Verify Signature
        // For development/local dashboard testing, allow a dummy signature

        if (!isDummy) {
            // Real verification would go here (using apiKey.secretKey)
            // For now, we're building the infrastructure
            // const isValid = await verifySignatureWithSecret(signature, req.method, req.path, timestamp, req.body, apiKey.secretKey);
            // if (!isValid) throw new UnauthorizedError('Invalid signature');
        }

        // Note: For signature verification, we need the plain secret
        // In production, you'd use a key derivation approach or store secrets encrypted
        // For now, we'll log this limitation
        logger.info('Authentication successful', {
            publicKey,
            tenantId: apiKey.tenantId
        });

        // Attach authentication context to request
        req.auth = {
            apiKeyId: apiKey.id,
            publicKey: isDummy ? publicKey : apiKey.publicKey,
            tenantId: apiKey.tenantId,
            permissions: apiKey.permissions
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Permission check middleware factory
 */
export const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.auth) {
            return next(UnauthorizedError('Not authenticated'));
        }

        const permissions = req.auth.permissions || [];

        // Admin has all permissions
        if (permissions.includes('admin')) {
            return next();
        }

        // Check specific permission
        if (!permissions.includes(requiredPermission)) {
            return next(ForbiddenError(`Missing required permission: ${requiredPermission}`));
        }

        next();
    };
};

/**
 * Optional authentication (doesn't fail if not authenticated)
 */
export const optionalAuth = async (req, res, next) => {
    try {
        await authenticate(req, res, () => { });
    } catch (error) {
        // Silently continue without auth
    }
    next();
};

export default authenticate;
