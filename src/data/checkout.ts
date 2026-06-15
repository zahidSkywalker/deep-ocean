import type { OrderStatus, PaymentMethod } from '@/types';

export const paymentMethods: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}[] = [
  { id: 'credit-card', label: 'Credit Card', description: 'Visa, Mastercard, Amex', icon: 'CreditCard' },
  { id: 'debit-card', label: 'Debit Card', description: 'All major banks', icon: 'Landmark' },
  { id: 'paypal', label: 'PayPal', description: 'Pay with your PayPal account', icon: 'Wallet' },
  { id: 'cod', label: 'Cash on Delivery', description: 'Pay when you receive', icon: 'Banknote' },
];

export const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NZ', name: 'New Zealand' },
];

export const usStates = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export const shippingConfig = {
  standardShipping: 5.99,
  freeShippingThreshold: 75,
  expressShipping: 14.99,
  taxRate: 0.08,
};

export const orderStatusConfig: Record<
  OrderStatus,
  { label: string; color: string; description: string }
> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', description: 'Your order is waiting to be confirmed' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', description: 'Your order has been confirmed' },
  processing: { label: 'Processing', color: 'bg-indigo-100 text-indigo-800', description: 'Your order is being prepared' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', description: 'Your order is on its way' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', description: 'Your order has been delivered' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', description: 'Your order has been cancelled' },
};

export const checkoutSteps = [
  { id: 1, label: 'Shipping' },
  { id: 2, label: 'Payment' },
  { id: 3, label: 'Review' },
];