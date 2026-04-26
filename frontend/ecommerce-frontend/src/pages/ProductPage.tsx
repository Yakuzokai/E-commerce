// Product Detail Page

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  ShoppingCart, 
  Zap, 
  Truck, 
  ShieldCheck, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  Heart,
  Share2,
  Minus,
  Plus
} from 'lucide-react';
import { productApi } from '@/lib/api';
import { useCartStore } from '@/stores';

// Mock product for initial state
const mockProduct: any = {
  id: '',
  name: 'Loading Product...',
  description: '',
  variants: [{ id: '1', name: 'Standard', price: 0, originalPrice: 0, stockQuantity: 0 }],
  images: [{ url: 'https://via.placeholder.com/800' }],
  ratingAvg: 0,
  ratingCount: 0,
  soldCount: 0,
  brand: { name: '' },
  attributes: {},
};

const relatedProducts: any[] = [
  { id: '1', name: 'Wireless Bluetooth Headphones', slug: 'wireless-bluetooth-headphones', variants: [{ price: 79.99, originalPrice: 129.99 }], images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' }], ratingAvg: 4.5, soldCount: 2340 },
  { id: '2', name: 'Smart Watch Pro', slug: 'smart-watch-pro', variants: [{ price: 199.99, originalPrice: 299.99 }], images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' }], ratingAvg: 4.8, soldCount: 1560 },
  { id: '3', name: 'Portable Power Bank', slug: 'portable-power-bank', variants: [{ price: 39.99, originalPrice: 59.99 }], images: [{ url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' }], ratingAvg: 4.3, soldCount: 4500 },
  { id: '4', name: 'Noise Cancelling Earbuds', slug: 'noise-cancelling-earbuds', variants: [{ price: 149.99, originalPrice: 199.99 }], images: [{ url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400' }], ratingAvg: 4.6, soldCount: 3200 },
];

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'description' | 'reviews' | 'shipping'>('description');

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.getBySlug(slug || ''),
  });

  const product = productData?.data || mockProduct;
  const productVariants = product.variants || mockProduct.variants;
  const productImages = product.images || mockProduct.images;

  // Set selected variant once product data is loaded
  const [selectedVariant, setSelectedVariant] = useState(productVariants[0]);

  useEffect(() => {
    if (productData?.data?.variants?.length > 0) {
      setSelectedVariant(productData.data.variants[0]);
    }
  }, [productData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const price = selectedVariant?.price || 0;
  const originalPrice = selectedVariant?.originalPrice;
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem({
      id: `${selectedVariant.id}-${Date.now()}`,
      productId: product.id,
      variantId: selectedVariant.id,
      quantity,
      product,
      variant: selectedVariant,
    });
    navigate('/cart');
  };

  const handleBuyNow = () => {
    if (!selectedVariant) return;
    addItem({
      id: `${selectedVariant.id}-${Date.now()}`,
      productId: product.id,
      variantId: selectedVariant.id,
      quantity,
      product,
      variant: selectedVariant,
    });
    navigate('/checkout');
  };

  return (
    <div className="bg-gray-50 py-6 animate-fade-in">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500">
            <li><Link to="/" className="hover:text-primary-600">Home</Link></li>
            <li>/</li>
            <li><Link to="/products" className="hover:text-primary-600">Products</Link></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">{product.name}</li>
          </ol>
        </nav>

        {/* Product Main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-xl overflow-hidden shadow-sm">
              <img
                src={productImages[currentImageIndex]?.url || 'https://via.placeholder.com/800'}
                alt={product.name}
                className="w-full h-full object-contain p-4"
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-primary-500 text-white text-sm font-bold rounded">
                  -{discount}% OFF
                </span>
              )}
              {currentImageIndex > 0 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow hover:bg-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {currentImageIndex < productImages.length - 1 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow hover:bg-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {productImages.map((img: any, index: number) => (
                <button
                  key={img.id || index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    currentImageIndex === index ? 'border-primary-500 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {product.category?.name && (
                  <span className="px-2.5 py-0.5 bg-primary-50 text-primary-600 text-xs font-bold rounded-full">
                    {product.category.name}
                  </span>
                )}
                <span className="text-sm text-gray-500">{product.brand?.name}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(Number(product.ratingAvg || 0))
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-gray-600 font-bold">{Number(product.ratingAvg || 0).toFixed(1)}</span>
                  <span className="text-gray-400">({product.ratingCount || 0} reviews)</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">{(product.soldCount || 0).toLocaleString()} sold</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-accent-50 to-white p-6 rounded-2xl border border-accent-100 mb-8 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-primary-600">
                  ${Number(price).toFixed(2)}
                </span>
                {originalPrice > price && (
                  <div className="flex flex-col">
                    <span className="text-lg text-gray-400 line-through">
                      ${Number(originalPrice).toFixed(2)}
                    </span>
                    <span className="text-accent-600 text-xs font-bold uppercase tracking-wider">
                      Save ${(Number(originalPrice) - Number(price)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Variants */}
            {productVariants.length > 1 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-widest">Select Variant</h3>
                <div className="flex flex-wrap gap-3">
                  {productVariants.map((variant: any) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${
                        selectedVariant?.id === variant.id
                          ? 'border-primary-600 bg-primary-50 text-primary-600 shadow-md'
                          : 'border-gray-200 hover:border-primary-300 text-gray-600'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-10">
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-widest">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center font-bold text-lg focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-gray-400 text-sm">
                  {selectedVariant?.stockQuantity || 0} items available
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
              <button
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-3 px-8 py-4 border-2 border-primary-600 text-primary-600 font-bold rounded-2xl hover:bg-primary-50 transition-all shadow-lg shadow-primary-100"
              >
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
              >
                <Zap className="w-5 h-5 fill-current" /> Buy Now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t">
              <div className="flex flex-col items-center text-center gap-2">
                <Truck className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <ShieldCheck className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Original Product</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Heart className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Save for later</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-12 border-b border-gray-200 mb-8 overflow-x-auto pb-px">
          {(['description', 'reviews', 'shipping'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-all border-b-2 ${
                selectedTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-3xl p-8 mb-16 shadow-sm border border-gray-100">
          {selectedTab === 'description' && (
            <div className="prose max-w-none">
              <p className="text-gray-700 text-lg leading-relaxed mb-10">{product.description}</p>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.attributes || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                    <dt className="text-gray-500 font-medium">{key}</dt>
                    <dd className="font-bold text-gray-900">{value as string}</dd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'reviews' && (
            <div className="text-center py-20 text-gray-500">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No reviews yet for this product.</p>
              <p className="mt-2">Be the first to review this item!</p>
            </div>
          )}

          {selectedTab === 'shipping' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-5 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-3 bg-white rounded-xl shadow-sm text-primary-500">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Standard Shipping</h4>
                  <p className="text-gray-500 text-sm">3-5 business days delivery. Free on orders over $50.</p>
                </div>
              </div>
              <div className="flex items-start gap-5 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-3 bg-white rounded-xl shadow-sm text-accent-500">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Express Delivery</h4>
                  <p className="text-gray-500 text-sm">Next day delivery for orders placed before 2 PM. Flat $9.99 fee.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">You May Also Like</h2>
            <Link to="/products" className="text-primary-600 font-bold hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`/products/${item.slug}`}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden border border-gray-100"
              >
                <div className="aspect-square overflow-hidden bg-gray-50">
                  <img
                    src={item.images?.[0]?.url || 'https://via.placeholder.com/400'}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-lg font-black text-primary-600">${Number(item.variants?.[0]?.price || 0).toFixed(2)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
