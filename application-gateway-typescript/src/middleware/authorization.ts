import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import { PackageModel } from '../models/Package';

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role as UserRole)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
};

/**
 * Middleware to check if user is the owner of a package
 */
export const requirePackageOwner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Admin can access any package
        if (req.user.role === 'ADMIN') {
            next();
            return;
        }

        const packageId = req.params.packageId || req.body.packageId;
        if (!packageId) {
            res.status(400).json({ error: 'Package ID required' });
            return;
        }

        const isOwner = await PackageModel.isOwner(packageId, req.user.userId);
        if (!isOwner) {
            res.status(403).json({ error: 'Only package owner can perform this action' });
            return;
        }

        next();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Middleware to check if user is OWNER or ADMIN
 */
export const requireOwnerOrAdmin = requireRole(['OWNER', 'ADMIN']);

/**
 * Middleware to check if user is ADMIN
 */
export const requireAdmin = requireRole(['ADMIN']);
