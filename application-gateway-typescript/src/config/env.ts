import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
    // Database
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPassword: string;

    // JWT
    jwtSecret: string;
    jwtExpiresIn: string;

    // MFA
    mfaIssuer: string;
    mfaAppName: string;

    // Server
    port: number;
    nodeEnv: string;
    corsOrigin: string;

    // Hyperledger Fabric
    channelName: string;
    chaincodeName: string;
    mspId: string;
    cryptoPath: string;
    peerEndpoint: string;
    peerHostAlias: string;

    // Admin
    adminMspIds: string[];

    // Email
    mailtrapToken: string;
    mailtrapSenderEmail: string;
    mailtrapSenderName: string;
}

export const config: EnvConfig = {
    // Database
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: parseInt(process.env.DB_PORT || '5432'),
    dbName: process.env.DB_NAME || 'package_management',
    dbUser: process.env.DB_USER || 'packageadmin',
    dbPassword: process.env.DB_PASSWORD || 'packagepass123',

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // MFA
    mfaIssuer: process.env.MFA_ISSUER || 'PackageManagement',
    mfaAppName: process.env.MFA_APP_NAME || 'Package Management System',

    // Server
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',

    // Hyperledger Fabric
    channelName: process.env.CHANNEL_NAME || 'releasechannel',
    chaincodeName: process.env.CHAINCODE_NAME || 'SoftwareReleaseContract',
    mspId: process.env.MSP_ID || 'Org1MSP',
    cryptoPath: process.env.CRYPTO_PATH || '/Users/mac/Documents/cmu/fall-25/compiled/test-network/organizations/peerOrganizations/org1.example.com',
    peerEndpoint: process.env.PEER_ENDPOINT || 'localhost:7051',
    peerHostAlias: process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com',

    // Admin
    adminMspIds: (process.env.ADMIN_MSP_IDS || 'Org1MSP').split(',').map(id => id.trim()),

    // Email
    mailtrapToken: process.env.MAILTRAP_TOKEN || '',
    mailtrapSenderEmail: process.env.MAILTRAP_SENDER_EMAIL || 'noreply@packagemanagement.example.com',
    mailtrapSenderName: process.env.MAILTRAP_SENDER_NAME || 'Package Management System',
};
