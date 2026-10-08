import { Router } from 'express';
import {
  getConversations,
  getConversationById,
  getOrCreateConversation,
} from '../controllers/conversationsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getConversations);
router.post('/', getOrCreateConversation);
router.get('/:id', getConversationById);

export default router;
