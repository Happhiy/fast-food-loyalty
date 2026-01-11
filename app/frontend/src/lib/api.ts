import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Extended request config with retry flag
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Types
export interface Customer {
  id: string;
  loyaltyId: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  totalSpent: number;
  visitCount: number;
  role: 'NORMAL' | 'LOYAL' | 'OWNER' | 'ADMIN';
  createdAt: string;
}

export interface Purchase {
  id: string;
  customerId: string;
  amount: number;
  pointsEarned: number;
  receiptNumber: string;
  timestamp: string;
}

export interface Coupon {
  id: string;
  code: string;
  customerId: string;
  value: number;
  createdAt: string;
  redeemed: boolean;
  redeemedAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Customer;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  pinCode: string;
}

export interface CreateCustomerResponse extends Customer {
  pinCode: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  points?: number;
  role?: string;
}

export interface CreatePurchaseRequest {
  customerId: string;
  amount: number;
  receiptNumber: string;
}

export interface CreatePurchaseResponse {
  purchase: Purchase;
  customer: {
    points: number;
    visitCount: number;
    role: string;
  };
}

export interface LookupCouponResponse extends Coupon {
  customer: {
    id: string;
    loyaltyId: string;
    name: string;
    phone: string;
  };
}

// Authentication API
export const authAPI = {
  login: async (loyaltyId: string, pinCode: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', { loyaltyId, pinCode });
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  me: async (): Promise<Customer> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  },
};

// Customer API
export const customerAPI = {
  getAll: async (): Promise<Customer[]> => {
    const response = await apiClient.get('/customers');
    return response.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerRequest): Promise<CreateCustomerResponse> => {
    const response = await apiClient.post('/customers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCustomerRequest): Promise<Customer> => {
    const response = await apiClient.put(`/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },
};

// Purchase API
export const purchaseAPI = {
  create: async (data: CreatePurchaseRequest): Promise<CreatePurchaseResponse> => {
    const response = await apiClient.post('/purchases', data);
    return response.data;
  },

  getByCustomerId: async (customerId: string): Promise<Purchase[]> => {
    const response = await apiClient.get(`/purchases/${customerId}`);
    return response.data;
  },
};

// Coupon API
export const couponAPI = {
  create: async (customerId: string): Promise<Coupon> => {
    const response = await apiClient.post('/coupons', { customerId });
    return response.data;
  },

  getByCustomerId: async (customerId: string): Promise<Coupon[]> => {
    const response = await apiClient.get(`/coupons/${customerId}`);
    return response.data;
  },

  lookup: async (code: string): Promise<LookupCouponResponse> => {
    const response = await apiClient.post('/coupons/lookup', { code });
    return response.data;
  },

  redeem: async (code: string): Promise<Coupon> => {
    const response = await apiClient.put(`/coupons/${code}/redeem`);
    return response.data;
  },
};

// Helper function to handle API errors
export const handleAPIError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ismeretlen hiba történt';
};