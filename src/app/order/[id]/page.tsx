'use client';

import { use } from 'react';
import Link from 'next/link';
import { Check, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrderStore } from '@/store/useOrderStore';
import { siteConfig, orderStatusConfig, paymentMethods, countries } from '@/data';
import Breadcrumb from '@/components/shared/Breadcrumb';

interface OrderConfirmationPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { id } = use(params);
  return <OrderConfirmationInner orderId={id} />;
}

function OrderConfirmationInner({ orderId }: { orderId: string }) {
  const getOrderById = useOrderStore((s) => s.getOrderById);
  const order = getOrderById(orderId);
  const { currencySymbol } = siteConfig;

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-fw-500">
        <main className="flex-1 flex items-center justify-center py-16 px-5">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <PackageX className="size-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-ag-100 mb-3">Order Not Found</h2>
            <p className="text-ag-300 font-body text-sm md:text-base mb-8 leading-relaxed">
              We couldn&apos;t find an order with this ID. It may have expired or the link is
              incorrect.
            </p>
            <Link href="/">
              <Button className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-base px-8 h-12 transition-colors">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusInfo = orderStatusConfig[order.status];
  const paymentLabel = paymentMethods.find((m) => m.id === order.paymentMethod)?.label ?? order.paymentMethod;
  const countryName = countries.find((c) => c.code === order.shippingAddress.country)?.name ?? order.shippingAddress.country;
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-5 md:px-8 lg:px-12 py-10 md:py-16 lg:py-20">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Orders', href: '/account' },
              { label: `Order ${order.id}` },
            ]}
          />

          {/* Success Banner */}
          <div className="text-center mb-12 mt-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="size-12 text-green-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-ag-100 mb-3">
              Order Confirmed!
            </h1>
            <p className="text-ag-300 font-body text-sm md:text-base leading-relaxed">
              Thank you for your purchase. We&apos;ll send you a confirmation email shortly.
            </p>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-8 border-b border-ag-500/20">
              <div>
                <p className="text-xs font-body text-ag-400 uppercase tracking-wider">Order ID</p>
                <p className="font-heading font-bold text-xl text-ag-100 mt-1">{order.id}</p>
              </div>
              <div>
                <p className="text-xs font-body text-ag-400 uppercase tracking-wider">Date</p>
                <p className="font-body text-sm text-ag-200 mt-1">{orderDate}</p>
              </div>
              <div>
                <p className="text-xs font-body text-ag-400 uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <Badge className={`text-xs font-body font-medium rounded-full px-3 py-1 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <h3 className="font-heading font-bold text-lg text-ag-100 mb-5">Items Ordered</h3>
            <div className="space-y-4 mb-8 pb-8 border-b border-ag-500/20">
              {order.items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-ag-800/30 shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-ag-100 font-medium truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs font-body text-ag-400 mt-0.5">
                      {currencySymbol}{item.priceAtPurchase.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-heading font-semibold text-sm text-ag-100 shrink-0">
                    {currencySymbol}{(item.priceAtPurchase * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Shipping & Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 pb-8 border-b border-ag-500/20">
              <div>
                <h3 className="font-heading font-bold text-lg text-ag-100 mb-3">
                  Shipping Address
                </h3>
                <div className="text-sm font-body text-ag-200 space-y-1">
                  <p className="font-medium text-ag-100">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </p>
                  <p>{order.shippingAddress.street}</p>
                  {order.shippingAddress.apartment && <p>{order.shippingAddress.apartment}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                  <p>{countryName}</p>
                </div>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-ag-100 mb-3">
                  Payment Method
                </h3>
                <p className="text-sm font-body text-ag-200">{paymentLabel}</p>
              </div>
            </div>

            {/* Total */}
            <div className="space-y-3 text-sm font-body">
              <div className="flex justify-between text-ag-200">
                <span>Subtotal</span>
                <span>{currencySymbol}{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ag-200">
                <span>Shipping</span>
                <span className={order.shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {order.shipping === 0 ? 'Free' : `${currencySymbol}${order.shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-ag-200">
                <span>Tax</span>
                <span>{currencySymbol}{order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-ag-500/20">
                <span className="font-heading font-bold text-xl text-ag-100">Total</span>
                <span className="font-heading font-bold text-xl text-ag-100">
                  {currencySymbol}{order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-sm px-8 h-12 transition-colors">
                Continue Shopping
              </Button>
            </Link>
            <Link href="/account">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-ag-500/40 text-ag-200 hover:bg-ag-800/30 rounded-xl font-heading font-medium text-sm px-8 h-12"
              >
                View All Orders
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}