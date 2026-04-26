import { Bell, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <Link to="/account" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>
      <h1 className="text-3xl font-bold mb-8">Notifications</h1>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y">
        {['Order Updates', 'Promotions', 'Account Security', 'Newsletter'].map((item) => (
          <div key={item} className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">{item}</h3>
              <p className="text-sm text-gray-500">Receive alerts about {item.toLowerCase()}</p>
            </div>
            <div className="w-12 h-6 bg-primary-500 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
