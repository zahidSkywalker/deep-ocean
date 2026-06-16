'use client';

import { useState } from 'react';
import { Save, Globe, MapPin, Truck, Percent, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminStore } from '@/store/useAdminStore';
import type { PlatformSettings } from '@/data/admin-dashboard';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const settings = useAdminStore((s) => s.settings);
  const updateSettings = useAdminStore((s) => s.updateSettings);
  const [local, setLocal] = useState<PlatformSettings>({ ...settings });

  const handleChange = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const handleSocialChange = (key: string, value: string) => {
    setLocal((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
  };

  const handleSave = () => {
    updateSettings(local);
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-ag-100">Platform Settings</h2>
          <p className="text-sm text-ag-300 font-body mt-1">
            Configure your marketplace settings and preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-ag-100 hover:bg-ag-200 text-white font-heading gap-2 self-start"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>

      {/* General */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-5 h-5 text-ag-200" />
          <h3 className="font-heading font-semibold text-ag-100">General</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body">
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Site Name</label>
            <Input
              value={local.siteName}
              onChange={(e) => handleChange('siteName', e.target.value)}
              className="font-body"
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Tagline</label>
            <Input
              value={local.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="font-body"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea
              value={local.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="flex w-full rounded-lg border border-ag-500/30 bg-white px-3 py-2 text-sm font-body text-ag-100 placeholder:text-ag-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fw-300 focus-visible:ring-offset-1 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Contact Email</label>
            <Input
              value={local.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className="font-body"
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Support Phone</label>
            <Input
              value={local.supportPhone}
              onChange={(e) => handleChange('supportPhone', e.target.value)}
              className="font-body"
            />
          </div>
        </div>
      </div>

      {/* Regional */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <MapPin className="w-5 h-5 text-ag-200" />
          <h3 className="font-heading font-semibold text-ag-100">Regional</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body">
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Currency</label>
            <Select value={local.currency} onValueChange={(val) => handleChange('currency', val)}>
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Currency Symbol</label>
            <Input
              value={local.currencySymbol}
              onChange={(e) => handleChange('currencySymbol', e.target.value)}
              className="font-body w-24"
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Tax Rate (%)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={local.taxRate}
              onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
              className="font-body w-32"
            />
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Truck className="w-5 h-5 text-ag-200" />
          <h3 className="font-heading font-semibold text-ag-100">Shipping</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-body">
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Free Shipping Threshold ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={local.freeShippingThreshold}
              onChange={(e) => handleChange('freeShippingThreshold', parseFloat(e.target.value) || 0)}
              className="font-body"
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Standard Shipping ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={local.standardShippingCost}
              onChange={(e) => handleChange('standardShippingCost', parseFloat(e.target.value) || 0)}
              className="font-body"
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Express Shipping ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={local.expressShippingCost}
              onChange={(e) => handleChange('expressShippingCost', parseFloat(e.target.value) || 0)}
              className="font-body"
            />
          </div>
        </div>
      </div>

      {/* Commission */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Percent className="w-5 h-5 text-ag-200" />
          <h3 className="font-heading font-semibold text-ag-100">Commission</h3>
        </div>
        <div className="font-body">
          <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Vendor Commission Rate (%)</label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={local.vendorCommissionRate}
            onChange={(e) => handleChange('vendorCommissionRate', parseFloat(e.target.value) || 0)}
            className="font-body w-32"
          />
          <p className="text-xs text-ag-400 mt-1">The percentage taken from each vendor sale as platform commission.</p>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-5 h-5 text-ag-200" />
          <h3 className="font-heading font-semibold text-ag-100">Feature Toggles</h3>
        </div>
        <div className="space-y-4">
          {[
            { key: 'enableVendorRegistration' as const, label: 'Vendor Registration', desc: 'Allow new vendors to sign up on the platform' },
            { key: 'requireVendorVerification' as const, label: 'Require Vendor Verification', desc: 'New vendors must be verified before selling' },
            { key: 'enableReviews' as const, label: 'Product Reviews', desc: 'Allow customers to leave reviews on products' },
            { key: 'enableWishlist' as const, label: 'Wishlist', desc: 'Enable the wishlist feature for customers' },
            { key: 'maintenanceMode' as const, label: 'Maintenance Mode', desc: 'Temporarily disable the storefront for all users' },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-ag-100 font-body">{toggle.label}</p>
                <p className="text-xs text-ag-300 font-body mt-0.5">{toggle.desc}</p>
              </div>
              <Switch
                checked={local[toggle.key]}
                onCheckedChange={(checked) => handleChange(toggle.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-5 h-5 text-ag-200" />
          <h3 className="font-heading font-semibold text-ag-100">Social Links</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body">
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Facebook className="w-3.5 h-3.5" /> Facebook
            </label>
            <Input
              value={local.socialLinks.facebook}
              onChange={(e) => handleSocialChange('facebook', e.target.value)}
              className="font-body"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Twitter className="w-3.5 h-3.5" /> Twitter
            </label>
            <Input
              value={local.socialLinks.twitter}
              onChange={(e) => handleSocialChange('twitter', e.target.value)}
              className="font-body"
              placeholder="https://twitter.com/..."
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </label>
            <Input
              value={local.socialLinks.instagram}
              onChange={(e) => handleSocialChange('instagram', e.target.value)}
              className="font-body"
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5" /> YouTube
            </label>
            <Input
              value={local.socialLinks.youtube}
              onChange={(e) => handleSocialChange('youtube', e.target.value)}
              className="font-body"
              placeholder="https://youtube.com/..."
            />
          </div>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end pb-4">
        <Button
          onClick={handleSave}
          className="bg-ag-100 hover:bg-ag-200 text-white font-heading gap-2"
          size="lg"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}