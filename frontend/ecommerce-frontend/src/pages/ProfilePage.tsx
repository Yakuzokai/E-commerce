import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores';
import { User, Mail, Phone, Camera, ArrowLeft, Save, Shield, Bell, CreditCard, Package, Heart, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'notifications' | 'preferences'>('personal');

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setAvatarPreview(user?.avatarUrl || '');
  }, [user]);

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
        setStatusMessage('Profile photo selected. Click Save Changes to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setStatusMessage('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    setUser({
      ...user,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      avatarUrl: avatarPreview || undefined,
    });

    setStatusMessage('Profile updated successfully!');
    setIsSaving(false);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <Link to="/account" className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Account</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              {/* Profile Summary */}
              <div className="p-6 text-center border-b">
                <div className="relative inline-block mb-3">
                  <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user?.firstName?.charAt(0) || 'U'
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900">{user?.firstName || 'User'} {user?.lastName}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>

              {/* Navigation */}
              <nav className="p-2">
                {[
                  { id: 'personal', icon: User, label: 'Personal Info' },
                  { id: 'security', icon: Shield, label: 'Security' },
                  { id: 'notifications', icon: Bell, label: 'Notifications' },
                  { id: 'preferences', icon: Settings, label: 'Preferences' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeTab === item.id
                        ? 'bg-primary-50 text-primary-600 font-bold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-500" />
                    Personal Information
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Manage your personal details and contact information</p>
                </div>

                <div className="p-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-6 mb-8 pb-8 border-b">
                    <div className="relative">
                      <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          user?.firstName?.charAt(0) || 'U'
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleAvatarPick}
                        className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Profile Photo</h3>
                      <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 2MB.</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        disabled
                        className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="mt-1.5 text-xs text-gray-400">Email cannot be changed manually.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+1 234 567 890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                      <input
                        type="text"
                        defaultValue="April 2025"
                        disabled
                        className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {statusMessage && (
                    <p className="mt-6 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-xl">{statusMessage}</p>
                  )}

                  <div className="mt-8 pt-6 border-t flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-70"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary-500" />
                      Password
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Change your password to keep your account secure</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <input type="password" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter current password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input type="password" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter new password" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                        <input type="password" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Confirm new password" />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
                      <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account</p>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-bold rounded-full">Disabled</span>
                  </div>
                  <div className="p-6">
                    <button className="px-6 py-3 border-2 border-primary-600 text-primary-600 font-bold rounded-xl hover:bg-primary-50 transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary-500" />
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Choose how you want to be notified</p>
                </div>
                <div className="p-6 space-y-6">
                  {[
                    { title: 'Order Updates', desc: 'Get notified when your order status changes', enabled: true },
                    { title: 'Promotions & Deals', desc: 'Receive promotional offers and discount notifications', enabled: false },
                    { title: 'Price Alerts', desc: 'Get alerts when items in your wishlist go on sale', enabled: true },
                    { title: 'New Messages', desc: 'Notifications for new messages from sellers', enabled: true },
                    { title: 'Account Security', desc: 'Important security alerts and login notifications', enabled: true },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <button className={`w-12 h-7 rounded-full transition-colors relative ${item.enabled ? 'bg-primary-600' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary-500" />
                      Payment Methods
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your payment options</p>
                  </div>
                  <div className="p-6">
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">No payment methods saved</p>
                      <button className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors">
                        Add Payment Method
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary-500" />
                      Shipping Addresses
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your delivery addresses</p>
                  </div>
                  <div className="p-6">
                    <Link to="/account/addresses" className="block text-center py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors">
                      Manage Addresses →
                    </Link>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Heart className="w-5 h-5 text-primary-500" />
                      Wishlist
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Items you've saved for later</p>
                  </div>
                  <div className="p-6">
                    <Link to="/wishlist" className="block text-center py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors">
                      View Wishlist →
                    </Link>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary-500" />
                      Language & Region
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Customize your experience</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>Spanish</option>
                        <option>Chinese</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                        <option>GBP (£)</option>
                        <option>CNY (¥)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}