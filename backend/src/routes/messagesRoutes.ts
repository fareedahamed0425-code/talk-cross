import { Router } from 'express';
import {
  getConversationMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationAsRead,
} from '../controllers/messagesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/conversations/:id/messages', getConversationMessages);
router.post('/', sendMessage);
router.patch('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/conversations/:id/read', markConversationAsRead);

export default router;
