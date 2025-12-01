import { db } from '../config/database';

export interface Comment {
    id: string;
    package_id: string;
    version: string;
    user_id: string;
    comment_text: string;
    rating: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface CommentWithUser extends Comment {
    username: string;
}

export interface CreateCommentInput {
    package_id: string;
    version: string;
    user_id: string;
    comment_text: string;
    rating?: number;
}

export class CommentModel {
    static async create(input: CreateCommentInput): Promise<Comment> {
        const { package_id, version, user_id, comment_text, rating = null } = input;

        const result = await db.query(
            `INSERT INTO comments (package_id, version, user_id, comment_text, rating) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [package_id, version, user_id, comment_text, rating]
        );

        return result.rows[0];
    }

    static async findById(commentId: string): Promise<Comment | null> {
        const result = await db.query(
            'SELECT * FROM comments WHERE id = $1',
            [commentId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    static async findByPackageVersion(packageId: string, version: string): Promise<CommentWithUser[]> {
        const result = await db.query(
            `SELECT c.*, u.username 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.package_id = $1 AND c.version = $2 
             ORDER BY c.created_at DESC`,
            [packageId, version]
        );
        return result.rows;
    }

    static async update(commentId: string, commentText: string, rating?: number): Promise<Comment> {
        const result = await db.query(
            `UPDATE comments 
             SET comment_text = $1, rating = $2 
             WHERE id = $3 
             RETURNING *`,
            [commentText, rating, commentId]
        );
        return result.rows[0];
    }

    static async delete(commentId: string): Promise<void> {
        await db.query('DELETE FROM comments WHERE id = $1', [commentId]);
    }

    static async isOwner(commentId: string, userId: string): Promise<boolean> {
        const result = await db.query(
            'SELECT user_id FROM comments WHERE id = $1',
            [commentId]
        );
        return result.rows.length > 0 && result.rows[0].user_id === userId;
    }

    static async getAverageRating(packageId: string, version: string): Promise<number | null> {
        const result = await db.query(
            `SELECT AVG(rating)::numeric(3,2) as avg_rating 
             FROM comments 
             WHERE package_id = $1 AND version = $2 AND rating IS NOT NULL`,
            [packageId, version]
        );
        return result.rows[0]?.avg_rating || null;
    }
}
