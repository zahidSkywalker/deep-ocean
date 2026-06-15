'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ArrowLeft, Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore, getSubtotal, getTotalItems } from '@/store/useCartStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { checkoutSteps, siteConfig, shippingConfig, countries, usStates } from '@/data';
import ShippingForm from '@/components/checkout/ShippingForm';
import PaymentForm from '@/components/checkout/PaymentForm';
import ReviewOrder from '@/components/checkout/ReviewOrder';
import OrderSummary from '@/components/checkout/OrderSummary';
import Breadcrumb from '@/components/shared/Breadcrumb';
import type { Address, AddressFormValues, PaymentMethod } from '@/types';

const addressSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  street: z.string().min(1, 'Street address is required'),
  apartment: z.string(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone number is required'),
});

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const addOrder = useOrderStore((s) => s.addOrder);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const [currentStep, setCurrentStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit-card');
  const [isPlacing, setIsPlacing] = useState(false);

  const shippingForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      street: '',
      apartment: '',
      city: '',
      state: 'NY',
      zipCode: '',
      country: 'US',
      phone: user?.phone ?? '',
    },
  });

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-fw-500">
        <main className="flex-1 flex items-center justify-center py-16 px-5">
          <div className="text-center">
            <div className="w-24 h-24 bg-ag-800/30 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingCart className="size-10 text-ag-400" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-ag-100 mb-3">Your cart is empty</h2>
            <p className="text-ag-300 font-body text-sm md:text-base mb-8">Add some items before checking out.</p>
            <Link href="/">
              <Button className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-base px-8 h-12 transition-colors">
                Start Shopping
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const handleShippingSubmit = (data: AddressFormValues) => {
    const stateName = usStates.find((s) => s.code === data.state)?.name ?? data.state;
    const countryName = countries.find((c) => c.code === data.country)?.name ?? data.country;

    const address: Address = {
      id: `addr-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      apartment: data.apartment || undefined,
      city: data.city,
      state: stateName,
      zipCode: data.zipCode,
      country: data.country,
      phone: data.phone,
      isDefault: true,
    };
    setShippingAddress(address);
    setCurrentStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress) return;
    setIsPlacing(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const subtotal = getSubtotal(items);
    const shipping = subtotal >= siteConfig.freeShippingThreshold ? 0 : shippingConfig.standardShipping;
    const tax = subtotal * shippingConfig.taxRate;
    const total = subtotal + shipping + tax;

    const order = {
      id: `ORD-${Date.now()}`,
      items: items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        priceAtPurchase: item.product.price,
      })),
      shippingAddress,
      paymentMethod,
      subtotal,
      shipping,
      tax,
      total,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    addOrder(order);
    clearCart();
    router.push(`/order/${order.id}`);
  };

  const totalItems = getTotalItems(items);

  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-10 md:py-16 lg:py-20">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Cart', href: '/cart' },
              { label: 'Checkout' },
            ]}
          />

          <h1 className="text-3xl md:text-4xl font-heading font-bold text-ag-100 mb-10 mt-6">
            Checkout
          </h1>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-12">
            {checkoutSteps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-heading font-bold transition-colors ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-ag-100 text-white'
                          : 'bg-ag-800/30 text-ag-300'
                      }`}
                    >
                      {isCompleted ? <Check className="size-4" /> : step.id}
                    </div>
                    <span
                      className={`text-sm font-body hidden sm:inline ${
                        isActive ? 'text-ag-100 font-medium' : 'text-ag-300'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < checkoutSteps.length - 1 && (
                    <div
                      className={`w-12 sm:w-20 h-0.5 mx-3 sm:mx-4 rounded-full transition-colors ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-ag-500/30'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Shipping */}
              {currentStep === 1 && (
                <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8">
                  <h2 className="font-heading font-bold text-xl text-ag-100 mb-8">
                    Shipping Information
                  </h2>
                  <form onSubmit={shippingForm.handleSubmit(handleShippingSubmit)}>
                    <ShippingForm form={shippingForm} />
                    <div className="mt-8 flex justify-end">
                      <Button
                        type="submit"
                        className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-sm px-8 h-12 transition-colors"
                      >
                        Continue to Payment
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 2 && (
                <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8">
                  <h2 className="font-heading font-bold text-xl text-ag-100 mb-8">
                    Payment Method
                  </h2>
                  <PaymentForm value={paymentMethod} onChange={setPaymentMethod} />
                  <div className="mt-8 flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="border-ag-500/40 text-ag-200 hover:bg-ag-800/30 rounded-xl font-heading font-medium text-sm gap-2 h-12"
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-sm px-8 h-12 transition-colors"
                    >
                      Review Order
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && shippingAddress && (
                <div>
                  <ReviewOrder
                    items={items}
                    shippingAddress={shippingAddress}
                    paymentMethod={paymentMethod}
                  />
                  <div className="mt-8 flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="border-ag-500/40 text-ag-200 hover:bg-ag-800/30 rounded-xl font-heading font-medium text-sm gap-2 h-12"
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={isPlacing}
                      className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-bold text-sm px-8 h-12 transition-colors"
                    >
                      {isPlacing ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Placing Order...
                        </>
                      ) : (
                        `Place Order (${siteConfig.currencySymbol}${(getSubtotal(items) + (getSubtotal(items) >= siteConfig.freeShippingThreshold ? 0 : shippingConfig.standardShipping) + getSubtotal(items) * shippingConfig.taxRate).toFixed(2)})`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28">
                <OrderSummary items={items} />
                <div className="mt-4 bg-white rounded-xl border border-ag-500/20 p-4 text-center">
                  <p className="text-xs font-body text-ag-400">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'} in your order
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}