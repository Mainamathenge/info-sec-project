import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Gateway, hash, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { config } from '../config/env';

class FabricNetworkService {
    private contract: Contract | null = null;
    private gateway: Gateway | null = null;

    /**
     * Initialize connection to Fabric network
     */
    async connect(): Promise<void> {
        console.log("\n🚀 Connecting to Hyperledger Fabric...");

        const keyDirectoryPath = `${config.cryptoPath}/users/User1@org1.example.com/msp/keystore`;
        const certDirectoryPath = `${config.cryptoPath}/users/User1@org1.example.com/msp/signcerts`;
        const tlsCertPath = `${config.cryptoPath}/peers/peer0.org1.example.com/tls/ca.crt`;

        const client = await this.newGrpcConnection(tlsCertPath);

        this.gateway = connect({
            client,
            identity: await this.newIdentity(certDirectoryPath),
            signer: await this.newSigner(keyDirectoryPath),
            hash: hash.sha256,
        });

        const network = this.gateway.getNetwork(config.channelName);
        this.contract = network.getContract(config.chaincodeName);

        console.log("✔ Connected to Fabric and contract loaded:", config.chaincodeName);
    }

    /**
     * Get the contract instance (must call connect() first)
     */
    getContract(): Contract {
        if (!this.contract) {
            throw new Error('Fabric network not connected. Call connect() first.');
        }
        return this.contract;
    }

    /**
     * Publish a release to the blockchain
     */
    async publishRelease(packageId: string, version: string, fileHash: string): Promise<void> {
        const contract = this.getContract();
        await contract.submitTransaction(
            'SoftwareReleaseContract:PublishRelease',
            packageId,
            version,
            fileHash
        );
        console.log(`✅ Published release ${packageId}@${version} to blockchain`);
    }

    /**
     * Get release details from blockchain
     */
    async getRelease(packageId: string, version: string): Promise<any> {
        const contract = this.getContract();
        const resultBytes = await contract.evaluateTransaction(
            'SoftwareReleaseContract:GetRelease',
            packageId,
            version
        );
        const resultJson = new TextDecoder().decode(resultBytes);
        return JSON.parse(resultJson);
    }

    /**
     * Validate a release hash
     */
    async validateRelease(packageId: string, version: string, fileHash: string): Promise<boolean> {
        const contract = this.getContract();
        const resultBytes = await contract.evaluateTransaction(
            'SoftwareReleaseContract:ValidateRelease',
            packageId,
            version,
            fileHash
        );
        const result = new TextDecoder().decode(resultBytes).trim();
        return result === "true";
    }

    /**
     * Discontinue a release
     */
    async discontinueRelease(packageId: string, version: string): Promise<void> {
        const contract = this.getContract();
        await contract.submitTransaction(
            'SoftwareReleaseContract:DiscontinueRelease',
            packageId,
            version
        );
        console.log(`🛑 Discontinued release ${packageId}@${version}`);
    }

    /**
     * Close the gateway connection
     */
    async disconnect(): Promise<void> {
        if (this.gateway) {
            this.gateway.close();
            console.log("✔ Disconnected from Fabric network");
        }
    }

    // Private helper methods

    private async newGrpcConnection(tlsCertPath: string): Promise<grpc.Client> {
        const tlsRootCert = await fs.readFile(tlsCertPath);
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        return new grpc.Client(config.peerEndpoint, tlsCredentials, {
            'grpc.ssl_target_name_override': config.peerHostAlias,
        });
    }

    private async newIdentity(certDirectoryPath: string): Promise<Identity> {
        const certPath = path.join(certDirectoryPath, "cert.pem");
        console.log("Using cert:", certPath);
        const credentials = await fs.readFile(certPath);
        return { mspId: config.mspId, credentials };
    }

    private async newSigner(keyDirectoryPath: string): Promise<Signer> {
        const keyPath = await this.getFirstFile(keyDirectoryPath);
        console.log("Using key:", keyPath);
        const privateKeyPem = await fs.readFile(keyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }

    private async getFirstFile(dirPath: string): Promise<string> {
        const files = await fs.readdir(dirPath);
        if (files.length === 0) {
            throw new Error(`No files found in directory: ${dirPath}`);
        }
        return path.join(dirPath, files[0]!);
    }
}

// Export singleton instance
export const fabricNetwork = new FabricNetworkService();
