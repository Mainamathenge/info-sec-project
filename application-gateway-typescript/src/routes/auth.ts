import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post(
    '/register',
    validate([
        body('username').trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-50 characters and alphanumeric'),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('role').optional().isIn(['USER', 'OWNER', 'ADMIN']),
    ]),
    async (req: Request, res: Response) => {
        try {
            const user = await AuthService.register(req.body);
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /auth/login
 * Login a user
 */
router.post(
    '/login',
    validate([
        body('username').trim().notEmpty(),
        body('password').notEmpty(),
        body('mfaToken').optional().isString(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { username, password, mfaToken } = req.body;
            const result = await AuthService.login(username, password, mfaToken);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }
);

/**
 * POST /auth/mfa/setup
 * Setup MFA for authenticated user
 */
router.post('/mfa/setup', authenticate, async (req: Request, res: Response) => {
    try {
        const result = await AuthService.setupMFA(req.user!.userId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/mfa/verify
 * Enable MFA after verification
 */
router.post(
    '/mfa/verify',
    authenticate,
    validate([
        body('secret').notEmpty(),
        body('token').notEmpty().isLength({ min: 6, max: 6 }),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { secret, token } = req.body;
            await AuthService.enableMFA(req.user!.userId, secret, token);
            res.json({ message: 'MFA enabled successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /auth/mfa/disable
 * Disable MFA for authenticated user
 */
router.post(
    '/mfa/disable',
    authenticate,
    validate([
        body('password').notEmpty(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const { password } = req.body;
            await AuthService.disableMFA(req.user!.userId, password);
            res.json({ message: 'MFA disabled successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

export default router;
