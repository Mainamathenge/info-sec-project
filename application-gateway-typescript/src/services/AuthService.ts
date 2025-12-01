import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { UserModel, User } from '../models/User';
import { JWTUtil } from '../utils/jwt';
import { config } from '../config/env';

export interface RegisterInput {
    username: string;
    email: string;
    password: string;
    role?: 'USER' | 'OWNER' | 'ADMIN';
}

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
        role: string;
        mfaEnabled: boolean;
    };
    requiresMFA?: boolean;
}

export interface MFASetupResponse {
    secret: string;
    qrCode: string;
}

export class AuthService {
    /**
     * Register a new user
     */
    static async register(input: RegisterInput): Promise<User> {
        // Check if username already exists
        const existingUser = await UserModel.findByUsername(input.username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        // Check if email already exists
        const existingEmail = await UserModel.findByEmail(input.email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }

        // Validate password strength
        if (input.password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Create user
        const user = await UserModel.create(input);
        return user;
    }

    /**
     * Login a user
     */
    static async login(username: string, password: string, mfaToken?: string): Promise<LoginResponse> {
        // Find user
        const user = await UserModel.findByUsername(username);
        if (!user) {
            throw new Error('Invalid username or password');
        }

        // Verify password
        const isPasswordValid = await UserModel.verifyPassword(user, password);
        if (!isPasswordValid) {
            throw new Error('Invalid username or password');
        }

        // Check if MFA is enabled
        if (user.mfa_enabled && user.mfa_secret) {
            if (!mfaToken) {
                return {
                    token: '',
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        mfaEnabled: true,
                    },
                    requiresMFA: true,
                };
            }

            // Verify MFA token
            const isMFAValid = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'hex',
                token: mfaToken,
                window: 2,
            });

            if (!isMFAValid) {
                throw new Error('Invalid MFA token');
            }
        }

        // Generate JWT token
        const token = JWTUtil.generateToken(user);

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                mfaEnabled: user.mfa_enabled,
            },
        };
    }

    /**
     * Setup MFA for a user
     */
    static async setupMFA(userId: string): Promise<MFASetupResponse> {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate MFA secret
        const secret = speakeasy.generateSecret({
            name: `${config.mfaAppName} (${user.username})`,
            issuer: config.mfaIssuer,
            length: 32,
        });

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

        return {
            secret: secret.hex!,
            qrCode,
        };
    }

    /**
     * Enable MFA for a user after verification
     */
    static async enableMFA(userId: string, secret: string, token: string): Promise<void> {
        // Verify the token
        const isValid = speakeasy.totp.verify({
            secret,
            encoding: 'hex',
            token,
            window: 2,
        });

        if (!isValid) {
            throw new Error('Invalid MFA token');
        }

        // Enable MFA
        await UserModel.enableMFA(userId, secret);
    }

    /**
     * Disable MFA for a user
     */
    static async disableMFA(userId: string, password: string): Promise<void> {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify password
        const isPasswordValid = await UserModel.verifyPassword(user, password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        await UserModel.disableMFA(userId);
    }
}
