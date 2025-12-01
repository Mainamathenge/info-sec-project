import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { PackageModel } from '../models/Package';
import { DownloadLogModel } from '../models/DownloadLog';
import { NotificationService } from '../services/NotificationService';
import { fileStorage } from '../services/FileStorageService';
import { fabricNetwork } from '../utils/fabricNetwork';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAdmin, requirePackageOwner } from '../middleware/authorization';
import { validate } from '../middleware/validation';
import { uploadSingle, handleUploadError } from '../middleware/upload';

const router = Router();

/**
 * POST /packages/upload
 * Upload and publish a package with file
 */
router.post(
    '/upload',
    authenticate,
    requireOwnerOrAdmin,
    uploadSingle,
    handleUploadError,
    validate([
        body('packageId').matches(/^[a-z0-9.-]+$/).withMessage('Package ID must be lowercase alphanumeric with dots/dashes'),
        body('version').matches(/^\d+\.\d+\.\d+$/).withMessage('Version must follow semantic versioning (e.g., 1.0.0)'),
        body('name').trim().isLength({ min: 1, max: 255 }),
        body('description').optional().trim(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId, version, name, description } = req.body;

            // Validate file was uploaded
            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            // Check if package exists in DB, if not create it
            let pkg = await PackageModel.findById(packageId);
            if (!pkg) {
                pkg = await PackageModel.create({
                    package_id: packageId,
                    owner_id: req.user!.userId,
                    name,
                    description,
                });
            } else {
                // Verify ownership
                if (pkg.owner_id !== req.user!.userId && req.user!.role !== 'ADMIN') {
                    res.status(403).json({ error: 'Only package owner can publish new versions' });
                    return;
                }
            }

            // Save file and calculate hash
            const { hash: fileHash, size } = await fileStorage.saveFile(packageId, version, req.file.buffer);

            // Publish to blockchain
            await fabricNetwork.publishRelease(packageId, version, fileHash);

            // Notify subscribers
            await NotificationService.notifyVersionUpdate(packageId, version);

            res.status(201).json({
                message: 'Package published successfully',
                package: {
                    packageId,
                    version,
                    name: pkg.name,
                    fileHash,
                    size,
                    downloadUrl: `/packages/${packageId}/${version}/download-file`
                },
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * GET /packages
 * List all packages
 */
router.get(
    '/',
    validate([
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('offset').optional().isInt({ min: 0 }).toInt(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const packages = await PackageModel.findAll(limit, offset);
            res.json({ packages, limit, offset });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * GET /packages/:packageId
 * Get package metadata
 */
router.get(
    '/:packageId',
    validate([
        param('packageId').notEmpty(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId } = req.params;
            const pkg = await PackageModel.findById(packageId);

            if (!pkg) {
                res.status(404).json({ error: 'Package not found' });
                return;
            }

            res.json(pkg);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * GET /packages/:packageId/:version
 * Get specific version details from blockchain
 */
router.get(
    '/:packageId/:version',
    validate([
        param('packageId').notEmpty(),
        param('version').matches(/^\d+\.\d+\.\d+$/),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId, version } = req.params;

            const release = await fabricNetwork.getRelease(packageId, version);

            // Get download count
            const downloadCount = await DownloadLogModel.getDownloadCount(packageId, version);

            // Check if file exists
            const fileExists = await fileStorage.fileExists(packageId, version);

            res.json({
                ...release,
                downloadCount,
                fileAvailable: fileExists,
                downloadUrl: fileExists ? `/packages/${packageId}/${version}/download-file` : null
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * GET /packages/:packageId/:version/download-file
 * Download the actual package file
 */
router.get(
    '/:packageId/:version/download-file',
    optionalAuth,
    validate([
        param('packageId').notEmpty(),
        param('version').matches(/^\d+\.\d+\.\d+$/),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId, version } = req.params;

            // Get release from blockchain to check status
            const release = await fabricNetwork.getRelease(packageId, version);

            // Check if version is active
            if (release.status !== 'ACTIVE') {
                res.status(403).json({ error: `Version ${version} is ${release.status}` });
                return;
            }

            // Get file
            const fileBuffer = await fileStorage.getFile(packageId, version);

            // Log download
            const userId = req.user?.userId || null;
            const ipAddress = req.ip || null;
            await DownloadLogModel.create(packageId, version, userId, ipAddress);

            // Send file
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Disposition', `attachment; filename="${packageId}-${version}.tar.gz"`);
            res.send(fileBuffer);
        } catch (error: any) {
            console.error(error);
            if (error.message.includes('not found')) {
                res.status(404).json({ error: 'Package file not found' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
);

/**
 * POST /packages/:packageId/:version/validate-file
 * Validate an uploaded file against blockchain hash
 */
router.post(
    '/:packageId/:version/validate-file',
    uploadSingle,
    handleUploadError,
    validate([
        param('packageId').notEmpty(),
        param('version').matches(/^\d+\.\d+\.\d+$/),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId, version } = req.params;

            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded for validation' });
                return;
            }

            // Calculate hash of uploaded file
            const uploadedHash = fileStorage.calculateFileHash(req.file.buffer);

            // Get expected hash from blockchain
            const release = await fabricNetwork.getRelease(packageId, version);
            const expectedHash = release.fileHash;

            // Validate
            const valid = await fabricNetwork.validateRelease(packageId, version, uploadedHash);

            res.json({
                valid,
                expectedHash,
                actualHash: uploadedHash,
                message: valid ? 'File integrity verified ✓' : 'File has been tampered with ✗'
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * DELETE /packages/:packageId
 * Discontinue entire package (admin only)
 */
router.delete(
    '/:packageId',
    authenticate,
    requireAdmin,
    validate([
        param('packageId').notEmpty(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId } = req.params;

            // Delete from database
            await PackageModel.delete(packageId);

            // Delete all files
            await fileStorage.deletePackage(packageId);

            // Notify subscribers
            await NotificationService.notifyPackageDiscontinued(packageId);

            res.json({ message: 'Package discontinued successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

export default router;
