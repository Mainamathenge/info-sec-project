import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';

export interface TokenPayload {
    userId: string;
    username: string;
    role: string;
}

export class JWTUtil {
    static generateToken(user: User): string {
        const payload: TokenPayload = {
            userId: user.id,
            username: user.username,
            role: user.role,
        };

        const options: SignOptions = {
            expiresIn: config.jwtExpiresIn as any, // jwt expects StringValue branded type
        };

        return jwt.sign(payload, config.jwtSecret, options);
    }

    static verifyToken(token: string): TokenPayload {
        try {
            return jwt.verify(token, config.jwtSecret) as TokenPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    static decodeToken(token: string): TokenPayload | null {
        try {
            return jwt.decode(token) as TokenPayload;
        } catch (error) {
            return null;
        }
    }
}
