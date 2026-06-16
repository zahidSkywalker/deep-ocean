'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, ChevronDown } from 'lucide-react';
import { orderStatusConfig } from '@/data/checkout';
import type { OrderStatus } from '@/types';

export interface VendorOrderRow {
  id: string;
  customerName: string;
  amount: number;
  status: OrderStatus;
  date: string;
  itemCount: number;
  items?: { productName: string; quantity: number; price: number }[];
}

interface OrdersTableProps {
  orders: VendorOrderRow[];
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  onViewDetails?: (order: VendorOrderRow) => void;
  showStatusChange?: boolean;
}

export function OrdersTable({
  orders,
  onStatusChange,
  onViewDetails,
  showStatusChange = false,
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-ag-300 font-body">
        <p className="text-lg font-medium">No orders found</p>
        <p className="text-sm mt-1">Orders will appear here when customers make purchases</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ag-500/20">
            <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Order ID</th>
            <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden sm:table-cell">Customer</th>
            <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden md:table-cell">Items</th>
            <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Total</th>
            <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
            <th className="text-right py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ag-500/10">
          {orders.map((order) => {
            const statusCfg = orderStatusConfig[order.status];
            return (
              <tr key={order.id} className="hover:bg-ag-800/30 transition-colors">
                <td className="py-3 px-3 font-medium font-heading text-ag-100">{order.id}</td>
                <td className="py-3 px-3 text-ag-200 font-body hidden sm:table-cell">
                  <div>
                    <p className="font-medium text-ag-100">{order.customerName}</p>
                  </div>
                </td>
                <td className="py-3 px-3 text-ag-200 font-body hidden md:table-cell">
                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                </td>
                <td className="py-3 px-3 font-medium text-ag-100 font-heading">
                  ${order.amount.toFixed(2)}
                </td>
                <td className="py-3 px-3">
                  {showStatusChange ? (
                    <Select
                      value={order.status}
                      onValueChange={(val) => onStatusChange?.(order.id, val as OrderStatus)}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(orderStatusConfig).map(([key, cfg]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className={`text-xs ${statusCfg.color}`}>
                      {statusCfg.label}
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-3 text-ag-300 font-body text-xs hidden lg:table-cell">
                  {new Date(order.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="py-3 px-3 text-right">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(order)}
                      className="text-ag-300 hover:text-ag-100 hover:bg-ag-800/50 h-8"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}