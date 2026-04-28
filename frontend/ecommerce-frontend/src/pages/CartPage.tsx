// Cart Page

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Ticket } from 'lucide-react';
import { useCartStore } from '@/stores';

export default function CartPage() {
  const { items, totalItems, subtotal, updateQuantity, removeItem, clearCart } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const shippingFee = subtotal >= 50 ? 0 : 9.99;
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  useEffect(() => {
    if (!appliedCoupon) {
      setDiscountAmount(0);
      return;
    }

    if (appliedCoupon === 'SAVE10') {
      setDiscountAmount(Number((subtotal * 0.1).toFixed(2)));
    }
  }, [appliedCoupon, subtotal]);

  const handleApplyCoupon = () => {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) {
      setCouponMessage('Please enter a coupon code.');
      return;
    }

    if (normalized === 'SAVE10') {
      setAppliedCoupon(normalized);
      setDiscountAmount(Number((subtotal * 0.1).toFixed(2)));
      setCouponMessage('Coupon SAVE10 applied. You get 10% off your subtotal.');
      return;
    }

    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponMessage('Coupon not recognized. Try SAVE10.');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16 animate-fade-in">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors"
          >
            Start Shopping <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-8 animate-fade-in">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart ({totalItems})</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b bg-gray-50 text-sm font-medium text-gray-500">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {/* Items */}
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.id} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Product Info */}
                      <div className="col-span-1 md:col-span-6 flex gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          <img
                            src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/100'}
                            alt={item.product?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <Link
                            to={`/products/${item.product?.slug}`}
                            className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
                          >
                            {item.product?.name || 'Product'}
                          </Link>
                          {item.variant?.name && (
                            <p className="text-sm text-gray-500 mt-1">{item.variant.name}</p>
                          )}
                          <p className="text-sm text-gray-500">SKU: {item.variant?.sku || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="col-span-1 md:col-span-2 text-center">
                        <span className="md:hidden text-sm text-gray-500">Price: </span>
                        <span className="font-medium">${Number(item.variant?.price || 0).toFixed(2)}</span>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="p-2 hover:bg-gray-100 transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-12 text-center border-x border-gray-300 py-2 focus:outline-none"
                            />
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="col-span-1 md:col-span-2 text-right">
                        <span className="md:hidden text-sm text-gray-500">Total: </span>
                        <span className="font-bold text-primary-600">
                          ${((item.variant?.price || 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex justify-between items-center">
                <button
                  onClick={clearCart}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  Clear Cart
                </button>
                <Link
                  to="/products"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

              {/* Coupon */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2"
                  >
                    <Ticket className="w-5 h-5" /> Apply
                  </button>
                </div>
                {couponMessage && (
                  <p className={`mt-2 text-xs ${appliedCoupon ? 'text-green-600' : 'text-amber-600'}`}>
                    {couponMessage}
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>${Number(subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={shippingFee === 0 ? 'text-green-600' : ''}>
                    {shippingFee === 0 ? 'FREE' : `$${Number(shippingFee).toFixed(2)}`}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount{appliedCoupon ? ` (${appliedCoupon})` : ''}</span>
                    <span>- ${Number(discountAmount).toFixed(2)}</span>
                  </div>
                )}
                {shippingFee > 0 && (
                  <p className="text-sm text-gray-500">
                    Add ${(50 - Number(subtotal)).toFixed(2)} more for free shipping!
                  </p>
                )}
                <div className="border-t pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">${Number(total).toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Link
                to="/checkout"
                className="block w-full py-4 bg-primary-500 text-white text-center font-semibold rounded-lg hover:bg-primary-600 transition-colors"
              >
                Proceed to Checkout
              </Link>

              {/* Secure Payment */}
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.458-8 11.268C6.34 16.458 3 12.225 3 7c0-.682.057-1.35.166-2.001zm10.5 5.001L9.5 6v5a.5.5 0 001 0V6a.5.5 0 00-1 0v5l-3-3z" clipRule="evenodd" />
                </svg>
                Secure checkout guaranteed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
