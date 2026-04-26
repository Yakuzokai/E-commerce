import { useQuery } from '@tanstack/react-query';
import { Zap, Timer, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productApi } from '@/lib/api';

export default function FlashSalesPage() {
  const { data: flashSales, isLoading } = useQuery({
    queryKey: ['flash-sales'],
    queryFn: () => productApi.getFlashSales(),
  });

  const products = flashSales?.data || [];

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="bg-accent-500 rounded-3xl p-8 mb-12 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-accent-100">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
              <Zap className="w-10 h-10 fill-current" />
            </div>
            <div>
              <h1 className="text-4xl font-black">FLASH SALES</h1>
              <p className="text-accent-50 text-lg">Limited time offers, don't miss out!</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-black/10 px-6 py-4 rounded-2xl border border-white/20 backdrop-blur-md">
            <Timer className="w-6 h-6" />
            <span className="font-bold text-xl uppercase tracking-widest">Ending in 12:45:30</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-white rounded-2xl"></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Zap className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">No active flash sales right now</h2>
            <p className="text-gray-500 mt-2">Check back later for amazing deals!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product: any) => (
              <FlashSaleCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FlashSaleCard({ product }: { product: any }) {
  const discount = Math.round((1 - product.flash_price / product.original_price) * 100);
  
  return (
    <Link to={`/products/${product.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all">
      <div className="relative aspect-square">
        <img src={product.images?.[0]?.url || 'https://via.placeholder.com/400'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute top-4 right-4 bg-accent-500 text-white font-black px-3 py-1.5 rounded-lg shadow-lg">
          -{discount}%
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors mb-4">{product.name}</h3>
        <div className="flex items-end gap-3 mb-6">
          <span className="text-3xl font-black text-accent-600">${Number(product.flash_price).toFixed(2)}</span>
          <span className="text-gray-400 line-through text-lg font-medium">${Number(product.original_price).toFixed(2)}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-gray-500">Sold: {product.sold_quantity}</span>
            <span className="text-accent-600">{Math.round((product.sold_quantity / product.stock_quantity) * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div 
              className="h-full bg-accent-500 rounded-full" 
              style={{ width: `${(product.sold_quantity / product.stock_quantity) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </Link>
  );
}
