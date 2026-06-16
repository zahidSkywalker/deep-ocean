'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useVendorStore, type VendorSettings } from '@/store/useVendorStore';
import { toast } from 'sonner';
import { Store, Mail, Phone, MapPin, Clock, Truck, RotateCcw, ImageIcon } from 'lucide-react';

const settingsSchema = z.object({
  storeName: z.string().min(2, 'Store name is required'),
  description: z.string().min(10, 'Description should be at least 10 characters'),
  logoUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  coverUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  contactEmail: z.string().email('Must be a valid email'),
  phone: z.string().min(5, 'Phone number is required'),
  location: z.string().min(2, 'Location is required'),
  businessHours: z.string().min(1, 'Business hours are required'),
  shippingPolicy: z.string().min(10, 'Shipping policy is required'),
  returnPolicy: z.string().min(10, 'Return policy is required'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function SettingsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-fw-300" />
        <h3 className="font-heading font-semibold text-lg text-ag-100">{title}</h3>
      </div>
      <Separator />
      {children}
    </div>
  );
}

export default function VendorSettingsPage() {
  const settings = useVendorStore((s) => s.settings);
  const updateSettings = useVendorStore((s) => s.updateSettings);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateSettings(data);
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">Settings</h2>
        <p className="text-sm text-ag-300 font-body mt-1">
          Manage your store information and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Store Information */}
        <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <SettingsSection icon={Store} title="Store Information">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName" className="font-heading text-sm text-ag-100">Store Name</Label>
                <Input id="storeName" className="font-body" {...register('storeName')} />
                {errors.storeName && <p className="text-xs text-red-500 font-body">{errors.storeName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="font-heading text-sm text-ag-100">Store Description</Label>
                <Textarea id="description" rows={3} className="font-body" {...register('description')} />
                {errors.description && <p className="text-xs text-red-500 font-body">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="font-heading text-sm text-ag-100 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-ag-300" /> Logo URL
                  </Label>
                  <Input id="logoUrl" placeholder="https://..." className="font-body" {...register('logoUrl')} />
                  {errors.logoUrl && <p className="text-xs text-red-500 font-body">{errors.logoUrl.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverUrl" className="font-heading text-sm text-ag-100 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-ag-300" /> Cover URL
                  </Label>
                  <Input id="coverUrl" placeholder="https://..." className="font-body" {...register('coverUrl')} />
                  {errors.coverUrl && <p className="text-xs text-red-500 font-body">{errors.coverUrl.message}</p>}
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <SettingsSection icon={Mail} title="Contact Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="font-heading text-sm text-ag-100 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-ag-300" /> Contact Email
                </Label>
                <Input id="contactEmail" type="email" className="font-body" {...register('contactEmail')} />
                {errors.contactEmail && <p className="text-xs text-red-500 font-body">{errors.contactEmail.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-heading text-sm text-ag-100 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-ag-300" /> Phone
                </Label>
                <Input id="phone" className="font-body" {...register('phone')} />
                {errors.phone && <p className="text-xs text-red-500 font-body">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="location" className="font-heading text-sm text-ag-100 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ag-300" /> Location
              </Label>
              <Input id="location" className="font-body" {...register('location')} />
              {errors.location && <p className="text-xs text-red-500 font-body">{errors.location.message}</p>}
            </div>
          </SettingsSection>
        </div>

        {/* Business Hours */}
        <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <SettingsSection icon={Clock} title="Business Hours">
            <div className="space-y-2">
              <Textarea
                id="businessHours"
                rows={4}
                className="font-body font-mono text-sm"
                {...register('businessHours')}
              />
              {errors.businessHours && <p className="text-xs text-red-500 font-body">{errors.businessHours.message}</p>}
            </div>
          </SettingsSection>
        </div>

        {/* Policies */}
        <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <SettingsSection icon={Truck} title="Shipping Policy">
            <div className="space-y-2">
              <Textarea
                id="shippingPolicy"
                rows={4}
                className="font-body"
                {...register('shippingPolicy')}
              />
              {errors.shippingPolicy && <p className="text-xs text-red-500 font-body">{errors.shippingPolicy.message}</p>}
            </div>
          </SettingsSection>

          <div className="mt-8">
            <SettingsSection icon={RotateCcw} title="Return Policy">
              <div className="space-y-2">
                <Textarea
                  id="returnPolicy"
                  rows={4}
                  className="font-body"
                  {...register('returnPolicy')}
                />
                {errors.returnPolicy && <p className="text-xs text-red-500 font-body">{errors.returnPolicy.message}</p>}
              </div>
            </SettingsSection>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-ag-100 hover:bg-ag-200 text-white font-heading px-8"
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}