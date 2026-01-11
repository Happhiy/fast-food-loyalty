import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import { comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loyaltyId, pinCode } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { loyaltyId },
    });

    if (!customer) {
      res.status(401).json({ error: 'Invalid loyalty ID or PIN code' });
      return;
    }

    const isValidPin = await comparePassword(pinCode, customer.pinCode);

    if (!isValidPin) {
      res.status(401).json({ error: 'Invalid loyalty ID or PIN code' });
      return;
    }

    const tokenPayload = {
      id: customer.id,
      loyaltyId: customer.loyaltyId,
      role: customer.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: customer.id,
        loyaltyId: customer.loyaltyId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        points: customer.points,
        visitCount: customer.visitCount,
        role: customer.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
    });

    if (!customer) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const tokenPayload = {
      id: customer.id,
      loyaltyId: customer.loyaltyId,
      role: customer.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        loyaltyId: true,
        name: true,
        email: true,
        phone: true,
        points: true,
        totalSpent: true,
        visitCount: true,
        role: true,
        createdAt: true,
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(customer);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};