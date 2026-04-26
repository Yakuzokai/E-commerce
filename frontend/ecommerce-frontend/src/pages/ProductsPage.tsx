// Products Listing Page - High Density Pro Layout

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Grid, List, Star, ChevronDown, Search, Loader2, X } from 'lucide-react';
import { productApi, categoryApi } from '@/lib/api';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  const categorySlug = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || 'popular';

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
  });

  const categories = categoriesData?.data || [];
  const currentCategory = categories.find((c: any) => c.slug === categorySlug);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', currentCategory?.id, search, page, sortBy],
    queryFn: () => productApi.list({ 
      categoryId: currentCategory?.id, 
      search, 
      page, 
      limit: 30, // Increased limit for dense grid
      sortBy 
    }),
    staleTime: 1000 * 60 * 5,
  });

  const products = productsData?.data || [];
  const pagination = productsData?.pagination || { page: 1, limit: 30, total: 0, totalPages: 1, hasMore: false };

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug) params.set('category', slug);
    else params.delete('category');
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen py-4 animate-fade-in text-sm">
      <div className="container mx-auto px-4 max-w-[1400px]">
        {/* Breadcrumb - Smaller */}
        <nav className="mb-4 text-xs text-gray-500 flex items-center gap-1">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">
            {currentCategory ? currentCategory.name : 'All Products'}
          </span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar - Fixed Width, Compact */}
          <aside className={`lg:w-72 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg p-4 sticky top-24 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider text-xs">
                  <Filter className="w-3 h-3" /> Filters
                </h3>
                <button onClick={() => setShowFilters(false)} className="lg:hidden text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categories List - Dense */}
              <div className="mb-6">
                <p className="font-bold text-[11px] text-gray-400 uppercase mb-2">Category</p>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      onClick={() => handleCategoryChange('')}
                      className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                        !categorySlug ? 'bg-primary-600 text-white font-bold' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      All Categories
                    </button>
                  </li>
                  {categories.map((cat: any) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => handleCategoryChange(cat.slug)}
                        className={`w-full text-left px-2 py-1.5 rounded transition-colors truncate ${
                          categorySlug === cat.slug ? 'bg-primary-600 text-white font-bold' : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar - Compact */}
            <div className="bg-white rounded-lg px-4 py-3 mb-4 border border-gray-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">Sorted by:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      const params = new URLSearchParams(searchParams);
                      params.set('sortBy', e.target.value);
                      setSearchParams(params);
                    }}
                    className="appearance-none pl-2 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded font-medium focus:outline-none"
                  >
                    <option value="popular">Popularity</option>
                    <option value="latest">Newest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 mr-2">{pagination.total} items</span>
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-gray-100 text-primary-600' : 'bg-white'}`}>
                    <Grid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-gray-100 text-primary-600' : 'bg-white'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* High Density Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg p-20 text-center border border-gray-200 shadow-sm">
                <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h2 className="text-lg font-bold">No results found</h2>
                <button onClick={() => handleCategoryChange('')} className="mt-4 text-primary-600 font-bold hover:underline">
                  Reset filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-2 sm:gap-3 ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' 
                  : 'grid-cols-1'
              }`}>
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            )}

            {/* Pagination - Professional Style */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-1">
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const p = i + 1;
                  if (p > 10 && p < pagination.totalPages) return null; // Show first few and last
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set('page', String(p));
                        setSearchParams(params);
                        window.scrollTo(0, 0);
                      }}
                      className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                        page === p
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, viewMode }: { product: any; viewMode: 'grid' | 'list' }) {
  const price = product.variants?.[0]?.price || 0;
  const originalPrice = product.variants?.[0]?.originalPrice;
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  if (viewMode === 'list') {
    return (
      <Link to={`/products/${product.slug}`} className="bg-white p-3 flex gap-4 hover:shadow-md transition-all border border-gray-200 rounded-lg group">
        <div className="w-32 h-32 bg-gray-50 rounded overflow-hidden shrink-0">
          <img src={product.images?.[0]?.url} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">{product.name}</h3>
          <div className="flex items-center text-yellow-400 mb-2 scale-75 origin-left">
            <Star className="w-4 h-4 fill-current" />
            <span className="ml-1 text-xs font-bold text-gray-700">{product.ratingAvg || '0.0'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-primary-600">${Number(price).toFixed(2)}</span>
            {discount > 0 && <span className="text-xs text-gray-400 line-through">${Number(originalPrice).toFixed(2)}</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/products/${product.slug}`} className="bg-white shadow-sm hover:shadow-xl transition-all overflow-hidden border border-gray-200 group flex flex-col h-full rounded hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-white">
        <img src={product.images?.[0]?.url} alt={product.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
        {discount > 0 && (
          <div className="absolute top-0 right-0 bg-accent-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-bl">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <h3 className="text-[13px] leading-snug font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors h-9">
          {product.name}
        </h3>
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-primary-600">${Number(price).toFixed(2)}</span>
            <div className="flex items-center text-yellow-400 scale-75 origin-right">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-bold text-gray-500 ml-0.5">{product.ratingAvg}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">{product.sold_count} sold</p>
        </div>
      </div>
    </Link>
  );
}
