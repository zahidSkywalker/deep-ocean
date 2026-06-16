'use client';

import {
  DollarSign,
  ShoppingBag,
  Package,
  Star,
  ShoppingBag as OrdersIcon,
  Star as ReviewIcon,
} from 'lucide-react';
import { StatsCard } from '@/components/vendor/StatsCard';
import { OrdersTable, type VendorOrderRow } from '@/components/vendor/OrdersTable';
import { vendorAnalytics } from '@/data/vendor-dashboard';
import { products } from '@/data/products';
import { useVendorStore } from '@/store/useVendorStore';
import { orderStatusConfig } from '@/data/checkout';
import { Badge } from '@/components/ui/badge';

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function VendorOverviewPage() {
  const currentVendor = useVendorStore((s) => s.currentVendor);
  const notifications = useVendorStore((s) => s.notifications);

  // Build recent orders for table
  const recentOrderRows: VendorOrderRow[] = vendorAnalytics.recentOrders.map((o) => ({
    id: o.orderId,
    customerName: o.customerName,
    amount: o.amount,
    status: o.status,
    date: o.date,
    itemCount: o.itemCount,
  }));

  // Build top products list with actual product names
  const topProductList = vendorAnalytics.topProducts.map((tp) => {
    const product = products.find((p) => p.id === tp.productId);
    return {
      name: product?.name ?? `Product #${tp.productId}`,
      image: product?.image ?? '',
      salesCount: tp.salesCount,
      revenue: tp.revenue,
    };
  });

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">
          Welcome back, {currentVendor?.name ?? 'Vendor'}!
        </h2>
        <p className="text-ag-300 font-body mt-1">
          Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatsCard
          icon={DollarSign}
          value={`$${vendorAnalytics.totalRevenue.toLocaleString()}`}
          label="Total Revenue"
          change={12.5}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          icon={ShoppingBag}
          value={vendorAnalytics.totalOrders.toString()}
          label="Total Orders"
          change={8.2}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          icon={Package}
          value={vendorAnalytics.totalProducts.toString()}
          label="Products Listed"
          change={4.0}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatsCard
          icon={Star}
          value={vendorAnalytics.averageRating.toString()}
          label="Average Rating"
          change={2.1}
          iconBgColor="bg-fw-300/15"
          iconColor="text-fw-300"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-heading font-semibold text-ag-100">Revenue Overview</h3>
            <p className="text-sm text-ag-300 font-body mt-0.5">Monthly revenue for the past year</p>
          </div>
          <span className="text-sm text-ag-200 font-body">
            <span className="font-semibold text-ag-100 font-heading">
              ${vendorAnalytics.totalRevenue.toLocaleString()}
            </span>{' '}
            total
          </span>
        </div>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendorAnalytics.monthlyRevenue} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce0d9" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#57604f', fontSize: 12, fontFamily: 'Nunito' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#57604f', fontSize: 12, fontFamily: 'Nunito' }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #dce0d9',
                  borderRadius: '12px',
                  fontFamily: 'Nunito',
                  fontSize: '13px',
                  boxShadow: '0 4px 16px rgba(43,48,39,0.08)',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar
                dataKey="revenue"
                fill="#d49e52"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Recent Orders + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <OrdersIcon className="w-5 h-5 text-ag-200" />
              <h3 className="font-heading font-semibold text-ag-100">Recent Orders</h3>
            </div>
            <Badge variant="outline" className="text-xs font-body text-ag-300 border-ag-500/30">
              {recentOrderRows.length} recent
            </Badge>
          </div>
          <OrdersTable orders={recentOrderRows.slice(0, 5)} />
        </div>

        {/* Top Products */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-ag-200" />
            <h3 className="font-heading font-semibold text-ag-100">Top Products</h3>
          </div>
          <div className="space-y-4">
            {topProductList.map((product, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-ag-800 flex items-center justify-center text-xs font-bold font-heading text-ag-200 shrink-0">
                  {idx + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ag-100 font-body truncate">{product.name}</p>
                  <p className="text-xs text-ag-300 font-body">{product.salesCount} sales</p>
                </div>
                <p className="text-sm font-semibold font-heading text-ag-100 shrink-0">
                  ${product.revenue.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ReviewIcon className="w-5 h-5 text-ag-200" />
            <h3 className="font-heading font-semibold text-ag-100">Recent Activity</h3>
          </div>
          <Badge variant="outline" className="text-xs font-body text-ag-300 border-ag-500/30">
            {notifications.filter((n) => !n.read).length} unread
          </Badge>
        </div>
        <div className="divide-y divide-ag-500/10">
          {notifications.slice(0, 4).map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 py-3 first:pt-0 last:pb-0 ${
                !notif.read ? 'bg-fw-300/5 -mx-2 px-2 rounded-lg' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                notif.type === 'order'
                  ? 'bg-blue-100 text-blue-600'
                  : notif.type === 'review'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {notif.type === 'order' ? (
                  <ShoppingBag className="w-4 h-4" />
                ) : notif.type === 'review' ? (
                  <Star className="w-4 h-4" />
                ) : (
                  <Star className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-ag-100">{notif.message}</p>
                <p className="text-xs text-ag-300 mt-0.5">{notif.time}</p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-fw-300 shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}