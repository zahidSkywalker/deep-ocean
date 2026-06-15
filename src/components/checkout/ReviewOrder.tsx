'use client';

import { siteConfig, paymentMethods, shippingConfig, countries, usStates } from '@/data';
import type { Address, CartItem, PaymentMethod } from '@/types';
import { getSubtotal, getTotalItems } from '@/store/useCartStore';

interface ReviewOrderProps {
  items: CartItem[];
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
}

export default function ReviewOrder({ items, shippingAddress, paymentMethod }: ReviewOrderProps) {
  const { currencySymbol, freeShippingThreshold } = siteConfig;
  const subtotal = getSubtotal(items);
  const totalItems = getTotalItems(items);
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingConfig.standardShipping;
  const tax = subtotal * shippingConfig.taxRate;
  const total = subtotal + shipping + tax;

  const paymentLabel = paymentMethods.find((m) => m.id === paymentMethod)?.label ?? paymentMethod;
  const countryName = countries.find((c) => c.code === shippingAddress.country)?.name ?? shippingAddress.country;
  const stateName = usStates.find((s) => s.code === shippingAddress.state)?.name ?? shippingAddress.state;

  return (
    <div className="space-y-6">
      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-ag-500/20 p-5 md:p-6">
        <h3 className="font-heading font-bold text-lg text-ag-100 mb-5">Order Items ({totalItems})</h3>
        <div className="space-y-4 max-h-72 overflow-y-auto">
          {items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-ag-800/30 shrink-0">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-ag-100 font-medium truncate">{item.product.name}</p>
                <p className="text-xs font-body text-ag-400 mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="font-heading font-semibold text-sm text-ag-100 shrink-0">
                {currencySymbol}{(item.product.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-white rounded-2xl border border-ag-500/20 p-5 md:p-6">
        <h3 className="font-heading font-bold text-lg text-ag-100 mb-4">Shipping Address</h3>
        <div className="text-sm font-body text-ag-200 space-y-1.5">
          <p className="font-medium text-ag-100">
            {shippingAddress.firstName} {shippingAddress.lastName}
          </p>
          <p>{shippingAddress.street}</p>
          {shippingAddress.apartment && <p>{shippingAddress.apartment}</p>}
          <p>
            {shippingAddress.city}, {stateName} {shippingAddress.zipCode}
          </p>
          <p>{countryName}</p>
          <p className="text-ag-400">{shippingAddress.phone}</p>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-2xl border border-ag-500/20 p-5 md:p-6">
        <h3 className="font-heading font-bold text-lg text-ag-100 mb-4">Payment Method</h3>
        <p className="font-body text-sm text-ag-200">{paymentLabel}</p>
      </div>

      {/* Total Breakdown */}
      <div className="bg-white rounded-2xl border border-ag-500/20 p-5 md:p-6">
        <h3 className="font-heading font-bold text-lg text-ag-100 mb-4">Order Total</h3>
        <div className="space-y-3 text-sm font-body">
          <div className="flex justify-between text-ag-200">
            <span>Subtotal</span>
            <span>{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-ag-200">
            <span>Shipping</span>
            <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
              {shipping === 0 ? 'Free' : `${currencySymbol}${shipping.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-ag-200">
            <span>Estimated Tax</span>
            <span>{currencySymbol}{tax.toFixed(2)}</span>
          </div>
          <div className="border-t border-ag-500/20 pt-3 mt-3">
            <div className="flex justify-between">
              <span className="font-heading font-bold text-xl text-ag-100">Total</span>
              <span className="font-heading font-bold text-xl text-ag-100">
                {currencySymbol}{total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}