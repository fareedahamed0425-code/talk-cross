import { Router } from 'express';
import {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriendsList,
  removeFriend,
} from '../controllers/friendsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/request', sendFriendRequest);
router.get('/requests', getFriendRequests);
router.post('/accept', acceptFriendRequest);
router.post('/reject', rejectFriendRequest);
router.post('/cancel', cancelFriendRequest);
router.get('/', getFriendsList);
router.delete('/:friendId', removeFriend);

export default router;
