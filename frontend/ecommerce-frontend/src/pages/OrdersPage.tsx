import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OrdersPage() {
  return (
    <div className="container mx-auto px-4 py-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
      <div className="bg-gray-100 p-6 rounded-full mb-6">
        <Package className="w-12 h-12 text-gray-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">You have no orders yet</h1>
      <p className="text-gray-500 mb-8">When you buy items, they will appear here.</p>
      <Link to="/products" className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors">
        Start Shopping
      </Link>
    </div>
  );
}
