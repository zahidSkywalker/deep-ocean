'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Heart, ShoppingCart, Minus, Plus, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import type { Product, Vendor } from '@/types';

interface ProductInfoProps {
  product: Product;
  vendor?: Vendor;
}

export default function ProductInfo({ product, vendor }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const { toggleItem, isWishlisted } = useWishlistStore();

  const wishlisted = isWishlisted(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const inStock = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 10;

  function handleAddToCart() {
    addItem(product, quantity);
    setQuantity(1);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Vendor */}
      {vendor && (
        <Link
          href={`/search?vendor=${vendor.slug}`}
          className="text-sm text-fw-200 font-body font-medium hover:text-fw-100 transition-colors w-fit"
        >
          {vendor.name}
        </Link>
      )}

      {/* Name */}
      <h1 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-ag-100 leading-tight">
        {product.name}
      </h1>

      {/* Rating */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`size-4 ${
                star <= Math.floor(product.rating)
                  ? 'fill-fw-300 text-fw-300'
                  : star <= product.rating
                  ? 'fill-fw-400 text-fw-400'
                  : 'fill-ag-500 text-ag-500'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-ag-300 font-body">
          {product.rating} ({product.reviews} reviews)
        </span>
      </div>

      {/* Price */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-heading font-bold text-3xl md:text-4xl text-ag-100">
          ${product.price.toFixed(2)}
        </span>
        {product.originalPrice && (
          <>
            <span className="text-base text-ag-400 font-body line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
            <Badge className="bg-red-500 text-white text-xs font-body font-semibold px-2 py-0.5 rounded-md">
              -{discount}%
            </Badge>
          </>
        )}
      </div>

      <Separator className="bg-ag-500/30" />

      {/* Short description */}
      <p className="text-ag-200 font-body text-sm md:text-base leading-relaxed">
        {product.description}
      </p>

      {/* Stock status */}
      <div className="flex items-center gap-2">
        {inStock ? (
          <>
            <Check className="size-4 text-green-600" />
            <span className={`text-sm font-body font-medium ${lowStock ? 'text-amber-600' : 'text-green-600'}`}>
              {lowStock ? `Only ${product.stock} left in stock` : 'In Stock'}
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="size-4 text-red-500" />
            <span className="text-sm font-body font-medium text-red-500">
              Out of Stock
            </span>
          </>
        )}
      </div>

      {/* Quantity + Add to Cart */}
      <div className="flex items-center gap-4">
        {/* Quantity Selector */}
        <div className="flex items-center border border-ag-500/40 rounded-xl overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-none text-ag-200 hover:bg-ag-800"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-12 text-center font-heading font-semibold text-ag-100">
            {quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-none text-ag-200 hover:bg-ag-800"
            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            disabled={quantity >= product.stock}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Add to Cart */}
        <Button
          onClick={handleAddToCart}
          disabled={!inStock}
          className="flex-1 h-12 md:h-14 bg-ag-100 hover:bg-ag-200 text-white font-heading font-semibold rounded-xl text-base"
        >
          <ShoppingCart className="size-5 mr-2" />
          Add to Cart
        </Button>
      </div>

      {/* Wishlist */}
      <Button
        variant="outline"
        onClick={() => toggleItem(product.id)}
        className={`h-12 rounded-xl font-heading font-medium border-ag-500/40 ${
          wishlisted
            ? 'border-red-300 text-red-500 hover:bg-red-50'
            : 'text-ag-200 hover:bg-ag-800'
        }`}
      >
        <Heart
          className={`size-4 mr-2 ${
            wishlisted ? 'fill-red-500 text-red-500' : ''
          }`}
        />
        {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
      </Button>

      {/* Tags */}
      {product.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {product.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-ag-800 text-ag-300 text-xs font-body px-2.5 py-1 rounded-lg"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}