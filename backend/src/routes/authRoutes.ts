import { Router } from 'express';
import { syncUser, checkUsername, getAuthConfig } from '../controllers/authController.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/config', getAuthConfig);
router.post('/sync', authMiddleware, syncUser);
router.get('/username-check', optionalAuthMiddleware, checkUsername);

export default router;
