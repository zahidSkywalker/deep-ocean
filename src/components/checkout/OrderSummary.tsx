'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';
import { useCartStore, getSubtotal, getTotalSavings, getTotalItems } from '@/store/useCartStore';
import { siteConfig, shippingConfig } from '@/data';
import type { CartItem } from '@/types';

interface OrderSummaryProps {
  items: CartItem[];
  showCheckoutButton?: boolean;
}

export default function OrderSummary({ items, showCheckoutButton = false }: OrderSummaryProps) {
  const { currencySymbol, freeShippingThreshold } = siteConfig;
  const subtotal = getSubtotal(items);
  const savings = getTotalSavings(items);
  const totalItems = getTotalItems(items);
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingConfig.standardShipping;
  const tax = subtotal * shippingConfig.taxRate;
  const total = subtotal + shipping + tax;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8">
      <h3 className="font-heading font-bold text-lg md:text-xl text-ag-100 mb-6">Order Summary</h3>

      <div className="space-y-4 text-sm font-body">
        <div className="flex justify-between text-ag-200">
          <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
          <span className="font-medium text-ag-100">
            {currencySymbol}{subtotal.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-ag-200">
          <span>Shipping</span>
          {shipping === 0 ? (
            <span className="font-medium text-green-600">Free</span>
          ) : (
            <span className="font-medium text-ag-100">
              {currencySymbol}{shipping.toFixed(2)}
            </span>
          )}
        </div>

        {shipping > 0 && (
          <p className="text-xs text-fw-200 font-body">
            Add {currencySymbol}
            {(freeShippingThreshold - subtotal).toFixed(2)} more for free shipping!
          </p>
        )}

        <div className="flex justify-between text-ag-200">
          <span>Estimated Tax</span>
          <span className="font-medium text-ag-100">
            {currencySymbol}{tax.toFixed(2)}
          </span>
        </div>

        {savings > 0 && (
          <div className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-3">
            <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
              <Tag className="size-3.5" />
              You Save
            </span>
            <span className="font-heading font-bold text-green-700">
              -{currencySymbol}{savings.toFixed(2)}
            </span>
          </div>
        )}

        <div className="border-t border-ag-500/20 pt-4">
          <div className="flex justify-between">
            <span className="font-heading font-bold text-xl text-ag-100">Total</span>
            <span className="font-heading font-bold text-xl text-ag-100">
              {currencySymbol}{total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {showCheckoutButton && (
        <Link href="/checkout" className="block mt-8">
          <Button className="w-full h-12 bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-base transition-colors">
            Proceed to Checkout
          </Button>
        </Link>
      )}
    </div>
  );
}