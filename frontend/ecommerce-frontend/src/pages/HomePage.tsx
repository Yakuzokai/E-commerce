// Home Page

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Zap, Shield, Truck, CreditCard, Star } from 'lucide-react';
import { productApi } from '@/lib/api';
import type { Product } from '@/types';

// Mock data for demo when API is not available
const mockProducts: any[] = [
  { id: '1', sellerId: 's1', name: 'Wireless Bluetooth Headphones', slug: 'wireless-bluetooth-headphones', status: 'active', ratingAvg: 4.5, ratingCount: 1250, reviewCount: 890, soldCount: 2340, viewCount: 12000, createdAt: '', updatedAt: '', variants: [{ id: 'v1', productId: '1', sku: 'WBH-001', price: 79.99, originalPrice: 129.99, stockQuantity: 50, reservedQuantity: 0, lowStockThreshold: 10, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i1', productId: '1', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
  { id: '2', sellerId: 's1', name: 'Smart Watch Pro', slug: 'smart-watch-pro', status: 'active', ratingAvg: 4.8, ratingCount: 890, reviewCount: 654, soldCount: 1560, viewCount: 8900, createdAt: '', updatedAt: '', variants: [{ id: 'v2', productId: '2', sku: 'SWP-001', price: 199.99, originalPrice: 299.99, stockQuantity: 30, reservedQuantity: 0, lowStockThreshold: 5, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i2', productId: '2', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
  { id: '3', sellerId: 's2', name: 'Portable Power Bank 20000mAh', slug: 'portable-power-bank', status: 'active', ratingAvg: 4.3, ratingCount: 2100, reviewCount: 1500, soldCount: 4500, viewCount: 15000, createdAt: '', updatedAt: '', variants: [{ id: 'v3', productId: '3', sku: 'PPB-001', price: 39.99, originalPrice: 59.99, stockQuantity: 100, reservedQuantity: 0, lowStockThreshold: 20, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i3', productId: '3', url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
  { id: '4', sellerId: 's2', name: 'Noise Cancelling Earbuds', slug: 'noise-cancelling-earbuds', status: 'active', ratingAvg: 4.6, ratingCount: 1780, reviewCount: 1200, soldCount: 3200, viewCount: 11000, createdAt: '', updatedAt: '', variants: [{ id: 'v4', productId: '4', sku: 'NCE-001', price: 149.99, originalPrice: 199.99, stockQuantity: 45, reservedQuantity: 0, lowStockThreshold: 10, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i4', productId: '4', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
  { id: '5', sellerId: 's3', name: 'Mechanical Gaming Keyboard RGB', slug: 'gaming-keyboard-rgb', status: 'active', ratingAvg: 4.7, ratingCount: 950, reviewCount: 720, soldCount: 1890, viewCount: 7800, createdAt: '', updatedAt: '', variants: [{ id: 'v5', productId: '5', sku: 'MGK-001', price: 89.99, originalPrice: 119.99, stockQuantity: 25, reservedQuantity: 0, lowStockThreshold: 5, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i5', productId: '5', url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
  { id: '6', sellerId: 's3', name: 'Ergonomic Office Chair', slug: 'ergonomic-office-chair', status: 'active', ratingAvg: 4.4, ratingCount: 650, reviewCount: 480, soldCount: 980, viewCount: 5600, createdAt: '', updatedAt: '', variants: [{ id: 'v6', productId: '6', sku: 'EOC-001', price: 299.99, originalPrice: 399.99, stockQuantity: 15, reservedQuantity: 0, lowStockThreshold: 3, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i6', productId: '6', url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
  { id: '7', sellerId: 's4', name: '4K Ultra HD Webcam', slug: '4k-uhd-webcam', status: 'active', ratingAvg: 4.5, ratingCount: 430, reviewCount: 320, soldCount: 720, viewCount: 4200, createdAt: '', updatedAt: '', variants: [{ id: 'v7', productId: '7', sku: '4KW-001', price: 129.99, originalPrice: 169.99, stockQuantity: 40, reservedQuantity: 0, lowStockThreshold: 10, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i7', productId: '7', url: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
  { id: '8', sellerId: 's4', name: 'USB-C Hub 7-in-1', slug: 'usb-c-hub-7in1', status: 'active', ratingAvg: 4.6, ratingCount: 890, reviewCount: 650, soldCount: 1650, viewCount: 7800, createdAt: '', updatedAt: '', variants: [{ id: 'v8', productId: '8', sku: 'UCH-001', price: 49.99, originalPrice: 69.99, stockQuantity: 60, reservedQuantity: 0, lowStockThreshold: 15, isActive: true, createdAt: '', updatedAt: '' }], images: [{ id: 'i8', productId: '8', url: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400', sortOrder: 0, isPrimary: true }], attributes: {} },
];

export default function HomePage() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);

  const { data: trendingProducts } = useQuery({
    queryKey: ['trending-products'],
    queryFn: () => productApi.getTrending(8),
    staleTime: 1000 * 60 * 5,
  });

  const products = trendingProducts?.data || mockProducts;

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();

    if (!email || !email.includes('@')) {
      setNewsletterMessage('Please enter a valid email address.');
      return;
    }

    setNewsletterMessage('You are subscribed. Watch your inbox for new deals.');
    setNewsletterEmail('');
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Shop Smart,<br />Live Better
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Discover amazing deals on thousands of products with free shipping on orders over $50
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/products"
                className="btn-primary btn-lg flex items-center gap-2"
              >
                Shop Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/flash-sales"
                className="btn-accent btn-lg"
              >
                Flash Sales
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 hidden lg:block">
          <div className="absolute right-10 top-1/4 w-64 h-64 bg-white rounded-full" />
          <div className="absolute right-1/4 top-1/2 w-48 h-48 bg-white rounded-full" />
        </div>
      </section>

      {/* Flash Sale Banner */}
      <section className="bg-gradient-to-r from-accent-500 to-accent-600 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-8 h-8" />
                <span className="text-2xl font-bold">FLASH SALE</span>
              </div>
              <span className="text-sm">Up to 70% off</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Ends in:</span>
              <div className="flex gap-1">
                <span className="px-2 py-1 bg-white text-accent-600 font-bold rounded animate-countdown-pulse">
                  02
                </span>
                <span>:</span>
                <span className="px-2 py-1 bg-white text-accent-600 font-bold rounded animate-countdown-pulse">
                  45
                </span>
                <span>:</span>
                <span className="px-2 py-1 bg-white text-accent-600 font-bold rounded animate-countdown-pulse">
                  30
                </span>
              </div>
            </div>
            <Link
              to="/flash-sales"
              className="btn-primary btn-sm"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'On orders over $50' },
              { icon: Shield, title: 'Secure Payment', desc: '100% protected' },
              { icon: Zap, title: 'Flash Deals', desc: 'New deals daily' },
              { icon: CreditCard, title: 'Easy Returns', desc: '30-day policy' },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-4">
                <feature.icon className="w-8 h-8 text-primary-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Trending Products</h2>
              <p className="text-gray-500 mt-1">Most popular items right now</p>
            </div>
            <Link
              to="/products"
              className="flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700"
            >
              View All <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Electronics', slug: 'electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200' },
              { name: 'Fashion', slug: 'fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200' },
              { name: 'Home & Living', slug: 'home', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200' },
              { name: 'Beauty', slug: 'beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200' },
              { name: 'Sports', slug: 'sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe1f1f14c93?w=200' },
              { name: 'Books', slug: 'books', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200' },
            ].map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="group relative aspect-square rounded-xl overflow-hidden"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-secondary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Stay in the Loop</h2>
          <p className="text-secondary-100 mb-8 max-w-md mx-auto">
            Subscribe to our newsletter for exclusive deals, new arrivals, and more
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary-400"
            />
            <button
              type="submit"
              className="btn-primary"
            >
              Subscribe
            </button>
          </form>
          {newsletterMessage && (
            <p className="mt-4 text-sm font-medium text-secondary-100">{newsletterMessage}</p>
          )}
        </div>
      </section>
    </div>
  );
}

// Product Card Component
function ProductCard({ product }: { product: any }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const discount = product.variants?.[0]?.originalPrice
    ? Math.round((1 - product.variants[0].price / product.variants[0].originalPrice) * 100)
    : 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.images?.[0]?.url || 'https://via.placeholder.com/400'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-primary-500 text-white text-xs font-bold rounded">
            -{discount}%
          </span>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsWishlisted((prev) => !prev);
            }}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlisted ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm text-gray-600">{(product.ratingAvg || 0).toFixed(1)}</span>
          <span className="text-sm text-gray-400">({product.ratingCount || 0})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary-600">
            ${(product.variants?.[0]?.price || 0).toFixed(2)}
          </span>
          {product.variants?.[0]?.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              ${(product.variants[0].originalPrice || 0).toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {(product.soldCount || 0).toLocaleString()} sold
        </div>
      </div>
    </Link>
  );
}
