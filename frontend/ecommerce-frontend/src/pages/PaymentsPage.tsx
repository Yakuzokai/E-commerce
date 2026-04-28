import { useState } from 'react';
import { CreditCard, Plus, ArrowLeft, Trash2, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaymentMethod {
  id: string;
  cardHolder: string;
  cardNumber: string;
  expiryDate: string;
  isDefault: boolean;
}

export default function PaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setCardHolder('');
    setCardNumber('');
    setExpiryDate('');
    setError('');
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();

    const digitsOnly = cardNumber.replace(/\D/g, '');
    if (!cardHolder.trim() || digitsOnly.length < 12 || !expiryDate.trim()) {
      setError('Please provide a valid card holder name, card number, and expiry date.');
      return;
    }

    const last4 = digitsOnly.slice(-4);
    const newMethod: PaymentMethod = {
      id: String(Date.now()),
      cardHolder: cardHolder.trim(),
      cardNumber: `**** **** **** ${last4}`,
      expiryDate: expiryDate.trim(),
      isDefault: methods.length === 0,
    };

    setMethods((prev) => [...prev, newMethod]);
    handleCloseModal();
  };

  const handleSetDefault = (id: string) => {
    setMethods((prev) => prev.map((method) => ({ ...method, isDefault: method.id === id })));
  };

  const handleRemoveMethod = (id: string) => {
    setMethods((prev) => {
      const filtered = prev.filter((method) => method.id !== id);
      if (filtered.length > 0 && !filtered.some((method) => method.isDefault)) {
        return filtered.map((method, index) => ({
          ...method,
          isDefault: index === 0,
        }));
      }
      return filtered;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <Link to="/account" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>
      <h1 className="text-3xl font-bold mb-8">Payment Methods</h1>

      {methods.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-6">No payment methods saved.</p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Payment Method
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add New Card
            </button>
          </div>

          {methods.map((method) => (
            <div key={method.id} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900">{method.cardNumber}</p>
                <p className="text-sm text-gray-500">{method.cardHolder} • Expires {method.expiryDate}</p>
                {method.isDefault && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-600 uppercase tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Default
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(method.id)}
                    className="px-3 py-2 text-sm font-semibold text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Set Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveMethod(method.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Add Payment Method</h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMethod} className="p-6 space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">{error}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Holder</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Payment Method
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
