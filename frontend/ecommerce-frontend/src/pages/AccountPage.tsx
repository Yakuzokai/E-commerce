import { useAuthStore } from '@/stores';
import { User, Package, Heart, MapPin, CreditCard, Bell, Shield, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleEditProfile = () => {
    navigate('/account/profile');
  };

  const menuItems = [
    { icon: User, label: 'Personal Info', description: 'Update your name and contact details', path: '/account/profile' },
    { icon: Package, label: 'My Orders', description: 'View and track your orders', path: '/orders' },
    { icon: Heart, label: 'Wishlist', description: 'Items you have saved for later', path: '/wishlist' },
    { icon: MapPin, label: 'Addresses', description: 'Manage your shipping addresses', path: '/account/addresses' },
    { icon: CreditCard, label: 'Payments', description: 'Manage your payment methods', path: '/account/payments' },
    { icon: Bell, label: 'Notifications', description: 'Control your alert preferences', path: '/account/notifications' },
    { icon: Shield, label: 'Security', description: 'Update password and security settings', path: '/account/security' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-3xl font-bold">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <button
                type="button"
                onClick={handleEditProfile}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
              >
                <User className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-500 mb-6">{user?.email}</p>
            <button
              type="button"
              onClick={handleEditProfile}
              className="w-full py-2.5 bg-primary-50 text-primary-600 font-semibold rounded-xl hover:bg-primary-100 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                className="flex items-center justify-between p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl text-primary-600 group-hover:bg-primary-50 transition-colors">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
