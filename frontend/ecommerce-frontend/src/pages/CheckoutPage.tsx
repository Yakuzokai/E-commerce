import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Truck, ShieldCheck, ArrowLeft, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/stores';
import { orderApi, userApi, Address } from '@/lib/api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, totalItems, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Saved Addresses
  const [savedAddresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    paymentMethod: 'credit_card'
  });

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAddresses();
    }
  }, [isAuthenticated, user?.id]);

  const loadAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const data = await userApi.getAddresses(user!.id);
      setAddresses(data);
      
      // Auto-fill if there's a default address
      const defaultAddr = data.find(a => a.isDefault) || data[0];
      if (defaultAddr) {
        selectAddress(defaultAddr);
      }
    } catch (err) {
      console.error('Failed to load addresses', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const selectAddress = (addr: Address) => {
    const [first, ...rest] = addr.recipientName.split(' ');
    setFormData(prev => ({
      ...prev,
      firstName: first || '',
      lastName: rest.join(' ') || '',
      address: addr.addressLine1 + (addr.addressLine2 ? `, ${addr.addressLine2}` : ''),
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode
    }));
  };

  const shippingFee = subtotal >= 50 ? 0 : 9.99;
  const total = subtotal + shippingFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    if (!formData.address || !formData.city || !formData.postalCode) {
      setError('Please fill in all shipping information.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Format data for Order Service
      const orderData = {
        userId: user?.id,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.variant.price,
          name: item.product.name,
sellerId: item.product.sellerId
        })),
        shippingAddress: {
          street: formData.address,
          city: formData.city,
          state: 'N/A',
          country: 'N/A',
          zipCode: formData.postalCode
        },
        paymentMethod: formData.paymentMethod,
        subtotal,
        shippingFee,
        totalAmount: total
      };

      await orderApi.create(orderData);
      
      setIsSuccess(true);
      clearCart();
      
      // Navigate to orders after a delay
      setTimeout(() => {
        navigate('/orders');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
        <p className="text-gray-500 mb-8 max-w-md">
          Thank you for your purchase. Your order has been received and is being processed. 
          You will be redirected to your orders page shortly.
        </p>
        <Link to="/orders" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 transition-all">
          View My Orders
        </Link>
      </div>
    );
  }

  if (totalItems === 0 && !isSuccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link to="/products" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-6xl">
        <Link to="/cart" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                <X className="w-5 h-5" /> {error}
              </div>
            )}

            {/* Shipping Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold">Shipping Information</h2>
                </div>
                {savedAddresses.length > 0 && (
                  <span className="text-xs font-bold text-gray-400 uppercase">Saved Addresses Found</span>
                )}
              </div>

              {/* Saved Addresses Quick Select */}
              {savedAddresses.length > 0 && (
                <div className="mb-8 overflow-x-auto pb-2 flex gap-3">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectAddress(addr)}
                      className="shrink-0 w-48 p-3 text-left border-2 border-gray-100 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group"
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-primary-600">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold uppercase">{addr.label}</span>
                        {addr.isDefault && <span className="ml-auto w-1.5 h-1.5 bg-primary-500 rounded-full"></span>}
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate">{addr.recipientName}</p>
                      <p className="text-xs text-gray-500 truncate">{addr.addressLine1}</p>
                      <p className="text-xs text-gray-500">{addr.city}, {addr.state}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="firstName"
                  placeholder="First Name" 
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                />
                <input 
                  type="text" 
                  name="lastName"
                  placeholder="Last Name" 
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                />
                <input 
                  type="text" 
                  name="address"
                  placeholder="Address" 
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className="p-3 border rounded-lg md:col-span-2 focus:outline-none focus:ring-2 focus:ring-primary-500" 
                />
                <input 
                  type="text" 
                  name="city"
                  placeholder="City" 
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                />
                <input 
                  type="text" 
                  name="postalCode"
                  placeholder="Postal Code" 
                  required
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold">Payment Method</h2>
              </div>
              <div className="space-y-4">
                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-all ${formData.paymentMethod === 'credit_card' ? 'border-primary-500 bg-primary-50' : ''}`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="credit_card"
                    checked={formData.paymentMethod === 'credit_card'} 
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary-600" 
                  />
                  <div className="flex-1">
                    <p className="font-bold">Credit / Debit Card</p>
                    <p className="text-sm text-gray-500">Pay securely with your card</p>
                  </div>
                  <div className="flex gap-2 text-gray-400">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </label>
                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-all ${formData.paymentMethod === 'paypal' ? 'border-primary-500 bg-primary-50' : ''}`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="paypal"
                    checked={formData.paymentMethod === 'paypal'} 
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary-600" 
                  />
                  <div className="flex-1">
                    <p className="font-bold">PayPal</p>
                    <p className="text-sm text-gray-500">Fast and secure checkout with PayPal</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold mb-6 text-gray-900">Order Summary</h2>
              <div className="space-y-4 mb-6 text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-medium text-gray-900">${Number(subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-medium text-gray-900">{shippingFee === 0 ? 'FREE' : `$${Number(shippingFee).toFixed(2)}`}</span>
                </div>
                <div className="border-t pt-4 flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary-600">${Number(total).toFixed(2)}</span>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" /> Place Order
                  </>
                )}
              </button>
              
              <p className="mt-4 text-xs text-center text-gray-400">
                By placing your order, you agree to our{' '}
                <Link to="/terms" className="underline hover:text-primary-600">Terms of Use</Link>{' '}
                and <Link to="/privacy" className="underline hover:text-primary-600">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
