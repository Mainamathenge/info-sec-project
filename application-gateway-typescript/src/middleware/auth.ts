import { Request, Response, NextFunction } from 'express';
import { JWTUtil, TokenPayload } from '../utils/jwt';

// Extend the Express Request interface to include user information
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

/**
 * Middleware to authenticate requests using JWT tokens
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const payload = JWTUtil.verifyToken(token);

        // Attach user info to request
        req.user = payload;

        next();
    } catch (error: any) {
        res.status(401).json({ error: error.message || 'Invalid token' });
    }
};

/**
 * Optional authentication - attaches user if token is present but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = JWTUtil.verifyToken(token);
            req.user = payload;
        }
        next();
    } catch (error) {
        // Ignore errors for optional auth
        next();
    }
};
