'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User as UserIcon,
  ShoppingBag,
  Heart,
  ArrowRight,
  LogOut,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { siteConfig, orderStatusConfig } from '@/data';
import Breadcrumb from '@/components/shared/Breadcrumb';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const orders = useOrderStore((s) => s.orders);
  const wishlistItems = useWishlistStore((s) => s.items);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const { currencySymbol } = siteConfig;
  const recentOrders = orders.slice(0, 5);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-10 md:py-16 lg:py-20">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'My Account' },
            ]}
          />

          {/* User Header */}
          <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8 mt-6 mb-8 md:mb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="w-18 h-18 bg-ag-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-heading font-bold text-2xl">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-ag-100">
                    {user.firstName} {user.lastName}
                  </h1>
                  <p className="text-sm md:text-base font-body text-ag-300 mt-1">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-ag-500/40 text-ag-300 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-xl font-heading font-medium text-sm gap-2 self-start sm:self-auto h-10"
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
            <div className="bg-white rounded-2xl shadow-soft p-6 flex items-center gap-5">
              <div className="w-14 h-14 bg-ag-100/10 rounded-xl flex items-center justify-center shrink-0">
                <Package className="size-6 text-ag-100" />
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-ag-100">{orders.length}</p>
                <p className="text-sm font-body text-ag-300">Total Orders</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-soft p-6 flex items-center gap-5">
              <div className="w-14 h-14 bg-fw-300/10 rounded-xl flex items-center justify-center shrink-0">
                <Heart className="size-6 text-fw-300" />
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-ag-100">{wishlistItems.length}</p>
                <p className="text-sm font-body text-ag-300">Wishlist Items</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-soft p-6 flex items-center gap-5">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <UserIcon className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-base font-heading font-bold text-ag-100">Member</p>
                <p className="text-sm font-body text-ag-300">
                  Since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-heading font-bold text-xl text-ag-100">Recent Orders</h2>
              {orders.length > 5 && (
                <Link
                  href="#"
                  className="text-sm font-body text-fw-200 hover:text-fw-300 transition-colors flex items-center gap-1 font-medium"
                >
                  View All
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-ag-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="size-8 text-ag-400" />
                </div>
                <p className="font-body text-ag-300 text-sm md:text-base mb-6">You haven&apos;t placed any orders yet.</p>
                <Link href="/">
                  <Button className="bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading font-medium text-sm px-8 h-12 transition-colors">
                    Start Shopping
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const statusInfo = orderStatusConfig[order.status];
                  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  return (
                    <Link
                      key={order.id}
                      href={`/order/${order.id}`}
                      className="flex items-center justify-between p-5 rounded-xl border border-ag-500/20 hover:border-ag-500/40 hover:shadow-soft transition-all group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-heading font-semibold text-sm text-ag-100">
                            {order.id}
                          </p>
                          <Badge
                            className={`text-[10px] font-body font-medium rounded-full px-2.5 py-0.5 ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-xs font-body text-ag-400 mt-1.5">
                          {orderDate} &middot; {order.items.length}{' '}
                          {order.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-heading font-bold text-base text-ag-100">
                          {currencySymbol}{order.total.toFixed(2)}
                        </p>
                        <ArrowRight className="size-3.5 text-ag-400 group-hover:text-ag-200 transition-colors ml-auto mt-1.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}