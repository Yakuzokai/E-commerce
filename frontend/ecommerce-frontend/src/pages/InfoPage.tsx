import { Compass, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface InfoContent {
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionPath: string;
}

const pageMap: Record<string, InfoContent> = {
  '/seller': {
    title: 'Sell on ShopHub',
    description: 'Start your seller journey with ShopHub. Build your store, list products, and reach more customers.',
    primaryActionLabel: 'Browse Seller Guide',
    primaryActionPath: '/help',
  },
  '/support': {
    title: 'Help Center',
    description: 'Our support resources are being expanded. You can still explore common questions and policies below.',
    primaryActionLabel: 'Open FAQs',
    primaryActionPath: '/faq',
  },
  '/about': {
    title: 'About ShopHub',
    description: 'Learn about our mission, team, and how we build a reliable shopping experience for everyone.',
    primaryActionLabel: 'Contact Us',
    primaryActionPath: '/contact',
  },
  '/contact': {
    title: 'Contact Us',
    description: 'Need help with an order or account? Reach out and our team will get back to you.',
    primaryActionLabel: 'Open Help Center',
    primaryActionPath: '/help',
  },
  '/blog': {
    title: 'ShopHub Blog',
    description: 'We are preparing new stories, product highlights, and shopping tips. Check back soon for updates.',
    primaryActionLabel: 'Browse Products',
    primaryActionPath: '/products',
  },
  '/faq': {
    title: 'Frequently Asked Questions',
    description: 'Find quick answers about orders, shipping, payments, and returns.',
    primaryActionLabel: 'View Shipping Info',
    primaryActionPath: '/shipping',
  },
  '/careers': {
    title: 'Careers at ShopHub',
    description: 'We are always looking for talented people. Explore opportunities and grow with our team.',
    primaryActionLabel: 'Learn About Us',
    primaryActionPath: '/about',
  },
  '/help': {
    title: 'Customer Help Center',
    description: 'Find resources for account support, payments, shipping, and returns.',
    primaryActionLabel: 'Track an Order',
    primaryActionPath: '/track-order',
  },
  '/shipping': {
    title: 'Shipping Information',
    description: 'Review estimated delivery times, shipping fees, and service coverage.',
    primaryActionLabel: 'View Returns Policy',
    primaryActionPath: '/returns',
  },
  '/returns': {
    title: 'Returns and Refunds',
    description: 'Read how returns work, refund timelines, and item eligibility conditions.',
    primaryActionLabel: 'Open Help Center',
    primaryActionPath: '/help',
  },
  '/track-order': {
    title: 'Track Your Order',
    description: 'Order tracking is being connected right now. You can still review your recent purchases in your account.',
    primaryActionLabel: 'Go to My Orders',
    primaryActionPath: '/orders',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: 'Understand how we collect, process, and protect your personal data at ShopHub.',
    primaryActionLabel: 'Read Terms of Use',
    primaryActionPath: '/terms',
  },
  '/terms': {
    title: 'Terms of Use',
    description: 'Review the terms and conditions for using ShopHub services and purchasing products.',
    primaryActionLabel: 'Read Privacy Policy',
    primaryActionPath: '/privacy',
  },
};

const fallbackContent: InfoContent = {
  title: 'Page Information',
  description: 'This content is currently being prepared. You can continue shopping in the meantime.',
  primaryActionLabel: 'Browse Products',
  primaryActionPath: '/products',
};

export default function InfoPage() {
  const { pathname } = useLocation();
  const content = pageMap[pathname] || fallbackContent;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-5 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
          <Compass className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{content.title}</h1>
        <p className="text-gray-600 mb-8">{content.description}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={content.primaryActionPath}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors"
          >
            {content.primaryActionLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
