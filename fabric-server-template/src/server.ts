/*
 * Production Fabric Server
 * Connects to Fabric network and provides REST API
 */

import express from 'express';
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Gateway, Identity, Signer, signers, hash } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Configuration from environment variables
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'releasechannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'assetcontract';
const MSP_ID = process.env.MSP_ID || 'Org1MSP';
const PEER_ENDPOINT = process.env.PEER_ENDPOINT || 'localhost:7051';
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com';
const CRYPTO_PATH = process.env.CRYPTO_PATH ||
  path.join(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com');
const PORT = process.env.PORT || 3000;

// Paths to crypto materials
const KEY_DIR = process.env.KEY_DIR || path.join(
  CRYPTO_PATH,
  'users',
  'User1@org1.example.com',
  'msp',
  'keystore'
);
const CERT_DIR = process.env.CERT_DIR || path.join(
  CRYPTO_PATH,
  'users',
  'User1@org1.example.com',
  'msp',
  'signcerts'
);
const TLS_CERT_PATH = process.env.TLS_CERT_PATH || path.join(
  CRYPTO_PATH,
  'peers',
  'peer0.org1.example.com',
  'tls',
  'ca.crt'
);

// Global Gateway connection (reused for all requests)
let gateway: Gateway | null = null;
let contract: Contract | null = null;
let releaseContract: Contract | null = null;

/**
 * Initialize Fabric connection
 * Creates a long-lived Gateway connection that will be reused for all requests
 */
async function initializeFabric(): Promise<void> {
  try {
    console.log('Connecting to Fabric network...');
    console.log(`  Channel: ${CHANNEL_NAME}`);
    console.log(`  Chaincode: ${CHAINCODE_NAME}`);
    console.log(`  Peer: ${PEER_ENDPOINT}`);

    // Create gRPC connection
    const tlsRootCert = await fs.readFile(TLS_CERT_PATH);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    const client = new grpc.Client(PEER_ENDPOINT, tlsCredentials, {
      'grpc.ssl_target_name_override': PEER_HOST_ALIAS,
    });

    // Create identity from certificate
    const certFiles = await fs.readdir(CERT_DIR);
    const certPath = path.join(CERT_DIR, certFiles[0]);
    const credentials = await fs.readFile(certPath);
    const identity: Identity = { mspId: MSP_ID, credentials };

    // Create signer from private key
    const keyFiles = await fs.readdir(KEY_DIR);
    const keyPath = path.join(KEY_DIR, keyFiles[0]);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signer: Signer = signers.newPrivateKeySigner(privateKey);

    // Create Gateway connection (long-lived, reused for all requests)
    gateway = connect({
      client,
      identity,
      signer,
      hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),      // 5 seconds for queries
      endorseOptions: () => ({ deadline: Date.now() + 15000 }),       // 15 seconds for endorsement
      submitOptions: () => ({ deadline: Date.now() + 5000 }),         // 5 seconds for submit
      commitStatusOptions: () => ({ deadline: Date.now() + 60000 }), // 60 seconds for commit status
    });

    // Get network and contract
    const network = gateway.getNetwork(CHANNEL_NAME);
    contract = network.getContract(CHAINCODE_NAME);
    releaseContract = network.getContract(CHAINCODE_NAME, 'SoftwareReleaseContract');

    console.log('✓ Successfully connected to Fabric network');
  } catch (error) {
    console.error('✗ Failed to initialize Fabric connection:', error);
    throw error;
  }
}

// ==================== REST API Routes ====================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fabric-server',
    connected: gateway !== null && contract !== null,
    channel: CHANNEL_NAME,
    chaincode: CHAINCODE_NAME
  });
});

/**
 * Publish a new asset to the ledger
 * POST /api/assets
 */
app.post('/api/assets', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { assetID, name, description, owner, value } = req.body;

    // Validate input
    if (!assetID || !name || !description || !owner || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['assetID', 'name', 'description', 'owner', 'value']
      });
    }

    // Submit transaction to publish asset
    await contract.submitTransaction(
      'PublishAsset',
      assetID,
      name,
      description,
      owner,
      value.toString()
    );

    res.json({
      success: true,
      message: 'Asset published successfully',
      assetID,
    });
  } catch (error: any) {
    console.error('Error publishing asset:', error);

    // Handle specific chaincode errors
    if (error.message && error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Asset already exists',
        assetID: req.body.assetID
      });
    }

    res.status(500).json({
      error: 'Failed to publish asset',
      message: error.message,
    });
  }
});

/**
 * Read an asset from the ledger
 * GET /api/assets/:assetID
 */
app.get('/api/assets/:assetID', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { assetID } = req.params;

    // Evaluate transaction (query - read-only)
    const result = await contract.evaluateTransaction('ReadAsset', assetID);
    const asset = JSON.parse(result.toString());

    res.json(asset);
  } catch (error: any) {
    console.error('Error reading asset:', error);

    if (error.message && error.message.includes('does not exist')) {
      return res.status(404).json({
        error: 'Asset not found',
        assetID: req.params.assetID
      });
    }

    res.status(500).json({
      error: 'Failed to read asset',
      message: error.message,
    });
  }
});

/**
 * Get all assets from the ledger
 * GET /api/assets
 */
app.get('/api/assets', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    // Evaluate transaction (query - read-only)
    const result = await contract.evaluateTransaction('GetAllAssets');
    const assets = JSON.parse(result.toString());

    res.json(assets);
  } catch (error: any) {
    console.error('Error getting assets:', error);
    res.status(500).json({
      error: 'Failed to get assets',
      message: error.message,
    });
  }
});

/**
 * Update an existing asset
 * PUT /api/assets/:assetID
 */
app.put('/api/assets/:assetID', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { assetID } = req.params;
    const { name, description, owner, value } = req.body;

    if (!name || !description || !owner || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'description', 'owner', 'value']
      });
    }

    // Submit transaction to update asset
    await contract.submitTransaction(
      'UpdateAsset',
      assetID,
      name,
      description,
      owner,
      value.toString()
    );

    res.json({
      success: true,
      message: 'Asset updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating asset:', error);

    if (error.message && error.message.includes('does not exist')) {
      return res.status(404).json({
        error: 'Asset not found',
        assetID: req.params.assetID
      });
    }

    res.status(500).json({
      error: 'Failed to update asset',
      message: error.message,
    });
  }
});

/**
 * Delete an asset from the ledger
 * DELETE /api/assets/:assetID
 */
app.delete('/api/assets/:assetID', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { assetID } = req.params;

    // Submit transaction to delete asset
    await contract.submitTransaction('DeleteAsset', assetID);

    res.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting asset:', error);

    if (error.message && error.message.includes('does not exist')) {
      return res.status(404).json({
        error: 'Asset not found',
        assetID: req.params.assetID
      });
    }

    res.status(500).json({
      error: 'Failed to delete asset',
      message: error.message,
    });
  }
});

// ==================== Software Release Routes ====================

/**
 * Publish a new software release
 * POST /api/releases
 */
app.post('/api/releases', async (req, res) => {
  try {
    if (!releaseContract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { packageId, version, fileHash } = req.body;

    if (!packageId || !version || !fileHash) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['packageId', 'version', 'fileHash']
      });
    }

    await releaseContract.submitTransaction(
      'PublishRelease',
      packageId,
      version,
      fileHash
    );

    res.json({
      success: true,
      message: 'Release published successfully',
      packageId,
      version
    });
  } catch (error: any) {
    console.error('Error publishing release:', error);
    if (error.message && error.message.includes('already exists')) {
      return res.status(409).json({ error: 'Release already exists' });
    }
    res.status(500).json({ error: 'Failed to publish release', message: error.message });
  }
});

/**
 * Discontinue a software release
 * PUT /api/releases/:packageId/:version/discontinue
 */
app.put('/api/releases/:packageId/:version/discontinue', async (req, res) => {
  try {
    if (!releaseContract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { packageId, version } = req.params;

    await releaseContract.submitTransaction(
      'DiscontinueRelease',
      packageId,
      version
    );

    res.json({
      success: true,
      message: 'Release discontinued successfully',
    });
  } catch (error: any) {
    console.error('Error discontinuing release:', error);
    res.status(500).json({ error: 'Failed to discontinue release', message: error.message });
  }
});

/**
 * Validate a software release
 * POST /api/releases/validate
 */
app.post('/api/releases/validate', async (req, res) => {
  try {
    if (!releaseContract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { packageId, version, fileHash } = req.body;

    if (!packageId || !version || !fileHash) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['packageId', 'version', 'fileHash']
      });
    }

    const result = await releaseContract.evaluateTransaction(
      'ValidateRelease',
      packageId,
      version,
      fileHash
    );

    const isValid = result.toString() === 'true';

    res.json({
      isValid,
      packageId,
      version
    });
  } catch (error: any) {
    console.error('Error validating release:', error);
    res.status(500).json({ error: 'Failed to validate release', message: error.message });
  }
});

/**
 * Get release details
 * GET /api/releases/:packageId/:version
 */
app.get('/api/releases/:packageId/:version', async (req, res) => {
  try {
    if (!releaseContract) {
      return res.status(503).json({ error: 'Fabric not connected' });
    }

    const { packageId, version } = req.params;

    const result = await releaseContract.evaluateTransaction(
      'GetRelease',
      packageId,
      version
    );
    const release = JSON.parse(result.toString());

    res.json(release);
  } catch (error: any) {
    console.error('Error getting release:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Release not found' });
    }
    res.status(500).json({ error: 'Failed to get release', message: error.message });
  }
});

// ==================== Server Startup ====================

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize Fabric connection
    await initializeFabric();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('Fabric Server Started');
      console.log('========================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`Channel: ${CHANNEL_NAME}`);
      console.log(`Chaincode: ${CHAINCODE_NAME}`);
      console.log(`MSP: ${MSP_ID}`);
      console.log('');
      console.log('API Endpoints:');
      console.log(`  GET  http://localhost:${PORT}/health`);
      console.log(`  GET  http://localhost:${PORT}/api/assets`);
      console.log(`  GET  http://localhost:${PORT}/api/assets/:assetID`);
      console.log(`  POST http://localhost:${PORT}/api/assets`);
      console.log(`  PUT  http://localhost:${PORT}/api/assets/:assetID`);
      console.log(`  DELETE http://localhost:${PORT}/api/assets/:assetID`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  if (gateway) {
    gateway.close();
    console.log('✓ Gateway connection closed');
  }
  console.log('✓ Server stopped');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down server...');
  if (gateway) {
    gateway.close();
    console.log('✓ Gateway connection closed');
  }
  console.log('✓ Server stopped');
  process.exit(0);
});

// Start the server
startServer();

