import { Router } from 'express';
import { getHealthCheck } from '../controllers/healthController.js';

const router = Router();

router.get('/', getHealthCheck);

export default router;
