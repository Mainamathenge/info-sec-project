import bcrypt from 'bcrypt';
import { db } from '../config/database';

export type UserRole = 'USER' | 'OWNER' | 'ADMIN';

export interface User {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    role: UserRole;
    mfa_enabled: boolean;
    mfa_secret: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
}

export class UserModel {
    static async create(input: CreateUserInput): Promise<User> {
        const { username, email, password, role = 'USER' } = input;

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [username, email, password_hash, role]
        );

        return result.rows[0];
    }

    static async findByUsername(username: string): Promise<User | null> {
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    static async findByEmail(email: string): Promise<User | null> {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    static async findById(id: string): Promise<User | null> {
        const result = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    static async verifyPassword(user: User, password: string): Promise<boolean> {
        return await bcrypt.compare(password, user.password_hash);
    }

    static async enableMFA(userId: string, mfaSecret: string): Promise<void> {
        await db.query(
            'UPDATE users SET mfa_enabled = true, mfa_secret = $1 WHERE id = $2',
            [mfaSecret, userId]
        );
    }

    static async disableMFA(userId: string): Promise<void> {
        await db.query(
            'UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1',
            [userId]
        );
    }

    static async updatePassword(userId: string, newPassword: string): Promise<void> {
        const password_hash = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [password_hash, userId]
        );
    }
}
