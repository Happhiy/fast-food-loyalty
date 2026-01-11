import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import { calculatePoints, generateReceiptNumber } from '../utils/points';

export const createPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, amount, receiptNumber } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const pointsEarned = calculatePoints(amount, customer.role);
    const receipt = receiptNumber || generateReceiptNumber();

    // Create purchase and update customer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          customerId,
          amount,
          pointsEarned,
          receiptNumber: receipt,
        },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          points: { increment: pointsEarned },
          totalSpent: { increment: amount },
          visitCount: { increment: 1 },
          // Auto-upgrade role based on visits
          role: customer.visitCount + 1 >= 50 ? 'OWNER' 
              : customer.visitCount + 1 >= 20 ? 'LOYAL' 
              : customer.role,
        },
      });

      return { purchase, customer: updatedCustomer };
    });

    res.status(201).json({
      purchase: {
        id: result.purchase.id,
        customerId: result.purchase.customerId,
        amount: result.purchase.amount,
        pointsEarned: result.purchase.pointsEarned,
        receiptNumber: result.purchase.receiptNumber,
        timestamp: result.purchase.timestamp,
      },
      customer: {
        points: result.customer.points,
        visitCount: result.customer.visitCount,
        role: result.customer.role,
      },
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPurchasesByCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const customerIdStr = Array.isArray(customerId) ? customerId[0] : customerId;

    // Users can only view their own purchases unless they're admin
    if (req.user!.role !== 'ADMIN' && req.user!.id !== customerIdStr) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const purchases = await prisma.purchase.findMany({
      where: { customerId: customerIdStr },
      orderBy: { timestamp: 'desc' },
    });

    res.json(purchases);
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};