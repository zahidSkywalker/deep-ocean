'use client';

import { usePathname } from 'next/navigation';
import { Menu, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from './NotificationDropdown';
import { useVendorStore } from '@/store/useVendorStore';
import { vendorNavItems } from '@/data/vendor-dashboard';

interface VendorTopBarProps {
  onMenuClick: () => void;
}

export function VendorTopBar({ onMenuClick }: VendorTopBarProps) {
  const pathname = usePathname();
  const currentVendor = useVendorStore((s) => s.currentVendor);

  const currentNav = vendorNavItems.find((item) => item.href === pathname);
  const pageTitle = currentNav?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-ag-500/20">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-ag-200 hover:text-ag-100 hover:bg-ag-800/50"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <div>
            <h1 className="text-lg font-bold font-heading text-ag-100">{pageTitle}</h1>
            <p className="text-xs text-ag-300 font-body hidden sm:block flex items-center gap-1">
              <Store className="w-3 h-3" />
              {currentVendor?.name ?? 'Vendor Store'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
        </div>
      </div>
    </header>
  );
}