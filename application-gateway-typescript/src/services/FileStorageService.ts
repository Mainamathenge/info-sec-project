import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export class FileStorageService {
    private storageDir: string;

    constructor(baseDir: string = './packages-storage') {
        this.storageDir = path.resolve(baseDir);
    }

    /**
     * Initialize storage directory
     */
    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
            console.log(`📁 Package storage initialized at: ${this.storageDir}`);
        } catch (error: any) {
            throw new Error(`Failed to create storage directory: ${error.message}`);
        }
    }

    /**
     * Calculate SHA-256 hash of a file buffer
     */
    calculateFileHash(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Get file path for a package version
     */
    private getFilePath(packageId: string, version: string): string {
        return path.join(this.storageDir, packageId, version, 'package.tar.gz');
    }

    /**
     * Get directory path for a package version
     */
    private getVersionDir(packageId: string, version: string): string {
        return path.join(this.storageDir, packageId, version);
    }

    /**
     * Save uploaded file
     */
    async saveFile(packageId: string, version: string, fileBuffer: Buffer): Promise<{ path: string; hash: string; size: number }> {
        try {
            const versionDir = this.getVersionDir(packageId, version);
            const filePath = this.getFilePath(packageId, version);

            // Create directory if it doesn't exist
            await fs.mkdir(versionDir, { recursive: true });

            // Calculate hash before saving
            const hash = this.calculateFileHash(fileBuffer);

            // Save file
            await fs.writeFile(filePath, fileBuffer);

            console.log(`✅ Saved package ${packageId}@${version} (${fileBuffer.length} bytes, hash: ${hash.substring(0, 16)}...)`);

            return {
                path: filePath,
                hash,
                size: fileBuffer.length
            };
        } catch (error: any) {
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    /**
     * Get file for download
     */
    async getFile(packageId: string, version: string): Promise<Buffer> {
        try {
            const filePath = this.getFilePath(packageId, version);
            const buffer = await fs.readFile(filePath);
            return buffer;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`Package file not found: ${packageId}@${version}`);
            }
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    /**
     * Check if file exists
     */
    async fileExists(packageId: string, version: string): Promise<boolean> {
        try {
            const filePath = this.getFilePath(packageId, version);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete a file
     */
    async deleteFile(packageId: string, version: string): Promise<void> {
        try {
            const versionDir = this.getVersionDir(packageId, version);
            await fs.rm(versionDir, { recursive: true, force: true });
            console.log(`🗑️  Deleted package ${packageId}@${version}`);
        } catch (error: any) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * Delete all versions of a package
     */
    async deletePackage(packageId: string): Promise<void> {
        try {
            const packageDir = path.join(this.storageDir, packageId);
            await fs.rm(packageDir, { recursive: true, force: true });
            console.log(`🗑️  Deleted all versions of package ${packageId}`);
        } catch (error: any) {
            throw new Error(`Failed to delete package: ${error.message}`);
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{ totalPackages: number; totalSize: number }> {
        try {
            let totalSize = 0;
            let totalPackages = 0;

            const packages = await fs.readdir(this.storageDir);

            for (const packageId of packages) {
                const packagePath = path.join(this.storageDir, packageId);
                const stat = await fs.stat(packagePath);

                if (stat.isDirectory()) {
                    const versions = await fs.readdir(packagePath);
                    totalPackages += versions.length;

                    for (const version of versions) {
                        const filePath = this.getFilePath(packageId, version);
                        try {
                            const fileStat = await fs.stat(filePath);
                            totalSize += fileStat.size;
                        } catch {
                            // File doesn't exist, skip
                        }
                    }
                }
            }

            return { totalPackages, totalSize };
        } catch (error: any) {
            throw new Error(`Failed to get storage stats: ${error.message}`);
        }
    }
}

// Export singleton instance
export const fileStorage = new FileStorageService();
