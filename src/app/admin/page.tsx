'use client';

import {
  DollarSign,
  ShoppingBag,
  Store,
  Package,
  Users,
  TrendingUp,
  Star,
} from 'lucide-react';
import { StatsCard } from '@/components/vendor/StatsCard';
import { platformAnalytics } from '@/data/admin-dashboard';
import { orderStatusConfig } from '@/data/checkout';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">
          Platform Dashboard
        </h2>
        <p className="text-ag-300 font-body mt-1">
          Monitor your marketplace performance and manage operations.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
        <StatsCard
          icon={DollarSign}
          value={`$${platformAnalytics.totalRevenue.toLocaleString()}`}
          label="Total Revenue"
          change={12.5}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          icon={ShoppingBag}
          value={platformAnalytics.totalOrders.toLocaleString()}
          label="Total Orders"
          change={8.2}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          icon={Store}
          value={platformAnalytics.totalVendors.toString()}
          label="Total Vendors"
          change={6.3}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          icon={Package}
          value={platformAnalytics.totalProducts.toLocaleString()}
          label="Total Products"
          change={4.0}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatsCard
          icon={Users}
          value={platformAnalytics.totalUsers.toLocaleString()}
          label="Total Users"
          change={15.8}
          iconBgColor="bg-teal-100"
          iconColor="text-teal-600"
        />
        <StatsCard
          icon={TrendingUp}
          value={`$${platformAnalytics.averageOrderValue.toFixed(2)}`}
          label="Avg Order Value"
          change={-2.1}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-heading font-semibold text-ag-100">Revenue Overview</h3>
            <p className="text-sm text-ag-300 font-body mt-0.5">Monthly platform revenue for the past year</p>
          </div>
          <span className="text-sm text-ag-200 font-body">
            <span className="font-semibold text-ag-100 font-heading">
              ${platformAnalytics.totalRevenue.toLocaleString()}
            </span>{' '}
            total
          </span>
        </div>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformAnalytics.monthlyRevenue} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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

      {/* Two Columns: Recent Orders + Top Vendors */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-ag-200" />
              <h3 className="font-heading font-semibold text-ag-100">Recent Orders</h3>
            </div>
            <Badge variant="outline" className="text-xs font-body text-ag-300 border-ag-500/30">
              {platformAnalytics.recentPlatformOrders.length} recent
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ag-500/20">
                  <th className="text-left py-2.5 px-2 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Order ID</th>
                  <th className="text-left py-2.5 px-2 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Customer</th>
                  <th className="text-left py-2.5 px-2 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden sm:table-cell">Vendor</th>
                  <th className="text-left py-2.5 px-2 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-left py-2.5 px-2 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-2.5 px-2 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ag-500/10">
                {platformAnalytics.recentPlatformOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-ag-800/30 transition-colors">
                    <td className="py-2.5 px-2 font-heading font-medium text-ag-100 text-xs">{order.orderId}</td>
                    <td className="py-2.5 px-2 font-body text-ag-200 text-xs">{order.customerName}</td>
                    <td className="py-2.5 px-2 font-body text-ag-300 text-xs hidden sm:table-cell">{order.vendorName}</td>
                    <td className="py-2.5 px-2 font-heading font-semibold text-ag-100 text-xs">${order.amount.toFixed(2)}</td>
                    <td className="py-2.5 px-2">
                      <Badge variant="secondary" className={`text-[10px] ${orderStatusConfig[order.status].color}`}>
                        {orderStatusConfig[order.status].label}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 font-body text-ag-300 text-xs hidden md:table-cell">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-soft p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-ag-200" />
            <h3 className="font-heading font-semibold text-ag-100">Top Vendors</h3>
          </div>
          <div className="space-y-4">
            {platformAnalytics.topVendors.map((vendor, idx) => (
              <div key={vendor.vendorId} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-ag-800 flex items-center justify-center text-xs font-bold font-heading text-ag-200 shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ag-100 font-body truncate">{vendor.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-fw-300 fill-fw-300" />
                      <span className="text-xs text-ag-300 font-body">{vendor.rating}</span>
                    </div>
                    <span className="text-xs text-green-600 font-medium font-body">+{vendor.growth}%</span>
                  </div>
                </div>
                <p className="text-sm font-semibold font-heading text-ag-100 shrink-0">
                  ${vendor.revenue.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-ag-200" />
          <h3 className="font-heading font-semibold text-ag-100">Category Breakdown</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {platformAnalytics.categoryBreakdown.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3 p-3 rounded-xl bg-ag-800/20">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-ag-100 font-body">{cat.name}</span>
                  <span className="text-sm font-semibold font-heading text-ag-100">${cat.revenue.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-ag-800/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fw-300 rounded-full transition-all"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-ag-300 font-body">{cat.orders} orders</span>
                  <span className="text-xs text-ag-300 font-body">{cat.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}