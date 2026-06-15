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
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <PackageX className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl font-heading font-bold text-ag-100 mb-2">Order Not Found</h2>
            <p className="text-ag-300 font-body text-sm mb-6">
              We couldn&apos;t find an order with this ID. It may have expired or the link is
              incorrect.
            </p>
            <Link href="/">
              <Button className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-sm px-6 h-11 transition-colors">
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
        <div className="max-w-3xl mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-12">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Orders', href: '/account' },
              { label: `Order ${order.id}` },
            ]}
          />

          {/* Success Banner */}
          <div className="text-center mb-10 mt-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Check className="size-10 text-green-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-ag-100 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-ag-300 font-body">
              Thank you for your purchase. We&apos;ll send you a confirmation email shortly.
            </p>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-ag-500/20">
              <div>
                <p className="text-xs font-body text-ag-400 uppercase tracking-wider">Order ID</p>
                <p className="font-heading font-bold text-lg text-ag-100">{order.id}</p>
              </div>
              <div>
                <p className="text-xs font-body text-ag-400 uppercase tracking-wider">Date</p>
                <p className="font-body text-sm text-ag-200">{orderDate}</p>
              </div>
              <div>
                <p className="text-xs font-body text-ag-400 uppercase tracking-wider">Status</p>
                <Badge className={`text-xs font-body font-medium rounded-full px-3 py-1 ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>

            {/* Order Items */}
            <h3 className="font-heading font-bold text-base text-ag-100 mb-3">Items Ordered</h3>
            <div className="space-y-3 mb-6 pb-6 border-b border-ag-500/20">
              {order.items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-ag-800/30 shrink-0">
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
                    <p className="text-xs font-body text-ag-400">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 pb-6 border-b border-ag-500/20">
              <div>
                <h3 className="font-heading font-bold text-base text-ag-100 mb-2">
                  Shipping Address
                </h3>
                <div className="text-sm font-body text-ag-200 space-y-0.5">
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
                <h3 className="font-heading font-bold text-base text-ag-100 mb-2">
                  Payment Method
                </h3>
                <p className="text-sm font-body text-ag-200">{paymentLabel}</p>
              </div>
            </div>

            {/* Total */}
            <div className="space-y-2 text-sm font-body">
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
              <div className="flex justify-between pt-2 border-t border-ag-500/20">
                <span className="font-heading font-bold text-base text-ag-100">Total</span>
                <span className="font-heading font-bold text-base text-ag-100">
                  {currencySymbol}{order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-sm px-8 h-11 transition-colors">
                Continue Shopping
              </Button>
            </Link>
            <Link href="/account">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-ag-500/40 text-ag-200 hover:bg-ag-800/30 rounded-xl font-heading font-medium text-sm px-8 h-11"
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