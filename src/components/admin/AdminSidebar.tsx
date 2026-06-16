'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Users,
  Grid3X3,
  Settings,
  LogOut,
} from 'lucide-react';
import { adminNavItems } from '@/data/admin-dashboard';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Users,
  Grid3X3,
  Settings,
};

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col h-full bg-ag-100 text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-fw-300 rounded-lg flex items-center justify-center">
            <span className="text-white font-heading font-bold text-sm">A</span>
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">
            Artisan<span className="text-fw-300">Market</span>
          </span>
        </Link>
        <p className="text-xs text-white/50 mt-2 font-body">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => {
          const IconComponent = iconMap[item.icon];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-heading transition-colors',
                isActive
                  ? 'bg-white/10 text-fw-300'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              {IconComponent && <IconComponent className="w-5 h-5 shrink-0" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
            <span className="text-sm font-bold font-heading text-fw-300">A</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium font-heading truncate">
              Platform Admin
            </p>
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-fw-300/20 text-fw-300 font-medium mt-0.5">
              Admin
            </span>
          </div>
          <button className="text-white/50 hover:text-white transition-colors p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}