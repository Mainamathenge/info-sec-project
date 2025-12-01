import { db } from '../config/database';

export interface Package {
    package_id: string;
    owner_id: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreatePackageInput {
    package_id: string;
    owner_id: string;
    name: string;
    description?: string;
}

export class PackageModel {
    static async create(input: CreatePackageInput): Promise<Package> {
        const { package_id, owner_id, name, description = null } = input;

        const result = await db.query(
            `INSERT INTO packages (package_id, owner_id, name, description) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [package_id, owner_id, name, description]
        );

        return result.rows[0];
    }

    static async findById(packageId: string): Promise<Package | null> {
        const result = await db.query(
            'SELECT * FROM packages WHERE package_id = $1',
            [packageId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    static async findByOwnerId(ownerId: string): Promise<Package[]> {
        const result = await db.query(
            'SELECT * FROM packages WHERE owner_id = $1 ORDER BY created_at DESC',
            [ownerId]
        );
        return result.rows;
    }

    static async findAll(limit = 50, offset = 0): Promise<Package[]> {
        const result = await db.query(
            'SELECT * FROM packages ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return result.rows;
    }

    static async update(packageId: string, name: string, description: string): Promise<Package> {
        const result = await db.query(
            `UPDATE packages 
             SET name = $1, description = $2 
             WHERE package_id = $3 
             RETURNING *`,
            [name, description, packageId]
        );
        return result.rows[0];
    }

    static async delete(packageId: string): Promise<void> {
        await db.query('DELETE FROM packages WHERE package_id = $1', [packageId]);
    }

    static async isOwner(packageId: string, userId: string): Promise<boolean> {
        const result = await db.query(
            'SELECT owner_id FROM packages WHERE package_id = $1',
            [packageId]
        );
        return result.rows.length > 0 && result.rows[0].owner_id === userId;
    }
}
