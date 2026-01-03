import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-supersure-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-supersure-refresh-secret-change-in-production';

export const signAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }); // Increased from 15m to 24h
};

export const signRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};
