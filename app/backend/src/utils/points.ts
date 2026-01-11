export const calculatePoints = (amount: number, role: string): number => {
  const basePoints = Math.floor(amount / 100);
  const multipliers: { [key: string]: number } = {
    NORMAL: 1.1,
    LOYAL: 1.4,
    OWNER: 1.7,
    ADMIN: 1.0,
  };
  return Math.floor(basePoints * (multipliers[role] || 1.0));
};

export const generateLoyaltyId = (lastId: number): string => {
  return `CUST${String(lastId + 1).padStart(3, '0')}`;
};

export const generatePinCode = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

export const generateCouponCode = (lastId: number): string => {
  const year = new Date().getFullYear();
  return `COUP-${year}-${String(lastId + 1).padStart(3, '0')}`;
};

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `RCP-${timestamp}-${random}`;
};