import { Pool, PoolClient } from 'pg';
import { config } from './env';

class Database {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            host: config.dbHost,
            port: config.dbPort,
            database: config.dbName,
            user: config.dbUser,
            password: config.dbPassword,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }

    async query(text: string, params?: any[]) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            if (config.nodeEnv === 'development') {
                console.log('Executed query', { text, duration, rows: res.rowCount });
            }
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async getClient(): Promise<PoolClient> {
        return await this.pool.connect();
    }

    async end() {
        await this.pool.end();
    }

    async testConnection(): Promise<boolean> {
        try {
            const result = await this.query('SELECT NOW()');
            console.log('✔ Database connected:', result.rows[0].now);
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            return false;
        }
    }
}

export const db = new Database();
