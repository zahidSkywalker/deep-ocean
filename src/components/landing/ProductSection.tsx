'use client';

import { useState } from 'react';
import { Star, Heart, ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Product } from './data';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= Math.floor(rating)
              ? 'fill-fw-300 text-fw-300'
              : star <= rating
              ? 'fill-fw-400 text-fw-400'
              : 'fill-ag-500 text-ag-500'
          }`}
        />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [isLiked, setIsLiked] = useState(false);

  const badgeColors: Record<string, string> = {
    'Best Seller': 'bg-ag-100 text-white',
    'New': 'bg-fw-300 text-white',
    'Hot': 'bg-red-500 text-white',
    'Handmade': 'bg-ac-200 text-white',
    'Trending': 'bg-fw-200 text-white',
    'Sale': 'bg-red-500 text-white',
    'Popular': 'bg-ag-200 text-white',
    'Organic': 'bg-ac-300 text-white',
  };

  return (
    <div className="group bg-white rounded-2xl border border-ag-500/20 overflow-hidden hover-lift shadow-soft">
      {/* Image Container */}
      <div className="relative aspect-square bg-ag-800 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badge */}
        {product.badge && (
          <Badge className={`absolute top-3 left-3 font-heading text-[11px] font-semibold px-2.5 py-0.5 rounded-lg ${badgeColors[product.badge] || 'bg-ag-100 text-white'}`}>
            {product.badge}
          </Badge>
        )}

        {/* Wishlist Button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full border border-ag-500/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-110"
          aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`size-4 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-ag-300'}`} />
        </button>

        {/* Quick Actions */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
          <Button className="flex-1 h-9 bg-ag-100 hover:bg-ag-200 text-white text-xs font-heading font-semibold rounded-xl shadow-md">
            <ShoppingCart className="size-3.5 mr-1.5" />
            Add to Cart
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-white/80 backdrop-blur-sm border-ag-500/20 hover:bg-white rounded-xl shrink-0">
            <Eye className="size-3.5 text-ag-300" />
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Vendor */}
        <p className="text-xs text-fw-200 font-body font-medium mb-1 truncate">
          {product.vendor}
        </p>

        {/* Product Name */}
        <h3 className="font-heading font-semibold text-sm text-ag-100 leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={product.rating} />
          <span className="text-xs text-ag-300 font-body">
            {product.rating} ({product.reviews})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-lg text-ag-100">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-ag-400 font-body line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
          {product.originalPrice && (
            <Badge variant="secondary" className="bg-red-50 text-red-600 text-[10px] font-body font-semibold px-1.5 py-0 rounded-md border-0">
              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  products,
  id,
}: {
  title: string;
  subtitle: string;
  products: Product[];
  id?: string;
}) {
  return (
    <section id={id} className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ag-100 mb-2">
              {title}
            </h2>
            <p className="text-ag-300 font-body max-w-md">
              {subtitle}
            </p>
          </div>
          <Button variant="outline" className="border-ag-400 text-ag-200 hover:bg-ag-800/50 rounded-xl font-heading font-medium self-start sm:self-auto">
            View All Products
          </Button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export { ProductSection, ProductCard };
