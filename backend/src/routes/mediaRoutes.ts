import { Router } from 'express';
import { uploadMedia } from '../controllers/mediaController.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authMiddleware);

router.post('/upload', upload.single('file'), uploadMedia);

export default router;
