// API Client for E-Commerce Platform

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Product, ProductDetail, Cart, Order, AuthResponse, User, PaginatedResponse } from '@/types';

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api/v1';
const PRODUCT_API_URL = import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:3003/api/v1';
const CART_API_URL = import.meta.env.VITE_CART_API_URL || 'http://localhost:3006/api';
const USER_API_URL = import.meta.env.VITE_USER_API_URL || 'http://localhost:3008/api';
const ORDER_API_URL = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:3004/api';

// Create axios instances for different services
const authInstance: AxiosInstance = axios.create({
  baseURL: AUTH_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const productInstance: AxiosInstance = axios.create({
  baseURL: PRODUCT_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const cartInstance: AxiosInstance = axios.create({
  baseURL: CART_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const userInstance: AxiosInstance = axios.create({
  baseURL: USER_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const orderInstance: AxiosInstance = axios.create({
  baseURL: ORDER_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor helper
const addAuthInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

addAuthInterceptor(authInstance);
addAuthInterceptor(productInstance);
addAuthInterceptor(cartInstance);
addAuthInterceptor(userInstance);
addAuthInterceptor(orderInstance);

// Address Types
export interface Address {
  id: string;
  userId: string;
  type: 'home' | 'work' | 'other';
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressRequest {
  type: 'home' | 'work' | 'other';
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

// User API
export const userApi = {
  getAddresses: async (userId: string): Promise<Address[]> => {
    const response = await userInstance.get(`/users/${userId}/addresses`);
    return response.data;
  },
  addAddress: async (userId: string, data: CreateAddressRequest): Promise<Address> => {
    const response = await userInstance.post(`/users/${userId}/addresses`, data);
    return response.data;
  },
  updateAddress: async (userId: string, addressId: string, data: Partial<CreateAddressRequest>): Promise<Address> => {
    const response = await userInstance.patch(`/users/${userId}/addresses/${addressId}`, data);
    return response.data;
  },
  deleteAddress: async (userId: string, addressId: string): Promise<void> => {
    await userInstance.delete(`/users/${userId}/addresses/${addressId}`);
  },
  setDefaultAddress: async (userId: string, addressId: string): Promise<Address> => {
    const response = await userInstance.post(`/users/${userId}/addresses/${addressId}/default`);
    return response.data;
  },
};

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await authInstance.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: { email: string; password: string; firstName?: string; lastName?: string }): Promise<AuthResponse> => {
    const response = await authInstance.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await authInstance.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await authInstance.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await authInstance.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

// Product API
export const productApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    brandId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Product>> => {
    const response = await productInstance.get('/products', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ data: ProductDetail }> => {
    const response = await productInstance.get(`/products/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string): Promise<{ data: ProductDetail }> => {
    const response = await productInstance.get(`/products/slug/${slug}`);
    return response.data;
  },

  getTrending: async (limit?: number): Promise<{ data: Product[] }> => {
    const response = await productInstance.get('/products/trending', { params: { limit } });
    return response.data;
  },

  getFlashSales: async (): Promise<{ data: any[] }> => {
    const response = await productInstance.get('/products/flash-sales');
    return response.data;
  },
};

// Cart API
export const cartApi = {
  get: async (userId: string): Promise<Cart> => {
    const response = await cartInstance.get(`/users/${userId}/cart`);
    return response.data;
  },

  addItem: async (userId: string, productId: string, variantId: string, quantity: number): Promise<Cart> => {
    const response = await cartInstance.post(`/users/${userId}/cart/items`, { productId, variantId, quantity });
    return response.data;
  },

  updateItem: async (userId: string, itemId: string, quantity: number): Promise<Cart> => {
    const response = await cartInstance.patch(`/users/${userId}/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  removeItem: async (userId: string, itemId: string): Promise<Cart> => {
    const response = await cartInstance.delete(`/users/${userId}/cart/items/${itemId}`);
    return response.data;
  },

  clear: async (userId: string): Promise<void> => {
    await cartInstance.delete(`/users/${userId}/cart`);
  },
};

// Category API
export const categoryApi = {
  list: async (): Promise<{ data: any[] }> => {
    const response = await productInstance.get('/categories');
    return response.data;
  },
};

// Order API
export const orderApi = {
  create: async (orderData: any): Promise<{ data: Order }> => {
    const response = await orderInstance.post('/orders', orderData);
    return response.data;
  },
  getById: async (id: string): Promise<{ data: Order }> => {
    const response = await orderInstance.get(`/orders/${id}`);
    return response.data;
  },
  list: async (): Promise<{ data: Order[] }> => {
    const response = await orderInstance.get('/orders');
    return response.data;
  },
};

export default productInstance;
