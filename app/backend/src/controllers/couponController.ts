import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import { generateCouponCode } from '../utils/points';

export const createCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.body;

    // Users can only create coupons for themselves unless they're admin
    if (req.user!.role !== 'ADMIN' && req.user!.id !== customerId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (customer.points < 100) {
      res.status(400).json({ error: 'Not enough points. Need 100 points to create a coupon.' });
      return;
    }

    // Generate coupon code
    const lastCoupon = await prisma.coupon.findFirst({
      orderBy: { code: 'desc' },
    });

    const lastIdNumber = lastCoupon 
      ? parseInt(lastCoupon.code.split('-')[2]) 
      : 0;
    const couponCode = generateCouponCode(lastIdNumber);

    // Create coupon and deduct points in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.create({
        data: {
          code: couponCode,
          customerId,
          value: 1000,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          points: { decrement: 100 },
        },
      });

      return coupon;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCouponsByCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    // Users can only view their own coupons unless they're admin
    if (req.user!.role !== 'ADMIN' && req.user!.id !== customerId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const coupons = await prisma.coupon.findMany({
      where: { customerId: Array.isArray(customerId) ? customerId[0] : customerId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const lookupCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        customer: {
          select: {
            id: true,
            loyaltyId: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    res.json(coupon);
  } catch (error) {
    console.error('Lookup coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const redeemCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const codeStr = Array.isArray(code) ? code[0] : code;

    const coupon = await prisma.coupon.findUnique({
      where: { code: codeStr },
    });

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    if (coupon.redeemed) {
      res.status(400).json({ error: 'Coupon already redeemed' });
      return;
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { code: codeStr },
      data: {
        redeemed: true,
        redeemedAt: new Date(),
      },
    });

    res.json(updatedCoupon);
  } catch (error) {
    console.error('Redeem coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};