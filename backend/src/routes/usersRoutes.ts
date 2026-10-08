import { Router } from 'express';
import { getMe, updateMe, searchUsers, getUserByUsername } from '../controllers/usersController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.get('/search', searchUsers);
router.get('/:username', getUserByUsername);

export default router;
