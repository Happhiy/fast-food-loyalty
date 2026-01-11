export type UserRole = 'normal' | 'loyal' | 'owner' | 'admin';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyalty_id: string;
  pin_code: string; // 8-digit PIN code for login
  points: number;
  visits: number;
  role: UserRole;
  created_at: string;
}

export interface Purchase {
  id: string;
  customer_id: string;
  amount: number;
  date: string;
  receipt_number: string;
  points_earned: number;
}

export interface Coupon {
  id: string;
  customer_id: string;
  value: number;
  code: string;
  created_at: string;
  redeemed: boolean;
  redeemed_at?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Customer | null;
  role: UserRole | null;
}