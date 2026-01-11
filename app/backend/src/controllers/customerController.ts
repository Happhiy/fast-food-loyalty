import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import { hashPassword } from '../utils/password';
import { generateLoyaltyId, generatePinCode } from '../utils/points';

export const getAllCustomers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    res.json(customers);
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    // Users can only view their own data unless they're admin
    if (req.user!.role !== 'ADMIN' && req.user!.id !== idStr) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: idStr },
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
    console.error('Get customer by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, pinCode } = req.body;

    // Check if email already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Generate loyalty ID
    const lastCustomer = await prisma.customer.findFirst({
      where: { loyaltyId: { startsWith: 'CUST' } },
      orderBy: { loyaltyId: 'desc' },
    });

    const lastIdNumber = lastCustomer 
      ? parseInt(lastCustomer.loyaltyId.replace('CUST', '')) 
      : 0;
    const loyaltyId = generateLoyaltyId(lastIdNumber);

    // Generate or use provided PIN code
    const pin = pinCode || generatePinCode();
    const hashedPin = await hashPassword(pin);

    const customer = await prisma.customer.create({
      data: {
        loyaltyId,
        name,
        email,
        phone,
        pinCode: hashedPin,
        role: 'NORMAL',
      },
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

    res.status(201).json({
      ...customer,
      pinCode: pin, // Return plain PIN only on creation
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    // Users can only update their own data unless they're admin
    if (req.user!.role !== 'ADMIN' && req.user!.id !== idStr) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only admin can change role
    if (updates.role && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only admin can change role' });
      return;
    }

    const customer = await prisma.customer.update({
      where: { id: idStr },
      data: updates,
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

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    await prisma.customer.delete({
      where: { id: idStr },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};