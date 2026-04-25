// Product Page

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, Heart, Share2, Truck, Shield, RotateCcw, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { productApi } from '@/lib/api';
import { useCartStore } from '@/stores';

// Mock product data for demo
const mockProduct: any = {
  id: '1',
  sellerId: 's1',
  name: 'Wireless Bluetooth Headphones',
  slug: 'wireless-bluetooth-headphones',
  description: 'Experience premium sound quality with our Wireless Bluetooth Headphones. Features active noise cancellation, 40-hour battery life, and ultra-comfortable memory foam ear cushions. Perfect for music lovers, gamers, and professionals who need to focus.',
  condition: 'new',
  status: 'active',
  ratingAvg: 4.5,
  ratingCount: 1250,
  reviewCount: 890,
  soldCount: 2340,
  viewCount: 12000,
  brand: { id: 'b1', name: 'AudioPro', slug: 'audiopro', isVerified: true },
  category: { id: 'c1', name: 'Electronics', slug: 'electronics' },
  variants: [
    { id: 'v1', productId: '1', sku: 'WBH-BLK', name: 'Black', price: 79.99, originalPrice: 129.99, stockQuantity: 50, reservedQuantity: 0, lowStockThreshold: 10, isActive: true },
    { id: 'v2', productId: '1', sku: 'WBH-WHT', name: 'White', price: 79.99, originalPrice: 129.99, stockQuantity: 30, reservedQuantity: 0, lowStockThreshold: 10, isActive: true },
    { id: 'v3', productId: '1', sku: 'WBH-RED', name: 'Red', price: 89.99, originalPrice: 139.99, stockQuantity: 0, reservedQuantity: 0, lowStockThreshold: 10, isActive: true },
  ],
  images: [
    { id: 'i1', productId: '1', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', isPrimary: true },
    { id: 'i2', productId: '1', url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800', isPrimary: false },
    { id: 'i3', productId: '1', url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800', isPrimary: false },
    { id: 'i4', productId: '1', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', isPrimary: false },
  ],
  attributes: {
    'Connectivity': 'Bluetooth 5.0',
    'Battery Life': '40 hours',
    'Charging': 'USB-C',
    'Weight': '250g',
    'Noise Cancellation': 'Active (ANC)',
  },
};

// Related products mock
const relatedProducts = [
  { id: '2', name: 'Smart Watch Pro', slug: 'smart-watch-pro', variants: [{ price: 199.99, originalPrice: 299.99 }], images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' }], ratingAvg: 4.8, soldCount: 1560 },
  { id: '4', name: 'Noise Cancelling Earbuds', slug: 'noise-cancelling-earbuds', variants: [{ price: 149.99, originalPrice: 199.99 }], images: [{ url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400' }], ratingAvg: 4.6, soldCount: 3200 },
  { id: '7', name: '4K Ultra HD Webcam', slug: '4k-uhd-webcam', variants: [{ price: 129.99, originalPrice: 169.99 }], images: [{ url: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400' }], ratingAvg: 4.5, soldCount: 720 },
  { id: '8', name: 'USB-C Hub 7-in-1', slug: 'usb-c-hub-7in1', variants: [{ price: 49.99, originalPrice: 69.99 }], images: [{ url: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400' }], ratingAvg: 4.6, soldCount: 1650 },
];

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [selectedVariant, setSelectedVariant] = useState(mockProduct.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'description' | 'reviews' | 'shipping'>('description');

  const { data: productData } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.getBySlug(slug || ''),
  });

  const product = productData?.data || mockProduct;
  const productVariants = product.variants || mockProduct.variants;
  const productImages = product.images || mockProduct.images;

  const discount = selectedVariant.originalPrice
    ? Math.round((1 - selectedVariant.price / selectedVariant.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
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
            <div className="relative aspect-square bg-white rounded-xl overflow-hidden">
              <img
                src={productImages[currentImageIndex]?.url || 'https://via.placeholder.com/800'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-primary-500 text-white text-sm font-bold rounded">
                  -{discount}% OFF
                </span>
              )}
              {currentImageIndex > 0 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {currentImageIndex < productImages.length - 1 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {productImages.map((img: any, index: number) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    index === currentImageIndex ? 'border-primary-500' : 'border-transparent'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Brand */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.brand?.isVerified && (
                  <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs font-medium rounded">
                    Verified Seller
                  </span>
                )}
                <span className="text-sm text-gray-500">{product.brand?.name}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(product.ratingAvg)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-gray-600">{product.ratingAvg.toFixed(1)}</span>
                  <span className="text-gray-400">({product.ratingCount} reviews)</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">{product.soldCount.toLocaleString()} sold</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-accent-50 to-white p-4 rounded-xl border border-accent-100">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary-600">
                  ${selectedVariant.price.toFixed(2)}
                </span>
                {selectedVariant.originalPrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ${selectedVariant.originalPrice.toFixed(2)}
                    </span>
                    <span className="px-2 py-1 bg-primary-500 text-white text-sm font-bold rounded">
                      Save ${(selectedVariant.originalPrice - selectedVariant.price).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Variants */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Color/Type</h3>
              <div className="flex flex-wrap gap-3">
                {productVariants.map((variant: any) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.stockQuantity === 0}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedVariant.id === variant.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : variant.stockQuantity === 0
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {variant.name || variant.sku}
                    {variant.stockQuantity === 0 && (
                      <span className="ml-2 text-xs text-gray-400">(Sold out)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border-x border-gray-300 py-2 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-gray-500">
                  {selectedVariant.stockQuantity > 0
                    ? `${selectedVariant.stockQuantity} available`
                    : 'Out of stock'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAddToCart}
                disabled={selectedVariant.stockQuantity === 0}
                className="flex-1 py-4 px-6 border-2 border-primary-500 text-primary-600 font-semibold rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5" />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={selectedVariant.stockQuantity === 0}
                className="flex-1 py-4 px-6 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now
              </button>
              <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Truck className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="font-medium text-gray-900">Free Shipping</p>
                  <p className="text-sm text-gray-500">Orders over $50</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="font-medium text-gray-900">Secure Payment</p>
                  <p className="text-sm text-gray-500">100% Protected</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="font-medium text-gray-900">Easy Returns</p>
                  <p className="text-sm text-gray-500">30-day policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-8">
            {(['description', 'reviews', 'shipping'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`pb-4 px-2 font-medium border-b-2 transition-colors capitalize ${
                  selectedTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl p-6 mb-12">
          {selectedTab === 'description' && (
            <div className="prose max-w-none">
              <p className="text-gray-700 mb-6">{product.description}</p>
              <h3 className="font-semibold text-gray-900 mb-4">Specifications</h3>
              <dl className="grid grid-cols-2 gap-4">
                {Object.entries(product.attributes || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <dt className="text-gray-500">{key}</dt>
                    <dd className="font-medium text-gray-900">{value as string}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {selectedTab === 'reviews' && (
            <div className="text-center py-12 text-gray-500">
              <p>Reviews section - {product.reviewCount} reviews shown here</p>
            </div>
          )}

          {selectedTab === 'shipping' && (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <Truck className="w-6 h-6 text-primary-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Free Standard Shipping</h4>
                  <p className="text-gray-500">3-5 business days on orders over $50</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <Truck className="w-6 h-6 text-secondary-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Express Shipping</h4>
                  <p className="text-gray-500">1-2 business days - $9.99</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`/products/${item.slug}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={item.images[0].url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold text-primary-600">${item.variants[0].price}</span>
                    {item.variants[0].originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        ${item.variants[0].originalPrice}
                      </span>
                    )}
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
