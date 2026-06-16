'use client';

import { useState, useMemo } from 'react';
import { Search, Package, CreditCard } from 'lucide-react';
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
import { useAdminStore, type PlatformOrder } from '@/store/useAdminStore';
import { orderStatusConfig, paymentMethods } from '@/data/checkout';
import type { OrderStatus } from '@/types';
import { toast } from 'sonner';

type OrderTab = 'all' | OrderStatus;

const tabs: { label: string; value: OrderTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function AdminOrdersPage() {
  const platformOrders = useAdminStore((s) => s.platformOrders);
  const updatePlatformOrderStatus = useAdminStore((s) => s.updatePlatformOrderStatus);
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PlatformOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return platformOrders.filter((o) => {
      const matchesTab = activeTab === 'all' || o.status === activeTab;
      const matchesSearch =
        !search ||
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [platformOrders, activeTab, search]);

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updatePlatformOrderStatus(orderId, status);
    toast.success(`Order ${orderId} updated to ${orderStatusConfig[status].label}`);
  };

  const getPayMethodLabel = (id: string) => {
    return paymentMethods.find((m) => m.id === id)?.label ?? id;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">Order Management</h2>
        <p className="text-sm text-ag-300 font-body mt-1">
          {platformOrders.length} total order{platformOrders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search + Tabs */}
      <div className="bg-white rounded-2xl shadow-soft p-4 md:p-5">
        <div className="flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-400 pointer-events-none" />
            <Input
              placeholder="Search by order ID or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-body"
            />
          </div>
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
                {platformOrders.filter((o) => o.status === tab.value).length}
              </Badge>
            )}
          </Button>
        ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <p className="text-lg font-medium text-ag-200 font-body">No orders found</p>
          <p className="text-sm text-ag-300 font-body mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-soft p-4 md:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ag-500/20">
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Vendor</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden lg:table-cell">Items</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Total</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden lg:table-cell">Payment</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ag-500/10">
                  {filteredOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-ag-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="font-heading font-medium text-ag-100 text-xs hover:text-fw-300 transition-colors"
                        >
                          {order.orderId}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div>
                          <p className="text-ag-100 font-body text-xs font-medium">{order.customerName}</p>
                          <p className="text-ag-300 text-xs hidden xl:block">{order.customerEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-ag-200 font-body text-xs">{order.vendorName}</td>
                      <td className="py-3 px-3 text-ag-200 font-body text-xs hidden lg:table-cell">{order.items.length}</td>
                      <td className="py-3 px-3 font-heading font-semibold text-ag-100 text-xs">${order.total.toFixed(2)}</td>
                      <td className="py-3 px-3 text-ag-200 font-body text-xs hidden lg:table-cell">{getPayMethodLabel(order.paymentMethod)}</td>
                      <td className="py-3 px-3">
                        <Select
                          value={order.status}
                          onValueChange={(val) => handleStatusChange(order.orderId, val as OrderStatus)}
                        >
                          <SelectTrigger className={`h-7 w-auto min-w-[100px] text-xs border-0 p-0 pr-6 ${orderStatusConfig[order.status].color} font-heading font-medium`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(orderStatusConfig).map(([key, cfg]) => (
                              <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-3 text-ag-300 font-body text-xs">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid gap-3">
            {filteredOrders.map((order) => (
              <div key={order.orderId} className="bg-white rounded-2xl shadow-soft p-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="font-heading font-semibold text-ag-100 text-sm hover:text-fw-300 transition-colors"
                  >
                    {order.orderId}
                  </button>
                  <Select
                    value={order.status}
                    onValueChange={(val) => handleStatusChange(order.orderId, val as OrderStatus)}
                  >
                    <SelectTrigger className={`h-7 w-auto min-w-[90px] text-[11px] border-0 p-0 pr-6 ${orderStatusConfig[order.status].color} font-heading font-medium`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(orderStatusConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-ag-100 font-body font-medium">{order.customerName}</p>
                <p className="text-xs text-ag-300 font-body mt-0.5">{order.vendorName} &middot; {order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ag-500/10">
                  <span className="text-xs text-ag-300 font-body">{order.date}</span>
                  <span className="font-heading font-semibold text-ag-100 text-sm">${order.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-ag-100">
              Order {selectedOrder?.orderId}
            </DialogTitle>
            <DialogDescription className="font-body">
              Full order details and item breakdown
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

              {/* Customer & Vendor */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Customer</p>
                  <p className="text-ag-100 font-medium">{selectedOrder.customerName}</p>
                  <p className="text-ag-300 text-xs">{selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <p className="text-ag-300 text-xs uppercase font-heading tracking-wider mb-1">Vendor</p>
                  <p className="text-ag-100 font-medium">{selectedOrder.vendorName}</p>
                  <p className="text-ag-300 text-xs">Vendor ID: {selectedOrder.vendorId}</p>
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
                        <span className="text-ag-300">&times;{item.quantity}</span>
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
                Placed on {new Date(selectedOrder.date).toLocaleDateString('en-US', {
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