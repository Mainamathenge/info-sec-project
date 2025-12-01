import crypto from 'crypto';

export class HashUtil {
    /**
     * Generate SHA-256 hash of a file buffer
     */
    static generateSHA256(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Validate if a file buffer matches the expected hash
     */
    static validateHash(buffer: Buffer, expectedHash: string): boolean {
        const actualHash = this.generateSHA256(buffer);
        return actualHash === expectedHash;
    }

    /**
     * Generate a random secret for MFA
     */
    static generateSecret(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }
}
