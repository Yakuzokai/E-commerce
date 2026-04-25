// Global Store for E-Commerce Platform

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Cart, CartItem } from '@/types';

// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Cart Store
interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  calculateTotals: () => void;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  totalItems: 0,
  subtotal: 0,
  isOpen: false,

  addItem: (item) => {
    const items = [...get().items];
    const existingIndex = items.findIndex(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    );

    if (existingIndex > -1) {
      items[existingIndex].quantity += item.quantity;
    } else {
      items.push(item);
    }

    set({ items });
    get().calculateTotals();
  },

  removeItem: (itemId) => {
    set({ items: get().items.filter((i) => i.id !== itemId) });
    get().calculateTotals();
  },

  updateQuantity: (itemId, quantity) => {
    const items = get().items.map((i) =>
      i.id === itemId ? { ...i, quantity } : i
    );
    set({ items });
    get().calculateTotals();
  },

  clearCart: () => set({ items: [], totalItems: 0, subtotal: 0 }),

  toggleCart: () => set({ isOpen: !get().isOpen }),

  setCartOpen: (open) => set({ isOpen: open }),

  calculateTotals: () => {
    const items = get().items;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => {
      const price = item.variant?.price || item.product?.variants?.[0]?.price || 0;
      return sum + price * item.quantity;
    }, 0);
    set({ totalItems, subtotal });
  },
}));

// UI Store
interface UIState {
  isMobileMenuOpen: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isMobileMenuOpen: false,
  searchQuery: '',
  isSearchOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
