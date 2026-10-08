import { Router } from 'express';
import { getStickers, createSticker, deleteSticker } from '../controllers/stickersController.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getStickers);
router.post('/', upload.single('image'), createSticker);
router.delete('/:id', deleteSticker);

export default router;
