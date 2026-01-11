import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, createCustomerSchema, updateCustomerSchema } from '../middleware/validation';

const router = Router();

router.get('/', authenticate, requireAdmin, getAllCustomers);
router.get('/:id', authenticate, getCustomerById);
router.post('/', authenticate, requireAdmin, validate(createCustomerSchema), createCustomer);
router.put('/:id', authenticate, validate(updateCustomerSchema), updateCustomer);
router.delete('/:id', authenticate, requireAdmin, deleteCustomer);

export default router;