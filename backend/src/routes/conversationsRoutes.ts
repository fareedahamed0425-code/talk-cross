import { Router } from 'express';
import {
  getConversations,
  getConversationById,
  getOrCreateConversation,
  createGroupConversation,
} from '../controllers/conversationsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getConversations);
router.post('/', getOrCreateConversation);
router.post('/group', createGroupConversation);
router.get('/:id', getConversationById);

export default router;
