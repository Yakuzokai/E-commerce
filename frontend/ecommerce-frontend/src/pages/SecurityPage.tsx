import { Shield, ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <Link to="/account" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>
      <h1 className="text-3xl font-bold mb-8">Security Settings</h1>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Change Password</h2>
              <p className="text-sm text-gray-500">It's a good idea to use a strong password that you don't use elsewhere</p>
            </div>
          </div>
          <button className="py-2.5 px-6 border border-gray-200 font-bold rounded-xl hover:bg-gray-50 transition-colors">
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
