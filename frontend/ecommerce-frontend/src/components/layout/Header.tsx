// Header Component

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, ShoppingCart, User, Menu, X, Heart, Package } from 'lucide-react';
import { useCartStore } from '@/stores';

interface HeaderProps {
  onCartClick: () => void;
}

export default function Header({ onCartClick }: HeaderProps) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalItems } = useCartStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary-600 text-white text-sm">
        <div className="container mx-auto px-4 py-1 flex justify-between items-center">
          <span>Free shipping on orders over $50</span>
          <div className="flex gap-4">
            <Link to="/seller" className="hover:underline">Sell on ShopHub</Link>
            <Link to="/support" className="hover:underline">Help Center</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 hidden sm:block">ShopHub</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for products, brands and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-4 bg-primary-500 text-white rounded-r-lg hover:bg-primary-600 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Account */}
            <Link
              to="/account"
              className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <User className="w-6 h-6" />
              <span className="hidden md:inline">Account</span>
            </Link>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <Heart className="w-6 h-6" />
              <span className="hidden md:inline">Wishlist</span>
            </Link>

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors relative"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
              <span className="hidden md:inline">Cart</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="border-t border-gray-200 hidden md:block">
        <div className="container mx-auto px-4 py-2">
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/products" className="text-gray-700 hover:text-primary-600 font-medium">
              All Products
            </Link>
            <Link to="/products?category=electronics" className="text-gray-700 hover:text-primary-600">
              Electronics
            </Link>
            <Link to="/products?category=fashion" className="text-gray-700 hover:text-primary-600">
              Fashion
            </Link>
            <Link to="/products?category=home" className="text-gray-700 hover:text-primary-600">
              Home & Living
            </Link>
            <Link to="/products?category=beauty" className="text-gray-700 hover:text-primary-600">
              Beauty
            </Link>
            <Link to="/products?category=sports" className="text-gray-700 hover:text-primary-600">
              Sports
            </Link>
            <Link to="/flash-sales" className="text-accent-500 font-medium animate-pulse">
              Flash Sales
            </Link>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 animate-slide-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <Link to="/products" className="py-2 text-gray-700 font-medium">All Products</Link>
            <Link to="/products?category=electronics" className="py-2 text-gray-700">Electronics</Link>
            <Link to="/products?category=fashion" className="py-2 text-gray-700">Fashion</Link>
            <Link to="/products?category=home" className="py-2 text-gray-700">Home & Living</Link>
            <Link to="/products?category=beauty" className="py-2 text-gray-700">Beauty</Link>
            <Link to="/flash-sales" className="py-2 text-accent-500 font-medium">Flash Sales</Link>
            <hr className="my-2" />
            <Link to="/account" className="py-2 text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" /> My Account
            </Link>
            <Link to="/orders" className="py-2 text-gray-700 flex items-center gap-2">
              <Package className="w-4 h-4" /> My Orders
            </Link>
            <Link to="/wishlist" className="py-2 text-gray-700 flex items-center gap-2">
              <Heart className="w-4 h-4" /> Wishlist
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
