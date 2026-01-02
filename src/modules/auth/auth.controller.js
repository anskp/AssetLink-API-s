import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.service.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../../errors/ApiError.js';

export const register = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new BadRequestError('Email and password are required');
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: 'CLIENT',
                status: 'ACTIVE'
            }
        });

        const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
        const refreshToken = signRefreshToken({ sub: user.id });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            user: { id: user.id, email: user.email, role: user.role },
            accessToken
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new BadRequestError('Email and password are required');
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new UnauthorizedError('Invalid email or password');
        }

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedError('User account is suspended');
        }

        const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
        const refreshToken = signRefreshToken({ sub: user.id });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            user: { id: user.id, email: user.email, role: user.role },
            accessToken
        });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new UnauthorizedError('No refresh token provided');
        }

        const payload = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });

        if (!user || user.status !== 'ACTIVE') {
            throw new UnauthorizedError('User not found or suspended');
        }

        const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

        res.json({ accessToken });
    } catch (error) {
        next(new UnauthorizedError('Invalid refresh token'));
    }
};

export const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
};

export const me = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
        if (!user) {
            throw new UnauthorizedError('User not found');
        }
        res.json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
        next(error);
    }
};
