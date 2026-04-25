// API Client for E-Commerce Platform

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Product, ProductDetail, Cart, Order, AuthResponse, User, PaginatedResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: { email: string; password: string; firstName?: string; lastName?: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken });
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
    const response = await api.get('/products', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ data: ProductDetail }> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string): Promise<{ data: ProductDetail }> => {
    const response = await api.get(`/products/slug/${slug}`);
    return response.data;
  },

  getTrending: async (limit?: number): Promise<{ data: Product[] }> => {
    const response = await api.get('/products/trending', { params: { limit } });
    return response.data;
  },

  getFlashSales: async (): Promise<{ data: any[] }> => {
    const response = await api.get('/products/flash-sales');
    return response.data;
  },
};

// Cart API
export const cartApi = {
  get: async (): Promise<Cart> => {
    const response = await api.get('/cart');
    return response.data;
  },

  addItem: async (productId: string, variantId: string, quantity: number): Promise<Cart> => {
    const response = await api.post('/cart/items', { productId, variantId, quantity });
    return response.data;
  },

  updateItem: async (itemId: string, quantity: number): Promise<Cart> => {
    const response = await api.patch(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  removeItem: async (itemId: string): Promise<Cart> => {
    const response = await api.delete(`/cart/items/${itemId}`);
    return response.data;
  },

  clear: async (): Promise<void> => {
    await api.delete('/cart');
  },
};

// Order API
export const orderApi = {
  list: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Order>> => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  create: async (data: { items: Array<{ variantId: string; quantity: number }>; addressId: string }): Promise<Order> => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  cancel: async (id: string, reason?: string): Promise<Order> => {
    const response = await api.post(`/orders/${id}/cancel`, { reason });
    return response.data;
  },
};

// Category API
export const categoryApi = {
  list: async (): Promise<{ data: any[] }> => {
    const response = await api.get('/categories');
    return response.data;
  },

  getBySlug: async (slug: string): Promise<{ data: any }> => {
    const response = await api.get(`/categories/${slug}`);
    return response.data;
  },
};

// Wishlist API
export const wishlistApi = {
  get: async (): Promise<{ data: Product[] }> => {
    const response = await api.get('/wishlist');
    return response.data;
  },

  add: async (productId: string, variantId?: string): Promise<void> => {
    await api.post('/wishlist', { productId, variantId });
  },

  remove: async (productId: string): Promise<void> => {
    await api.delete(`/wishlist/${productId}`);
  },
};

export default api;
