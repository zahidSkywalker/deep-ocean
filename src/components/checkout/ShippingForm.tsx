'use client';

import { type UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countries, usStates } from '@/data';
import type { AddressFormValues } from '@/types';

interface ShippingFormProps {
  form: UseFormReturn<AddressFormValues>;
}

export default function ShippingForm({ form: { register, formState: { errors }, setValue, watch } }: ShippingFormProps) {
  const watchedCountry = watch('country');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="font-body text-sm text-ag-200">
            First Name *
          </Label>
          <Input
            id="firstName"
            placeholder="John"
            {...register('firstName')}
            className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm font-body mt-1">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="font-body text-sm text-ag-200">
            Last Name *
          </Label>
          <Input
            id="lastName"
            placeholder="Doe"
            {...register('lastName')}
            className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm font-body mt-1">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="street" className="font-body text-sm text-ag-200">
          Street Address *
        </Label>
        <Input
          id="street"
          placeholder="123 Main Street"
          {...register('street')}
          className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
        />
        {errors.street && (
          <p className="text-red-500 text-sm font-body mt-1">{errors.street.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="apartment" className="font-body text-sm text-ag-200">
          Apartment, suite, etc. <span className="text-ag-400">(optional)</span>
        </Label>
        <Input
          id="apartment"
          placeholder="Apt 4B"
          {...register('apartment')}
          className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city" className="font-body text-sm text-ag-200">
            City *
          </Label>
          <Input
            id="city"
            placeholder="New York"
            {...register('city')}
            className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
          />
          {errors.city && (
            <p className="text-red-500 text-sm font-body mt-1">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm text-ag-200">State / Province *</Label>
          {watchedCountry === 'US' ? (
            <Select onValueChange={(val) => setValue('state', val)} defaultValue="NY">
              <SelectTrigger className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus:ring-fw-300/30 focus:border-fw-300">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {usStates.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="State / Province"
              {...register('state')}
              className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
            />
          )}
          {errors.state && (
            <p className="text-red-500 text-sm font-body mt-1">{errors.state.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zipCode" className="font-body text-sm text-ag-200">
            ZIP / Postal Code *
          </Label>
          <Input
            id="zipCode"
            placeholder="10001"
            {...register('zipCode')}
            className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
          />
          {errors.zipCode && (
            <p className="text-red-500 text-sm font-body mt-1">{errors.zipCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm text-ag-200">Country *</Label>
          <Select defaultValue="US" onValueChange={(val) => setValue('country', val)}>
            <SelectTrigger className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus:ring-fw-300/30 focus:border-fw-300">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.country && (
            <p className="text-red-500 text-sm font-body mt-1">{errors.country.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="font-body text-sm text-ag-200">
          Phone Number *
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          {...register('phone')}
          className="h-12 rounded-xl border-ag-500/40 bg-white font-body text-sm focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
        />
        {errors.phone && (
          <p className="text-red-500 text-sm font-body mt-1">{errors.phone.message}</p>
        )}
      </div>
    </div>
  );
}