'use client';

import { useState, useMemo } from 'react';
import { Search, Package, MapPin, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { OrdersTable, type VendorOrderRow } from '@/components/vendor/OrdersTable';
import { useVendorStore, type VendorOrder } from '@/store/useVendorStore';
import { orderStatusConfig, paymentMethods } from '@/data/checkout';
import type { OrderStatus } from '@/types';
import { toast } from 'sonner';

type OrderTab = 'all' | OrderStatus;

const tabs: { label: string; value: OrderTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function VendorOrdersPage() {
  const vendorOrders = useVendorStore((s) => s.vendorOrders);
  const updateOrderStatus = useVendorStore((s) => s.updateOrderStatus);
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return vendorOrders.filter((o) => {
      const matchesTab = activeTab === 'all' || o.status === activeTab;
      const matchesSearch =
        !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [vendorOrders, activeTab, search]);

  const orderRows: VendorOrderRow[] = filteredOrders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    amount: o.total,
    status: o.status,
    date: o.createdAt,
    itemCount: o.items.length,
    items: o.items,
  }));

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    toast.success(`Order ${orderId} updated to ${orderStatusConfig[status].label}`);
  };

  const handleViewDetails = (row: VendorOrderRow) => {
    const fullOrder = vendorOrders.find((o) => o.id === row.id) ?? null;
    setSelectedOrder(fullOrder);
  };

  const getPayMethodLabel = (id: string) => {
    return paymentMethods.find((m) => m.id === id)?.label ?? id;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">Orders</h2>
        <p className="text-sm text-ag-300 font-body mt-1">
          {vendorOrders.length} total order{vendorOrders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? 'default' : 'outline'}
            className={
              activeTab === tab.value
                ? 'bg-ag-100 hover:bg-ag-200 text-white font-heading'
                : 'border-ag-500/30 text-ag-200 hover:bg-ag-800/50 font-heading'
            }
            size="sm"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 px-1.5 text-[10px] bg-white/20 text-inherit"
              >
                {vendorOrders.filter((o) => o.status === tab.value).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-400 pointer-events-none" />
        <Input
          placeholder="Search by order ID or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 font-body"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-soft p-4 md:p-6">
        <OrdersTable
          orders={orderRows}
          onStatusChange={handleStatusChange}
          onViewDetails={handleViewDetails}
          showStatusChange
        />
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-ag-100">
              Order {selectedOrder?.id}
            </DialogTitle>
            <DialogDescription className="font-body">
              Order details and item breakdown
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 font-body">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-ag-300">Status:</span>
                <Badge variant="secondary" className={orderStatusConfig[selectedOrder.status].color}>
                  {orderStatusConfig[selectedOrder.status].label}
                </Badge>
              </div>

              <Separator />

              {/* Customer */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Customer</p>
                  <p className="text-ag-100 font-medium">{selectedOrder.customerName}</p>
                  <p className="text-ag-300 text-xs">{selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Shipping</p>
                  <div className="flex items-start gap-1.5 text-ag-200">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      {selectedOrder.shippingAddress.street}<br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-ag-300 shrink-0" />
                        <span className="text-ag-100">{item.productName}</span>
                        <span className="text-ag-300">×{item.quantity}</span>
                      </div>
                      <span className="text-ag-100 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Payment & Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-ag-300">
                  <CreditCard className="w-4 h-4" />
                  <span>{getPayMethodLabel(selectedOrder.paymentMethod)}</span>
                </div>
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between">
                    <span className="text-ag-300">Subtotal</span>
                    <span className="text-ag-100">${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ag-300">Shipping</span>
                    <span className="text-ag-100">${selectedOrder.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ag-300">Tax</span>
                    <span className="text-ag-100">${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-heading font-semibold text-ag-100">
                    <span>Total</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Date */}
              <p className="text-xs text-ag-300 pt-1">
                Placed on {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}