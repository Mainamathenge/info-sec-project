import { db } from '../config/database';

export interface DownloadLog {
    id: string;
    package_id: string;
    version: string;
    user_id: string | null;
    download_timestamp: Date;
    ip_address: string | null;
}

export class DownloadLogModel {
    static async create(packageId: string, version: string, userId: string | null, ipAddress: string | null): Promise<DownloadLog> {
        const result = await db.query(
            `INSERT INTO download_logs (package_id, version, user_id, ip_address) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [packageId, version, userId, ipAddress]
        );
        return result.rows[0];
    }

    static async getDownloadCount(packageId: string, version?: string): Promise<number> {
        if (version) {
            const result = await db.query(
                'SELECT COUNT(*) as count FROM download_logs WHERE package_id = $1 AND version = $2',
                [packageId, version]
            );
            return parseInt(result.rows[0].count);
        } else {
            const result = await db.query(
                'SELECT COUNT(*) as count FROM download_logs WHERE package_id = $1',
                [packageId]
            );
            return parseInt(result.rows[0].count);
        }
    }

    static async getRecentDownloads(packageId: string, limit = 10): Promise<DownloadLog[]> {
        const result = await db.query(
            `SELECT * FROM download_logs 
             WHERE package_id = $1 
             ORDER BY download_timestamp DESC 
             LIMIT $2`,
            [packageId, limit]
        );
        return result.rows;
    }
}
