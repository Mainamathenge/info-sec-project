import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { db } from './config/database';
import { fabricNetwork } from './utils/fabricNetwork';
import { fileStorage } from './services/FileStorageService';

// Import routes
import authRoutes from './routes/auth';
import packageRoutes from './routes/packages';
import commentRoutes from './routes/comments';
import subscriptionRoutes from './routes/subscriptions';

// Create Express app
const app = express();

// Middleware
app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Package Management Backend is running' });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/packages', packageRoutes);
app.use('/comments', commentRoutes);
app.use('/subscriptions', subscriptionRoutes);

// Legacy endpoints (deprecated - return helpful error messages)
app.post('/publish', async (req: Request, res: Response): Promise<void> => {
    res.status(410).json({
        error: 'This endpoint is deprecated. Please use POST /packages/upload with authentication.',
    });
});

app.get('/release/:packageId/:version', async (req: Request, res: Response) => {
    res.status(410).json({
        error: 'This endpoint is deprecated. Please use GET /packages/:packageId/:version',
    });
});

app.post('/validate', async (req: Request, res: Response) => {
    res.status(410).json({
        error: 'This endpoint is deprecated. Please use POST /packages/:packageId/:version/validate-file',
    });
});

app.post('/discontinue', async (req: Request, res: Response) => {
    res.status(410).json({
        error: 'This endpoint is deprecated. Please use DELETE /packages/:packageId with admin authentication.',
    });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: config.nodeEnv === 'development' ? err.message : undefined,
    });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        console.log('\n🔌 Connecting to database...');
        const dbConnected = await db.testConnection();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }

        // Initialize file storage
        console.log('\n📁 Initializing file storage...');
        await fileStorage.initialize();

        // Setup Fabric connection
        await fabricNetwork.connect();

        // Start Express server
        app.listen(config.port, () => {
            console.log('\n🌍 Package Management Backend is running!');
            console.log(`📍 Server: http://localhost:${config.port}`);
            console.log(`🏥 Health Check: http://localhost:${config.port}/health`);
            console.log(`🔗 Blockchain Network: ${config.channelName}`);
            console.log(`📦 Chaincode: ${config.chaincodeName}`);
            console.log('\n📚 Available Endpoints:');
            console.log('  Authentication:');
            console.log('    POST   /auth/register');
            console.log('    POST   /auth/login');
            console.log('    POST   /auth/mfa/setup');
            console.log('    POST   /auth/mfa/verify');
            console.log('    POST   /auth/mfa/disable');
            console.log('  Packages:');
            console.log('    POST   /packages/upload (with file) 📤');
            console.log('    GET    /packages');
            console.log('    GET    /packages/:packageId');
            console.log('    GET    /packages/:packageId/:version');
            console.log('    GET    /packages/:packageId/:version/download-file 📥');
            console.log('    POST   /packages/:packageId/:version/validate-file');
            console.log('    DELETE /packages/:packageId (admin only)');
            console.log('  Comments:');
            console.log('    POST   /comments/:packageId/:version (authenticated)');
            console.log('    GET    /comments/:packageId/:version');
            console.log('    PUT    /comments/:commentId (authenticated)');
            console.log('    DELETE /comments/:commentId (authenticated)');
            console.log('  Subscriptions:');
            console.log('    POST   /subscriptions/:packageId (authenticated)');
            console.log('    DELETE /subscriptions/:packageId (authenticated)');
            console.log('    GET    /subscriptions (authenticated)');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await fabricNetwork.disconnect();
    await db.end();
    process.exit(0);
});

startServer().catch(console.error);