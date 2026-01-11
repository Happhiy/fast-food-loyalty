// This file is kept for backward compatibility but now uses API calls
import { authAPI, customerAPI, Customer } from './api';

// Memory storage fallback (not used anymore, but kept for compatibility)
const memoryStorage: Record<string, string> = {};

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    console.warn('⚠️ localStorage is not available, using memory storage fallback');
    return false;
  }
}

// Safe wrapper functions for localStorage with memory fallback
export function safeGetItem(key: string): string | null {
  try {
    if (isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return memoryStorage[key] || null;
  } catch (error) {
    console.error(`❌ Error reading ${key}:`, error);
    return memoryStorage[key] || null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    }
    memoryStorage[key] = value;
  } catch (error) {
    console.error(`❌ Error writing ${key}:`, error);
    memoryStorage[key] = value;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
    delete memoryStorage[key];
  } catch (error) {
    console.error(`❌ Error removing ${key}:`, error);
    delete memoryStorage[key];
  }
}

// Authentication helpers (now using tokens instead of full user data)
export function setAuth(user: Customer): void {
  console.log('✓ User authenticated:', user.loyaltyId);
  safeSetItem('currentUser', JSON.stringify(user));
}

export function getAuth(): Customer | null {
  try {
    const userStr = safeGetItem('currentUser');
    if (!userStr) return null;
    return JSON.parse(userStr) as Customer;
  } catch (error) {
    console.error('❌ Error parsing current user:', error);
    return null;
  }
}

export function clearAuth(): void {
  console.log('✓ Clearing authentication');
  safeRemoveItem('currentUser');
  safeRemoveItem('accessToken');
  safeRemoveItem('refreshToken');
}

// Legacy function for compatibility - now just returns the stored user
export function getCustomerByLoyaltyIdAndPin(loyaltyId: string, pinCode: string): Customer | null {
  console.log('🔍 Legacy function called - use authAPI.login instead');
  // This function is deprecated, components should use authAPI.login directly
  return null;
}

// Initialize storage - no longer needed with API, but kept for compatibility
export function initializeStorage(): void {
  console.log('🚀 Storage initialized (API mode)');
  console.log('📱 Device info:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isLocalStorageAvailable: isLocalStorageAvailable(),
  });
}

// Reset storage - clears local tokens
export function resetStorage(): void {
  console.log('🔄 Resetting storage');
  clearAuth();
  authAPI.logout();
}