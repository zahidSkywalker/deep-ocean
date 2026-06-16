'use client';

import { useState, useMemo } from 'react';
import { Search, Star, MapPin, Package, ShoppingBag, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { vendors } from '@/data/vendors';
import { useAdminStore } from '@/store/useAdminStore';
import type { Vendor } from '@/types';
import { toast } from 'sonner';

type VerificationFilter = 'all' | 'verified' | 'pending' | 'unverified';

const verificationBadge: Record<string, string> = {
  verified: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  unverified: 'bg-red-100 text-red-700',
};

export default function AdminVendorsPage() {
  const updateVendorStatus = useAdminStore((s) => s.updateVendorStatus);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        !search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = verificationFilter === 'all' || v.verificationStatus === verificationFilter;
      return matchesSearch && matchesFilter;
    });
  }, [search, verificationFilter]);

  const handleApprove = (vendor: Vendor) => {
    updateVendorStatus(vendor.id, 'verified');
    toast.success(`${vendor.name} has been approved`);
  };

  const handleSuspend = (vendor: Vendor) => {
    updateVendorStatus(vendor.id, 'unverified');
    toast.success(`${vendor.name} has been suspended`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">Vendor Management</h2>
        <p className="text-sm text-ag-300 font-body mt-1">
          {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} on the platform
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 md:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-400 pointer-events-none" />
            <Input
              placeholder="Search vendors by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-body"
            />
          </div>
          <Select value={verificationFilter} onValueChange={(val) => setVerificationFilter(val as VerificationFilter)}>
            <SelectTrigger className="w-full sm:w-44 font-body">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vendor List */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <p className="text-lg font-medium text-ag-200 font-body">No vendors found</p>
          <p className="text-sm text-ag-300 font-body mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ag-500/20 bg-ag-800/20">
                    <th className="text-left py-3 px-4 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Vendor</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Tag</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Location</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Products</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Rating</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Sales</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Joined</th>
                    <th className="text-right py-3 px-4 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ag-500/10">
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-ag-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={vendor.logo} alt={vendor.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-ag-100 font-body truncate max-w-[180px]">{vendor.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className="text-xs bg-fw-300/10 text-fw-300">{vendor.tag}</Badge>
                      </td>
                      <td className="py-3 px-3 text-ag-200 font-body text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {vendor.location}
                      </td>
                      <td className="py-3 px-3 text-ag-100 font-body text-xs">{vendor.productCount}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-fw-300 fill-fw-300" />
                          <span className="text-ag-100 font-body text-xs">{vendor.rating}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-ag-100 font-heading text-xs">${vendor.totalSales.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className={`text-xs capitalize ${verificationBadge[vendor.verificationStatus]}`}>
                          {vendor.verificationStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-ag-300 font-body text-xs">{vendor.joinDate}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-ag-300 hover:text-ag-100 hover:bg-ag-800/50" onClick={() => setSelectedVendor(vendor)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {vendor.verificationStatus !== 'verified' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-ag-300 hover:text-green-600 hover:bg-green-50" onClick={() => handleApprove(vendor)}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {vendor.verificationStatus !== 'unverified' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-ag-300 hover:text-red-500 hover:bg-red-50" onClick={() => handleSuspend(vendor)}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid gap-3">
            {filteredVendors.map((vendor) => (
              <div key={vendor.id} className="bg-white rounded-2xl shadow-soft p-4">
                <div className="flex items-start gap-3">
                  <img src={vendor.logo} alt={vendor.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ag-100 font-body text-sm truncate">{vendor.name}</p>
                      <Badge variant="secondary" className={`text-[10px] capitalize shrink-0 ${verificationBadge[vendor.verificationStatus]}`}>
                        {vendor.verificationStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-ag-300 font-body">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {vendor.location}
                      </span>
                      <Badge variant="secondary" className="text-[10px] bg-fw-300/10 text-fw-300">{vendor.tag}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-ag-300 font-body">
                      <span className="flex items-center gap-0.5">
                        <Package className="w-3 h-3" />
                        {vendor.productCount} products
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-fw-300 fill-fw-300" />
                        {vendor.rating}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <ShoppingBag className="w-3 h-3" />
                        ${vendor.totalSales.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-ag-500/10">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-ag-300 hover:text-ag-100 font-heading" onClick={() => setSelectedVendor(vendor)}>
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View
                  </Button>
                  {vendor.verificationStatus !== 'verified' && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-green-600 hover:bg-green-50 font-heading" onClick={() => handleApprove(vendor)}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                  )}
                  {vendor.verificationStatus !== 'unverified' && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:bg-red-50 font-heading" onClick={() => handleSuspend(vendor)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Vendor Detail Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-ag-100">{selectedVendor?.name}</DialogTitle>
            <DialogDescription className="font-body">Vendor details and information</DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <div className="space-y-4 font-body">
              {/* Header with logo */}
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedVendor.logo} alt={selectedVendor.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-fw-300/10 text-fw-300">{selectedVendor.tag}</Badge>
                    <Badge variant="secondary" className={`text-xs capitalize ${verificationBadge[selectedVendor.verificationStatus]}`}>
                      {selectedVendor.verificationStatus}
                    </Badge>
                  </div>
                  <p className="text-sm text-ag-300 mt-1">{selectedVendor.description}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Location</p>
                  <p className="text-ag-100 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-ag-300" />
                    {selectedVendor.location}
                  </p>
                </div>
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Joined</p>
                  <p className="text-ag-100 font-medium">{selectedVendor.joinDate}</p>
                </div>
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Products</p>
                  <p className="text-ag-100 font-medium">{selectedVendor.productCount} listed</p>
                </div>
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-fw-300 fill-fw-300" />
                    <span className="text-ag-100 font-semibold">{selectedVendor.rating}</span>
                  </div>
                </div>
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Total Sales</p>
                  <p className="text-ag-100 font-semibold font-heading">${selectedVendor.totalSales.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Slug</p>
                  <p className="text-ag-100 font-medium text-xs">{selectedVendor.slug}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}