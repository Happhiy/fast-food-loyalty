import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    loyaltyId: string;
    role: string;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    loyaltyId: string;
    name: string;
    email: string;
    phone: string;
    points: number;
    visitCount: number;
    role: string;
  };
}

export interface CustomerResponse {
  id: string;
  loyaltyId: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  totalSpent: number;
  visitCount: number;
  role: string;
  createdAt: string;
}

export interface PurchaseResponse {
  id: string;
  customerId: string;
  amount: number;
  pointsEarned: number;
  receiptNumber: string;
  timestamp: string;
}

export interface CouponResponse {
  id: string;
  code: string;
  customerId: string;
  value: number;
  createdAt: string;
  redeemed: boolean;
  redeemedAt?: string;
}