import { Router } from 'express';
import { login, refresh, me } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate, loginSchema } from '../middleware/validation';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);

export default router;