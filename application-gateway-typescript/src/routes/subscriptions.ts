import { Router, Request, Response } from 'express';
import { param } from 'express-validator';
import { SubscriptionModel } from '../models/Subscription';
import { PackageModel } from '../models/Package';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * POST /packages/:packageId/subscribe
 * Subscribe to package updates
 */
router.post(
    '/:packageId',
    authenticate,
    validate([
        param('packageId').notEmpty(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId } = req.params;

            // Check if package exists
            const pkg = await PackageModel.findById(packageId);
            if (!pkg) {
                res.status(404).json({ error: 'Package not found' });
                return;
            }

            await SubscriptionModel.subscribe(req.user!.userId, packageId);

            res.status(201).json({ message: 'Subscribed successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * DELETE /packages/:packageId/subscribe
 * Unsubscribe from package updates
 */
router.delete(
    '/:packageId',
    authenticate,
    validate([
        param('packageId').notEmpty(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { packageId } = req.params;

            await SubscriptionModel.unsubscribe(req.user!.userId, packageId);

            res.json({ message: 'Unsubscribed successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * GET /subscriptions
 * Get user's subscriptions
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const packageIds = await SubscriptionModel.getUserSubscriptions(req.user!.userId);

        // Get package details for each subscription
        const packages = await Promise.all(
            packageIds.map(id => PackageModel.findById(id))
        );

        res.json({
            subscriptions: packages.filter(pkg => pkg !== null),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
