'use client';

import { useState } from 'react';
import { CreditCard, Landmark, Wallet, Banknote, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { paymentMethods } from '@/data';
import type { PaymentMethod } from '@/types';

const iconMap: Record<string, LucideIcon> = {
  CreditCard,
  Landmark,
  Wallet,
  Banknote,
};

interface PaymentFormProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

export default function PaymentForm({ value, onChange }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCardNumber = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length > 2) return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    return cleaned;
  };

  const showCardFields = value === 'credit-card' || value === 'debit-card';

  return (
    <div className="space-y-6">
      <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {paymentMethods.map((method) => {
          const Icon = iconMap[method.icon] || CreditCard;
          const isSelected = value === method.id;
          return (
            <label
              key={method.id}
              htmlFor={`payment-${method.id}`}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-ag-100 bg-ag-100/5 shadow-soft'
                  : 'border-ag-500/20 hover:border-ag-500/40 bg-white'
              }`}
            >
              <RadioGroupItem value={method.id} id={`payment-${method.id}`} className="sr-only" />
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-ag-100 text-white' : 'bg-ag-800/30 text-ag-300'
                }`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p
                  className={`font-heading font-semibold text-sm ${
                    isSelected ? 'text-ag-100' : 'text-ag-200'
                  }`}
                >
                  {method.label}
                </p>
                <p className="text-xs font-body text-ag-400 truncate">{method.description}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      {showCardFields && (
        <div className="bg-white rounded-xl border border-ag-500/20 p-4 space-y-4">
          <h4 className="font-heading font-semibold text-sm text-ag-200">Card Details</h4>
          <div className="space-y-2">
            <Label htmlFor="cardNumber" className="font-body text-sm text-ag-200">
              Card Number
            </Label>
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="h-11 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry" className="font-body text-sm text-ag-200">
                Expiry Date
              </Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="h-11 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv" className="font-body text-sm text-ag-200">
                CVV
              </Label>
              <Input
                id="cvv"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="h-11 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
              />
            </div>
          </div>
        </div>
      )}

      {value === 'paypal' && (
        <div className="bg-white rounded-xl border border-ag-500/20 p-4 text-center">
          <p className="text-sm font-body text-ag-300">
            You will be redirected to PayPal to complete your payment after placing the order.
          </p>
        </div>
      )}

      {value === 'cod' && (
        <div className="bg-white rounded-xl border border-ag-500/20 p-4 text-center">
          <p className="text-sm font-body text-ag-300">
            Pay with cash when your order is delivered to your doorstep.
          </p>
        </div>
      )}
    </div>
  );
}