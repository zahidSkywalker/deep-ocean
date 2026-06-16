import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Vendor, Order, OrderStatus, Address } from '@/types';
import { products } from '@/data/products';
import { vendors } from '@/data/vendors';
import { vendorAnalytics } from '@/data/vendor-dashboard';

// ============================================
// Vendor Settings
// ============================================

export interface VendorSettings {
  storeName: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  contactEmail: string;
  phone: string;
  location: string;
  businessHours: string;
  shippingPolicy: string;
  returnPolicy: string;
}

const defaultSettings: VendorSettings = {
  storeName: '',
  description: '',
  logoUrl: '',
  coverUrl: '',
  contactEmail: '',
  phone: '',
  location: '',
  businessHours: 'Mon-Fri: 9:00 AM - 6:00 PM\nSat: 10:00 AM - 4:00 PM\nSun: Closed',
  shippingPolicy: 'We ship within 2-3 business days. Standard shipping takes 5-7 business days. Express shipping available for an additional fee.',
  returnPolicy: 'We accept returns within 30 days of delivery. Items must be in original condition. Contact us for return authorization.',
};

// ============================================
// Vendor Order (simplified for vendor view)
// ============================================

export interface VendorOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  items: { productName: string; quantity: number; price: number }[];
  shippingAddress: Address;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

// ============================================
// Mock Vendor Orders
// ============================================

function generateMockVendorOrders(): VendorOrder[] {
  const statuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const names = [
    'John Doe', 'Sarah Miller', 'Mike Johnson', 'Emily Chen', 'David Wilson',
    'Lisa Brown', 'James Taylor', 'Anna White', 'Robert Garcia', 'Jennifer Lee',
    'Chris Martinez', 'Nicole Brown', 'Tom Anderson', 'Rachel Green', 'Kevin Lee',
  ];
  const payMethods = ['credit-card', 'paypal', 'debit-card', 'cod'];
  const productNames = [
    'Wireless Noise-Canceling Headphones',
    'Smart Fitness Watch Pro',
    'Artisan Leather Crossbody Bag',
    'Premium Skincare Essential Kit',
    'Handcrafted Ceramic Vase Set',
  ];

  return Array.from({ length: 20 }, (_, i) => {
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = Array.from({ length: itemCount }, () => ({
      productName: productNames[Math.floor(Math.random() * productNames.length)],
      quantity: Math.floor(Math.random() * 2) + 1,
      price: Math.round((Math.random() * 200 + 30) * 100) / 100,
    }));
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const shipping = 5.99;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const date = new Date(2026, 5, 15 - i);

    return {
      id: `ORD-${String(i + 1).padStart(3, '0')}`,
      customerName: names[i % names.length],
      customerEmail: names[i % names.length].toLowerCase().replace(' ', '.') + '@email.com',
      items,
      shippingAddress: {
        id: `addr-${i}`,
        firstName: names[i % names.length].split(' ')[0],
        lastName: names[i % names.length].split(' ')[1],
        street: `${100 + i * 10} Main Street`,
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
        country: 'US',
        phone: `(503) 555-${String(1000 + i).slice(1)}`,
        isDefault: false,
      },
      paymentMethod: payMethods[i % payMethods.length],
      subtotal: Math.round(subtotal * 100) / 100,
      shipping,
      tax,
      total: Math.round((subtotal + shipping + tax) * 100) / 100,
      status: statuses[i % statuses.length],
      createdAt: date.toISOString().split('T')[0],
    };
  });
}

// ============================================
// Store Interface
// ============================================

interface VendorStoreState {
  currentVendor: Vendor | null;
  vendorProducts: Product[];
  vendorOrders: VendorOrder[];
  settings: VendorSettings;
  notifications: typeof vendorAnalytics.notifications;

  // Actions
  setCurrentVendor: (vendor: Vendor) => void;
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: number, data: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateSettings: (settings: Partial<VendorSettings>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

let nextProductId = 100;

export const useVendorStore = create<VendorStoreState>()(
  persist(
    (set, get) => ({
      currentVendor: vendors[0] ?? null,
      vendorProducts: products.filter((p) => p.vendorId === 1),
      vendorOrders: generateMockVendorOrders(),
      settings: {
        ...defaultSettings,
        storeName: vendors[0]?.name ?? '',
        description: vendors[0]?.description ?? '',
        logoUrl: vendors[0]?.logo ?? '',
        coverUrl: vendors[0]?.cover ?? '',
        contactEmail: 'hello@soundwaveaudio.com',
        phone: '(503) 555-0123',
        location: vendors[0]?.location ?? 'Portland, OR',
      },
      notifications: [...vendorAnalytics.notifications],

      setCurrentVendor: (vendor: Vendor) => {
        set({
          currentVendor: vendor,
          vendorProducts: products.filter((p) => p.vendorId === vendor.id),
          settings: {
            ...defaultSettings,
            storeName: vendor.name,
            description: vendor.description,
            logoUrl: vendor.logo,
            coverUrl: vendor.cover,
            location: vendor.location,
          },
        });
      },

      addProduct: (productData: Omit<Product, 'id'>): Product => {
        const id = nextProductId++;
        const product: Product = { ...productData, id };
        set((state) => ({
          vendorProducts: [...state.vendorProducts, product],
        }));
        return product;
      },

      updateProduct: (id: number, data: Partial<Product>) => {
        set((state) => ({
          vendorProducts: state.vendorProducts.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deleteProduct: (id: number) => {
        set((state) => ({
          vendorProducts: state.vendorProducts.filter((p) => p.id !== id),
        }));
      },

      updateOrderStatus: (orderId: string, status: OrderStatus) => {
        set((state) => ({
          vendorOrders: state.vendorOrders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          ),
        }));
      },

      updateSettings: (newSettings: Partial<VendorSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
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
      name: 'artisanmarket-vendor',
    }
  )
);