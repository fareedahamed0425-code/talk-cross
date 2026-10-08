import { Router } from 'express';
import authRoutes from './authRoutes.js';
import usersRoutes from './usersRoutes.js';
import friendsRoutes from './friendsRoutes.js';
import conversationsRoutes from './conversationsRoutes.js';
import messagesRoutes from './messagesRoutes.js';
import stickersRoutes from './stickersRoutes.js';
import mediaRoutes from './mediaRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/friends', friendsRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/messages', messagesRoutes);
router.use('/stickers', stickersRoutes);
router.use('/media', mediaRoutes);

export default router;

