'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';
import { siteConfig } from '@/data';
import type { CartItem } from '@/types';

interface CartItemRowProps {
  item: CartItem;
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const { product, quantity } = item;
  const { currencySymbol } = siteConfig;

  const lineTotal = product.price * quantity;

  return (
    <div className="flex gap-4 md:gap-6 py-5 border-b border-ag-500/20 last:border-b-0">
      {/* Product Image */}
      <Link
        href={`/product/${product.slug}`}
        className="shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-ag-800/30"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </Link>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/product/${product.slug}`}
              className="font-heading font-semibold text-sm md:text-base text-ag-100 hover:text-fw-200 transition-colors line-clamp-2"
            >
              {product.name}
            </Link>
            <p className="text-xs md:text-sm font-body text-ag-300 mt-1">{product.vendor}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(product.id)}
            className="shrink-0 size-9 text-ag-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Remove item</span>
          </Button>
        </div>

        {/* Price + Quantity Row */}
        <div className="flex items-center justify-between mt-4 gap-3">
          {/* Quantity Controls */}
          <div className="flex items-center border border-ag-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => updateQuantity(product.id, quantity - 1)}
              className="size-9 flex items-center justify-center text-ag-300 hover:text-ag-100 hover:bg-ag-800/30 transition-colors"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-sm font-body font-medium text-ag-100">
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(product.id, quantity + 1)}
              className="size-9 flex items-center justify-center text-ag-300 hover:text-ag-100 hover:bg-ag-800/30 transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {/* Line Total */}
          <div className="text-right">
            <p className="font-heading font-bold text-base md:text-lg text-ag-100">
              {currencySymbol}
              {lineTotal.toFixed(2)}
            </p>
            {product.originalPrice && (
              <p className="text-xs font-body text-ag-400 line-through">
                {currencySymbol}
                {(product.originalPrice * quantity).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}