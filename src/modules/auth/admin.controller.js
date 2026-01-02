import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { signAccessToken, signRefreshToken } from './jwt.service.js';
import { BadRequestError, UnauthorizedError } from '../../errors/ApiError.js';

/**
 * Admin Login Controller
 * Separate from regular user login for security
 */

export const adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new BadRequestError('Email and password are required');
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        
        // Check if user exists and is admin
        if (!user || user.role !== 'ADMIN') {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Check if account is active
        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedError('Account is suspended');
        }

        // Generate tokens
        const accessToken = signAccessToken({ 
            sub: user.id, 
            email: user.email, 
            role: user.role 
        });
        const refreshToken = signRefreshToken({ sub: user.id });

        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            },
            accessToken
        });
    } catch (error) {
        next(error);
    }
};
