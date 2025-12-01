import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { CommentModel } from '../models/Comment';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorization';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * POST /packages/:packageId/:version/comments
 * Add a comment to a release
 */
router.post(
    '/:packageId/:version',
    authenticate,
    validate([
        param('packageId').notEmpty(),
        param('version').matches(/^\d+\.\d+\.\d+$/),
        body('commentText').trim().isLength({ min: 1, max: 5000 }),
        body('rating').optional().isInt({ min: 1, max: 5 }),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId, version } = req.params;
            const { commentText, rating } = req.body;

            const comment = await CommentModel.create({
                package_id: packageId,
                version,
                user_id: req.user!.userId,
                comment_text: commentText,
                rating,
            });

            res.status(201).json({
                message: 'Comment added successfully',
                comment,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * GET /packages/:packageId/:version/comments
 * Get all comments for a release
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

            const comments = await CommentModel.findByPackageVersion(packageId, version);
            const averageRating = await CommentModel.getAverageRating(packageId, version);

            res.json({
                comments,
                averageRating,
                totalComments: comments.length,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * PUT /comments/:commentId
 * Update own comment
 */
router.put(
    '/:commentId',
    authenticate,
    validate([
        param('commentId').isUUID(),
        body('commentText').trim().isLength({ min: 1, max: 5000 }),
        body('rating').optional().isInt({ min: 1, max: 5 }),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { commentId } = req.params;
            const { commentText, rating } = req.body;

            // Check ownership
            const isOwner = await CommentModel.isOwner(commentId, req.user!.userId);
            if (!isOwner && req.user!.role !== 'ADMIN') {
                res.status(403).json({ error: 'You can only update your own comments' });
                return;
            }

            const comment = await CommentModel.update(commentId, commentText, rating);

            res.json({
                message: 'Comment updated successfully',
                comment,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * DELETE /comments/:commentId
 * Delete own comment (or admin can delete any)
 */
router.delete(
    '/:commentId',
    authenticate,
    validate([
        param('commentId').isUUID(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { commentId } = req.params;

            // Check ownership
            const isOwner = await CommentModel.isOwner(commentId, req.user!.userId);
            if (!isOwner && req.user!.role !== 'ADMIN') {
                res.status(403).json({ error: 'You can only delete your own comments' });
                return;
            }

            await CommentModel.delete(commentId);

            res.json({ message: 'Comment deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

export default router;
