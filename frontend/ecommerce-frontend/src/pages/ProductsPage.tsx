// Products Listing Page

import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Grid, List, Star, ChevronDown, Search } from 'lucide-react';
import { productApi } from '@/lib/api';

// Mock products for demo
const mockProducts: any[] = [
  { id: '1', name: 'Wireless Bluetooth Headphones', slug: 'wireless-bluetooth-headphones', variants: [{ price: 79.99, originalPrice: 129.99 }], images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' }], ratingAvg: 4.5, ratingCount: 1250, soldCount: 2340 },
  { id: '2', name: 'Smart Watch Pro', slug: 'smart-watch-pro', variants: [{ price: 199.99, originalPrice: 299.99 }], images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' }], ratingAvg: 4.8, ratingCount: 890, soldCount: 1560 },
  { id: '3', name: 'Portable Power Bank', slug: 'portable-power-bank', variants: [{ price: 39.99, originalPrice: 59.99 }], images: [{ url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' }], ratingAvg: 4.3, ratingCount: 2100, soldCount: 4500 },
  { id: '4', name: 'Noise Cancelling Earbuds', slug: 'noise-cancelling-earbuds', variants: [{ price: 149.99, originalPrice: 199.99 }], images: [{ url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400' }], ratingAvg: 4.6, ratingCount: 1780, soldCount: 3200 },
  { id: '5', name: 'Gaming Keyboard RGB', slug: 'gaming-keyboard-rgb', variants: [{ price: 89.99, originalPrice: 119.99 }], images: [{ url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400' }], ratingAvg: 4.7, ratingCount: 950, soldCount: 1890 },
  { id: '6', name: 'Ergonomic Office Chair', slug: 'ergonomic-office-chair', variants: [{ price: 299.99, originalPrice: 399.99 }], images: [{ url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400' }], ratingAvg: 4.4, ratingCount: 650, soldCount: 980 },
  { id: '7', name: '4K Ultra HD Webcam', slug: '4k-uhd-webcam', variants: [{ price: 129.99, originalPrice: 169.99 }], images: [{ url: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400' }], ratingAvg: 4.5, ratingCount: 430, soldCount: 720 },
  { id: '8', name: 'USB-C Hub 7-in-1', slug: 'usb-c-hub-7in1', variants: [{ price: 49.99, originalPrice: 69.99 }], images: [{ url: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400' }], ratingAvg: 4.6, ratingCount: 890, soldCount: 1650 },
  { id: '9', name: 'Wireless Mouse', slug: 'wireless-mouse', variants: [{ price: 29.99, originalPrice: 49.99 }], images: [{ url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc5aec3?w=400' }], ratingAvg: 4.2, ratingCount: 3200, soldCount: 5600 },
  { id: '10', name: 'Laptop Stand', slug: 'laptop-stand', variants: [{ price: 39.99 }], images: [{ url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400' }], ratingAvg: 4.5, ratingCount: 780, soldCount: 1200 },
  { id: '11', name: 'Smart Speaker', slug: 'smart-speaker', variants: [{ price: 99.99, originalPrice: 129.99 }], images: [{ url: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=400' }], ratingAvg: 4.4, ratingCount: 1450, soldCount: 2100 },
  { id: '12', name: 'Tablet Holder', slug: 'tablet-holder', variants: [{ price: 24.99 }], images: [{ url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400' }], ratingAvg: 4.1, ratingCount: 540, soldCount: 890 },
];

const categories = [
  { name: 'All', slug: '', count: 156 },
  { name: 'Electronics', slug: 'electronics', count: 45 },
  { name: 'Audio', slug: 'audio', count: 32 },
  { name: 'Accessories', slug: 'accessories', count: 28 },
  { name: 'Office', slug: 'office', count: 24 },
  { name: 'Gaming', slug: 'gaming', count: 18 },
];

const brands = [
  { name: 'AudioPro', slug: 'audiopro' },
  { name: 'TechGear', slug: 'techgear' },
  { name: 'SmartLife', slug: 'smartlife' },
  { name: 'ProAudio', slug: 'proaudio' },
];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'popular');

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const { data: productsData } = useQuery({
    queryKey: ['products', category, search, page, sortBy],
    queryFn: () => productApi.list({ categoryId: category, search, page, limit: 20, sortBy }),
    staleTime: 1000 * 60 * 5,
  });

  const products = productsData?.data || mockProducts;
  const pagination = productsData?.pagination || { page: 1, limit: 20, total: 12, totalPages: 1, hasMore: false };

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', value);
    setSearchParams(params);
    setSortBy(value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const query = formData.get('q') as string;
    if (query) {
      const params = new URLSearchParams(searchParams);
      params.set('search', query);
      params.set('page', '1');
      setSearchParams(params);
    }
  };

  return (
    <div className="bg-gray-50 py-6 animate-fade-in">
      <div className="container mx-auto px-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="q"
              placeholder="Search products..."
              defaultValue={search}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </form>

        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500">
            <li><Link to="/" className="hover:text-primary-600">Home</Link></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">
              {category ? categories.find(c => c.slug === category)?.name : 'All Products'}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className={`lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl p-6 sticky top-24">
              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li key={cat.slug}>
                      <button
                        onClick={() => handleCategoryChange(cat.slug)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          category === cat.slug
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {cat.name}
                        <span className="float-right text-gray-400 text-sm">{cat.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Brands */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Brands</h3>
                <ul className="space-y-2">
                  {brands.map((brand) => (
                    <li key={brand.slug} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={brand.slug}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={brand.slug} className="text-gray-700 cursor-pointer">
                        {brand.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Price Range</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Rating</h3>
                <ul className="space-y-2">
                  {[4, 3, 2, 1].map((rating) => (
                    <li key={rating} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-sm text-gray-500">& up</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {category ? categories.find(c => c.slug === category)?.name : 'All Products'}
                </h1>
                <p className="text-sm text-gray-500">{pagination.total} products</p>
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="latest">Latest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="sold">Best Selling</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Filter Toggle (Mobile) */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>

                {/* View Mode */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-50'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-50'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className={`grid gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1'
            }`}>
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', String(i + 1));
                      setSearchParams(params);
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      page === i + 1
                        ? 'bg-primary-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, viewMode }: { product: any; viewMode: 'grid' | 'list' }) {
  const discount = product.variants?.[0]?.originalPrice
    ? Math.round((1 - product.variants[0].price / product.variants[0].originalPrice) * 100)
    : 0;

  if (viewMode === 'list') {
    return (
      <Link
        to={`/products/${product.slug}`}
        className="bg-white rounded-xl p-4 flex gap-6 hover:shadow-lg transition-shadow"
      >
        <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden shrink-0">
          <img
            src={product.images?.[0]?.url || 'https://via.placeholder.com/200'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="ml-1 text-sm text-gray-600">{product.ratingAvg.toFixed(1)}</span>
            </div>
            <span className="text-sm text-gray-400">({product.ratingCount})</span>
          </div>
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            High-quality product with premium features. Perfect for everyday use.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-primary-600">
              ${product.variants?.[0]?.price.toFixed(2)}
            </span>
            {product.variants?.[0]?.originalPrice && (
              <span className="text-gray-400 line-through">
                ${product.variants[0].originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">{product.soldCount.toLocaleString()} sold</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden"
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
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm text-gray-600">{product.ratingAvg.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary-600">
            ${product.variants?.[0]?.price.toFixed(2)}
          </span>
          {product.variants?.[0]?.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              ${product.variants[0].originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
