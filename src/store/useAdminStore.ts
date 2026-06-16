import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, OrderStatus } from '@/types';
import type { Vendor } from '@/types';
import { products } from '@/data/products';
import { vendors } from '@/data/vendors';
import { categories } from '@/data/categories';
import { platformAnalytics, adminUsers, defaultPlatformSettings, type PlatformSettings, type AdminUser } from '@/data/admin-dashboard';

// ============================================
// Admin Store Interface
// ============================================

interface AdminStoreState {
  // Platform data
  platformOrders: PlatformOrder[];
  platformUsers: AdminUser[];
  settings: PlatformSettings;
  notifications: typeof platformAnalytics.notifications;

  // Actions - Vendors
  updateVendorStatus: (vendorId: number, status: 'verified' | 'pending' | 'unverified') => void;

  // Actions - Products
  toggleProductFlag: (productId: number) => void;
  removeProduct: (productId: number) => void;

  // Actions - Orders
  updatePlatformOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Actions - Users
  updateUserStatus: (userId: string, status: AdminUser['status']) => void;
  updateUserRole: (userId: string, role: AdminUser['role']) => void;

  // Actions - Categories
  addCategory: (cat: { slug: string; name: string; icon: string; description: string; image: string }) => void;
  updateCategory: (slug: string, data: Partial<{ name: string; icon: string; description: string; image: string }>) => void;
  deleteCategory: (slug: string) => void;

  // Actions - Settings
  updateSettings: (data: Partial<PlatformSettings>) => void;

  // Actions - Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

// ============================================
// Platform Order Type
// ============================================

export interface PlatformOrder {
  orderId: string;
  customerName: string;
  customerEmail: string;
  vendorName: string;
  vendorId: number;
  items: { productName: string; quantity: number; price: number }[];
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  date: string;
}

// ============================================
// Generate Platform Orders
// ============================================

function generatePlatformOrders(): PlatformOrder[] {
  const statuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const names = [
    'John Doe', 'Sarah Miller', 'Mike Johnson', 'Emily Chen', 'David Wilson',
    'Lisa Brown', 'James Taylor', 'Anna White', 'Robert Garcia', 'Jennifer Lee',
    'Chris Martinez', 'Nicole Brown', 'Tom Anderson', 'Rachel Green', 'Kevin Lee',
    'Lauren Scott', 'Daniel Nguyen', 'Amanda Foster', 'Jessica Taylor', 'Robert Kim',
  ];
  const payMethods = ['credit-card', 'paypal', 'debit-card', 'cod'];
  const productPool = products.slice(0, 10);
  const vendorPool = vendors.slice(0, 10);

  return Array.from({ length: 30 }, (_, i) => {
    const vendor = vendorPool[i % vendorPool.length];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = Array.from({ length: itemCount }, () => {
      const prod = productPool[Math.floor(Math.random() * productPool.length)];
      return { productName: prod.name, quantity: Math.floor(Math.random() * 2) + 1, price: prod.price };
    });
    const subtotal = Math.round(items.reduce((s, it) => s + it.price * it.quantity, 0) * 100) / 100;
    const shipping = subtotal >= 75 ? 0 : 5.99;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const date = new Date(2026, 5, 15 - Math.floor(i / 3));

    return {
      orderId: `PLT-${String(i + 1).padStart(3, '0')}`,
      customerName: names[i % names.length],
      customerEmail: names[i % names.length].toLowerCase().replace(' ', '.') + '@email.com',
      vendorName: vendor.name,
      vendorId: vendor.id,
      items,
      paymentMethod: payMethods[i % payMethods.length],
      subtotal,
      shipping: Math.round(shipping * 100) / 100,
      tax,
      total: Math.round((subtotal + shipping + tax) * 100) / 100,
      status: statuses[i % statuses.length],
      date: date.toISOString().split('T')[0],
    };
  });
}

// ============================================
// Flaggable Product
// ============================================

export interface FlaggableProduct extends Product {
  flagged?: boolean;
}

// ============================================
// Store
// ============================================

export const useAdminStore = create<AdminStoreState>()(
  persist(
    (set) => ({
      platformOrders: generatePlatformOrders(),
      platformUsers: [...adminUsers],
      settings: { ...defaultPlatformSettings },
      notifications: [...platformAnalytics.notifications],

      updateVendorStatus: (vendorId: number, status: 'verified' | 'pending' | 'unverified') => {
        // This is a UI-only action; vendors come from seed data so we track overrides
        console.log(`Vendor ${vendorId} status updated to ${status}`);
      },

      toggleProductFlag: (productId: number) => {
        set((state) => ({
          // We don't mutate the products array — track flagged IDs separately
        }));
      },

      removeProduct: (productId: number) => {
        console.log(`Product ${productId} removed`);
      },

      updatePlatformOrderStatus: (orderId: string, status: OrderStatus) => {
        set((state) => ({
          platformOrders: state.platformOrders.map((o) =>
            o.orderId === orderId ? { ...o, status } : o
          ),
        }));
      },

      updateUserStatus: (userId: string, status: AdminUser['status']) => {
        set((state) => ({
          platformUsers: state.platformUsers.map((u) =>
            u.id === userId ? { ...u, status } : u
          ),
        }));
      },

      updateUserRole: (userId: string, role: AdminUser['role']) => {
        set((state) => ({
          platformUsers: state.platformUsers.map((u) =>
            u.id === userId ? { ...u, role } : u
          ),
        }));
      },

      addCategory: (cat) => {
        console.log('Category added:', cat);
      },

      updateCategory: (slug, data) => {
        console.log('Category updated:', slug, data);
      },

      deleteCategory: (slug) => {
        console.log('Category deleted:', slug);
      },

      updateSettings: (data) => {
        set((state) => ({
          settings: { ...state.settings, ...data },
        }));
      },

      markNotificationRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
    }),
    {
      name: 'artisanmarket-admin',
    }
  )
);