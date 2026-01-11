import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// Validation schemas
export const loginSchema = z.object({
  loyaltyId: z.string().min(1, 'Loyalty ID is required'),
  pinCode: z.string().regex(/^\d{8}$/, 'PIN code must be 8 digits'),
});

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  pinCode: z.string().regex(/^\d{8}$/, 'PIN code must be 8 digits').optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  points: z.number().int().min(0).optional(),
  role: z.enum(['NORMAL', 'LOYAL', 'OWNER', 'ADMIN']).optional(),
});

export const createPurchaseSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().positive('Amount must be positive'),
  receiptNumber: z.string().optional(),
});

export const lookupCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
});