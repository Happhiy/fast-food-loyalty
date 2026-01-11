import { Router } from 'express';
import { createPurchase, getPurchasesByCustomer } from '../controllers/purchaseController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, createPurchaseSchema } from '../middleware/validation';

const router = Router();

router.post('/', authenticate, requireAdmin, validate(createPurchaseSchema), createPurchase);
router.get('/:customerId', authenticate, getPurchasesByCustomer);

export default router;