import { db } from '../config/database';

export interface Subscription {
    user_id: string;
    package_id: string;
    subscribed_at: Date;
}

export class SubscriptionModel {
    static async subscribe(userId: string, packageId: string): Promise<Subscription> {
        const result = await db.query(
            `INSERT INTO subscriptions (user_id, package_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id, package_id) DO NOTHING
             RETURNING *`,
            [userId, packageId]
        );
        return result.rows[0];
    }

    static async unsubscribe(userId: string, packageId: string): Promise<void> {
        await db.query(
            'DELETE FROM subscriptions WHERE user_id = $1 AND package_id = $2',
            [userId, packageId]
        );
    }

    static async isSubscribed(userId: string, packageId: string): Promise<boolean> {
        const result = await db.query(
            'SELECT 1 FROM subscriptions WHERE user_id = $1 AND package_id = $2',
            [userId, packageId]
        );
        return result.rows.length > 0;
    }

    static async getSubscribersByPackage(packageId: string): Promise<string[]> {
        const result = await db.query(
            'SELECT user_id FROM subscriptions WHERE package_id = $1',
            [packageId]
        );
        return result.rows.map(row => row.user_id);
    }

    static async getUserSubscriptions(userId: string): Promise<string[]> {
        const result = await db.query(
            'SELECT package_id FROM subscriptions WHERE user_id = $1',
            [userId]
        );
        return result.rows.map(row => row.package_id);
    }
}
