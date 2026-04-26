// Main App Component

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';

// Pages
import HomePage from '@/pages/HomePage';
import ProductPage from '@/pages/ProductPage';
import ProductsPage from '@/pages/ProductsPage';
import CartPage from '@/pages/CartPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AccountPage from '@/pages/AccountPage';
import ProfilePage from '@/pages/ProfilePage';
import AddressesPage from '@/pages/AddressesPage';
import PaymentsPage from '@/pages/PaymentsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SecurityPage from '@/pages/SecurityPage';
import OrdersPage from '@/pages/OrdersPage';
import WishlistPage from '@/pages/WishlistPage';
import CheckoutPage from '@/pages/CheckoutPage';
import FlashSalesPage from '@/pages/FlashSalesPage';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Header onCartClick={() => setIsCartOpen(true)} />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:slug" element={<ProductPage />} />
              <Route path="/flash-sales" element={<FlashSalesPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              
              {/* Account Routes */}
              <Route path="/account" element={<AccountPage />} />
              <Route path="/account/profile" element={<ProfilePage />} />
              <Route path="/account/addresses" element={<AddressesPage />} />
              <Route path="/account/payments" element={<PaymentsPage />} />
              <Route path="/account/notifications" element={<NotificationsPage />} />
              <Route path="/account/security" element={<SecurityPage />} />
              
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />

          <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
