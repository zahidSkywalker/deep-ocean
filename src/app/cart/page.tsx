'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore, getTotalItems } from '@/store/useCartStore';
import CartItemRow from '@/components/cart/CartItemRow';
import OrderSummary from '@/components/checkout/OrderSummary';
import Breadcrumb from '@/components/shared/Breadcrumb';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const totalItems = getTotalItems(items);

  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-12">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Cart' },
            ]}
          />

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-ag-100">
                Shopping Cart
              </h1>
              {items.length > 0 && (
                <p className="text-sm font-body text-ag-300 mt-1">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
                </p>
              )}
            </div>
            {items.length > 0 && (
              <Link href="/">
                <Button
                  variant="ghost"
                  className="text-ag-300 hover:text-ag-100 hover:bg-ag-800/30 rounded-xl font-body text-sm gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Continue Shopping
                </Button>
              </Link>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-ag-800/30 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="size-10 text-ag-400" />
              </div>
              <h2 className="text-xl font-heading font-bold text-ag-100 mb-2">
                Your cart is empty
              </h2>
              <p className="text-ag-300 font-body text-sm mb-6 max-w-sm">
                Looks like you haven&apos;t added anything to your cart yet. Start exploring our
                amazing products!
              </p>
              <Link href="/">
                <Button className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-sm px-6 h-11 transition-colors">
                  Start Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft p-4 md:p-6">
                <div className="divide-y divide-ag-500/20">
                  {items.map((item) => (
                    <CartItemRow key={item.product.id} item={item} />
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-28">
                  <OrderSummary items={items} showCheckoutButton />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}