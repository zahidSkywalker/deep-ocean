'use client';

import { Bell, ShoppingBag, Star, Info, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVendorStore } from '@/store/useVendorStore';

const notifIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  order: ShoppingBag,
  review: Star,
  system: Info,
};

export function NotificationDropdown() {
  const notifications = useVendorStore((s) => s.notifications);
  const markNotificationRead = useVendorStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useVendorStore((s) => s.markAllNotificationsRead);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-ag-200 hover:text-ag-100 hover:bg-ag-800/50">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ag-500/20">
          <h3 className="font-heading font-semibold text-sm text-ag-100">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-fw-300 hover:text-fw-200 font-medium flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ag-300 font-body">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-ag-500/10">
              {notifications.map((notif) => {
                const IconComponent = notifIcons[notif.type] ?? Info;
                return (
                  <button
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-ag-800/30 transition-colors ${
                      !notif.read ? 'bg-fw-300/5' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'order'
                        ? 'bg-blue-100 text-blue-600'
                        : notif.type === 'review'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-body text-ag-100 leading-snug">
                        {notif.message}
                      </p>
                      <p className="text-xs text-ag-300 mt-1">{notif.time}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-fw-300 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}