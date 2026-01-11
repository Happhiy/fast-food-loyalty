import { Router } from 'express';
import {
  createCoupon,
  getCouponsByCustomer,
  lookupCoupon,
  redeemCoupon,
} from '../controllers/couponController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, lookupCouponSchema } from '../middleware/validation';

const router = Router();

router.post('/', authenticate, createCoupon);
router.get('/:customerId', authenticate, getCouponsByCustomer);
router.post('/lookup', authenticate, requireAdmin, validate(lookupCouponSchema), lookupCoupon);
router.put('/:code/redeem', authenticate, requireAdmin, redeemCoupon);

export default router;