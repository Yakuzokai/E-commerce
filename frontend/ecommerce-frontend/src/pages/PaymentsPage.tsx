import { CreditCard, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PaymentsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <Link to="/account" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>
      <h1 className="text-3xl font-bold mb-8">Payment Methods</h1>
      <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-6">No payment methods saved.</p>
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors">
          <Plus className="w-5 h-5" /> Add Payment Method
        </button>
      </div>
    </div>
  );
}
