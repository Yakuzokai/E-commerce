import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores';
import { User, Mail, Phone, Camera, ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [statusMessage, setStatusMessage] = useState('');

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

  const handleSaveProfile = () => {
    if (!user) return;

    setUser({
      ...user,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      avatarUrl: avatarPreview || undefined,
    });

    setStatusMessage('Profile updated successfully.');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <Link to="/account" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>

      <h1 className="text-3xl font-bold mb-8">Personal Information</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header/Cover Placeholder */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-600"></div>
        
        <div className="px-8 pb-8">
          {/* Avatar Section */}
          <div className="relative -mt-12 mb-8">
            <div className="inline-block relative">
              <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={firstName || 'User avatar'}
                    className="w-full h-full rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
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
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" /> Email Address
              </label>
              <input
                type="email"
                defaultValue={user?.email}
                disabled
                className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs text-gray-400 italic">Email cannot be changed manually. Please contact support.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" /> Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 234 567 890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {statusMessage && (
            <p className="mt-6 text-sm font-medium text-green-600">{statusMessage}</p>
          )}

          <div className="mt-10 pt-6 border-t flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
            >
              <Save className="w-5 h-5" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
