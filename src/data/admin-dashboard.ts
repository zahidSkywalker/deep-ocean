import type { OrderStatus } from '@/types';

// ============================================
// Admin Navigation Items
// ============================================

export const adminNavItems = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Vendors', href: '/admin/vendors', icon: 'Store' },
  { label: 'Products', href: '/admin/products', icon: 'Package' },
  { label: 'Orders', href: '/admin/orders', icon: 'ShoppingBag' },
  { label: 'Users', href: '/admin/users', icon: 'Users' },
  { label: 'Categories', href: '/admin/categories', icon: 'Grid3X3' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
];

// ============================================
// Platform Analytics
// ============================================

export const platformAnalytics = {
  totalRevenue: 284750.0,
  totalOrders: 1842,
  totalVendors: 16,
  totalProducts: 1347,
  totalUsers: 8920,
  averageOrderValue: 154.58,
  monthlyRevenue: [
    { month: 'Jan', revenue: 18200, orders: 118, vendors: 12, users: 680 },
    { month: 'Feb', revenue: 21400, orders: 139, vendors: 12, users: 720 },
    { month: 'Mar', revenue: 19800, orders: 128, vendors: 13, users: 755 },
    { month: 'Apr', revenue: 24600, orders: 162, vendors: 13, users: 810 },
    { month: 'May', revenue: 23100, orders: 151, vendors: 14, users: 840 },
    { month: 'Jun', revenue: 26800, orders: 174, vendors: 14, users: 890 },
    { month: 'Jul', revenue: 25400, orders: 168, vendors: 15, users: 930 },
    { month: 'Aug', revenue: 22900, orders: 149, vendors: 15, users: 960 },
    { month: 'Sep', revenue: 24200, orders: 157, vendors: 16, users: 990 },
    { month: 'Oct', revenue: 26500, orders: 172, vendors: 16, users: 1020 },
    { month: 'Nov', revenue: 21350, orders: 138, vendors: 16, users: 1050 },
    { month: 'Dec', revenue: 29500, orders: 196, vendors: 16, users: 1080 },
  ],
  categoryBreakdown: [
    { name: 'Electronics', revenue: 68400, orders: 412, percentage: 24.0 },
    { name: 'Fashion', revenue: 52100, orders: 380, percentage: 18.3 },
    { name: 'Beauty', revenue: 45600, orders: 342, percentage: 16.0 },
    { name: 'Home & Living', revenue: 38200, orders: 268, percentage: 13.4 },
    { name: 'Food & Beverage', revenue: 31400, orders: 198, percentage: 11.0 },
    { name: 'Sports & Fitness', revenue: 24800, orders: 142, percentage: 8.7 },
    { name: 'Books & Stationery', revenue: 14250, orders: 60, percentage: 5.0 },
    { name: 'Others', revenue: 10000, orders: 40, percentage: 3.5 },
  ],
  topVendors: [
    { vendorId: 4, name: 'Glow Botanics', revenue: 48250, orders: 312, rating: 4.8, growth: 18.2 },
    { vendorId: 3, name: 'NaturWear Co.', revenue: 42100, orders: 289, rating: 4.7, growth: 14.5 },
    { vendorId: 13, name: 'EcoLife Essentials', revenue: 38900, orders: 256, rating: 4.4, growth: 22.1 },
    { vendorId: 6, name: 'FitTech Labs', revenue: 31200, orders: 198, rating: 4.6, growth: 9.8 },
    { vendorId: 1, name: 'SoundWave Audio', revenue: 28450, orders: 175, rating: 4.9, growth: 12.5 },
  ],
  recentPlatformOrders: [
    { orderId: 'PLT-001', customerName: 'John Doe', vendorName: 'SoundWave Audio', amount: 189.99, status: 'shipped' as OrderStatus, date: '2026-06-15', items: 1 },
    { orderId: 'PLT-002', customerName: 'Sarah Miller', vendorName: 'Glow Botanics', amount: 124.50, status: 'processing' as OrderStatus, date: '2026-06-15', items: 3 },
    { orderId: 'PLT-003', customerName: 'Mike Johnson', vendorName: 'NaturWear Co.', amount: 298.00, status: 'pending' as OrderStatus, date: '2026-06-15', items: 2 },
    { orderId: 'PLT-004', customerName: 'Emily Chen', vendorName: 'Heritage Crafts', amount: 445.99, status: 'delivered' as OrderStatus, date: '2026-06-14', items: 1 },
    { orderId: 'PLT-005', customerName: 'David Wilson', vendorName: 'FitTech Labs', amount: 189.00, status: 'confirmed' as OrderStatus, date: '2026-06-14', items: 2 },
    { orderId: 'PLT-006', customerName: 'Lisa Brown', vendorName: 'Earth & Clay Studio', amount: 76.50, status: 'shipped' as OrderStatus, date: '2026-06-14', items: 1 },
    { orderId: 'PLT-007', customerName: 'James Taylor', vendorName: 'Leaf & Bowl', amount: 156.00, status: 'delivered' as OrderStatus, date: '2026-06-13', items: 4 },
    { orderId: 'PLT-008', customerName: 'Anna White', vendorName: 'Lumiere Studio', amount: 89.00, status: 'cancelled' as OrderStatus, date: '2026-06-13', items: 1 },
    { orderId: 'PLT-009', customerName: 'Robert Garcia', vendorName: 'EcoLife Essentials', amount: 312.00, status: 'processing' as OrderStatus, date: '2026-06-13', items: 3 },
    { orderId: 'PLT-010', customerName: 'Jennifer Lee', vendorName: 'SoundWave Audio', amount: 225.99, status: 'pending' as OrderStatus, date: '2026-06-12', items: 1 },
  ],
  notifications: [
    { id: 'an1', type: 'vendor' as const, message: 'New vendor application from Artisan Home Co.', time: '30 min ago', read: false },
    { id: 'an2', type: 'order' as const, message: 'High-value order PLT-004 requires review', time: '1 hour ago', read: false },
    { id: 'an3', type: 'flag' as const, message: 'Product flagged for review: "Designer Sunglasses"', time: '2 hours ago', read: false },
    { id: 'an4', type: 'dispute' as const, message: 'New dispute opened for order PLT-007', time: '3 hours ago', read: false },
    { id: 'an5', type: 'system' as const, message: 'Monthly platform report is ready', time: '5 hours ago', read: true },
    { id: 'an6', type: 'vendor' as const, message: 'Lumiere Studio verification approved', time: '1 day ago', read: true },
    { id: 'an7', type: 'system' as const, message: 'Server maintenance scheduled for tonight', time: '1 day ago', read: true },
  ],
};

// ============================================
// Admin User Data
// ============================================

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  role: 'admin' | 'vendor' | 'customer';
  status: 'active' | 'suspended' | 'inactive';
  totalOrders: number;
  totalSpent: number;
  joinedAt: string;
  lastActive: string;
  vendorId?: number;
  vendorName?: string;
}

export const adminUsers: AdminUser[] = [
  { id: 'usr-001', firstName: 'Alex', lastName: 'Thompson', email: 'alex@artisanmarket.com', phone: '(555) 100-0001', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop', role: 'admin', status: 'active', totalOrders: 0, totalSpent: 0, joinedAt: '2022-01-01', lastActive: '2026-06-15' },
  { id: 'usr-002', firstName: 'Marcus', lastName: 'Rivera', email: 'marcus.rivera@soundwave.com', phone: '(503) 555-0101', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', role: 'vendor', status: 'active', totalOrders: 0, totalSpent: 0, joinedAt: '2023-06-15', lastActive: '2026-06-15', vendorId: 1, vendorName: 'SoundWave Audio' },
  { id: 'usr-003', firstName: 'Olivia', lastName: 'Bennett', email: 'olivia.b@earthclay.com', phone: '(828) 555-0202', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop', role: 'vendor', status: 'active', totalOrders: 0, totalSpent: 0, joinedAt: '2022-11-20', lastActive: '2026-06-14', vendorId: 2, vendorName: 'Earth & Clay Studio' },
  { id: 'usr-004', firstName: 'Ethan', lastName: 'Brooks', email: 'ethan@naturwear.com', phone: '(512) 555-0303', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', role: 'vendor', status: 'active', totalOrders: 0, totalSpent: 0, joinedAt: '2023-03-10', lastActive: '2026-06-15', vendorId: 3, vendorName: 'NaturWear Co.' },
  { id: 'usr-005', firstName: 'Sophia', lastName: 'Kim', email: 'sophia@glowbotanics.com', phone: '(619) 555-0404', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop', role: 'vendor', status: 'active', totalOrders: 0, totalSpent: 0, joinedAt: '2023-01-08', lastActive: '2026-06-15', vendorId: 4, vendorName: 'Glow Botanics' },
  { id: 'usr-006', firstName: 'John', lastName: 'Doe', email: 'john.doe@email.com', phone: '(212) 555-1001', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', role: 'customer', status: 'active', totalOrders: 24, totalSpent: 3240.50, joinedAt: '2023-04-12', lastActive: '2026-06-15' },
  { id: 'usr-007', firstName: 'Sarah', lastName: 'Miller', email: 'sarah.m@email.com', phone: '(310) 555-1002', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', role: 'customer', status: 'active', totalOrders: 18, totalSpent: 2180.00, joinedAt: '2023-06-20', lastActive: '2026-06-14' },
  { id: 'usr-008', firstName: 'Mike', lastName: 'Johnson', email: 'mike.j@email.com', phone: '(415) 555-1003', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', role: 'customer', status: 'active', totalOrders: 12, totalSpent: 1560.75, joinedAt: '2023-09-05', lastActive: '2026-06-13' },
  { id: 'usr-009', firstName: 'Emily', lastName: 'Chen', email: 'emily.c@email.com', phone: '(617) 555-1004', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', role: 'customer', status: 'active', totalOrders: 31, totalSpent: 4890.25, joinedAt: '2023-02-14', lastActive: '2026-06-15' },
  { id: 'usr-010', firstName: 'David', lastName: 'Wilson', email: 'david.w@email.com', phone: '(773) 555-1005', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&h=80&fit=crop', role: 'customer', status: 'suspended', totalOrders: 3, totalSpent: 245.00, joinedAt: '2024-01-10', lastActive: '2026-05-20' },
  { id: 'usr-011', firstName: 'Lisa', lastName: 'Brown', email: 'lisa.b@email.com', phone: '(305) 555-1006', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop', role: 'customer', status: 'active', totalOrders: 9, totalSpent: 1120.50, joinedAt: '2023-11-18', lastActive: '2026-06-12' },
  { id: 'usr-012', firstName: 'James', lastName: 'Taylor', email: 'james.t@email.com', phone: '(404) 555-1007', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=80&h=80&fit=crop', role: 'customer', status: 'inactive', totalOrders: 1, totalSpent: 79.99, joinedAt: '2024-03-22', lastActive: '2026-04-01' },
  { id: 'usr-013', firstName: 'Anna', lastName: 'White', email: 'anna.w@email.com', phone: '(202) 555-1008', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=80&h=80&fit=crop', role: 'customer', status: 'active', totalOrders: 15, totalSpent: 2340.00, joinedAt: '2023-07-08', lastActive: '2026-06-14' },
  { id: 'usr-014', firstName: 'Robert', lastName: 'Garcia', email: 'robert.g@email.com', phone: '(713) 555-1009', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&h=80&fit=crop', role: 'customer', status: 'active', totalOrders: 7, totalSpent: 890.00, joinedAt: '2024-02-05', lastActive: '2026-06-13' },
  { id: 'usr-015', firstName: 'Claire', lastName: 'Dubois', email: 'claire@lumierestudio.com', phone: '(912) 555-0505', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop', role: 'vendor', status: 'active', totalOrders: 0, totalSpent: 0, joinedAt: '2024-01-15', lastActive: '2026-06-10', vendorId: 8, vendorName: 'Lumiere Studio' },
];

// ============================================
// Admin Platform Settings
// ============================================

export interface PlatformSettings {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  supportPhone: string;
  currency: string;
  currencySymbol: string;
  freeShippingThreshold: number;
  standardShippingCost: number;
  expressShippingCost: number;
  taxRate: number;
  vendorCommissionRate: number;
  enableVendorRegistration: boolean;
  requireVendorVerification: boolean;
  enableReviews: boolean;
  enableWishlist: boolean;
  maintenanceMode: boolean;
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
  };
}

export const defaultPlatformSettings: PlatformSettings = {
  siteName: 'ArtisanMarket',
  tagline: 'Discover Unique Products from Top Vendors',
  description: 'A premium multi-vendor marketplace connecting you with curated products from the world\'s finest artisans and brands.',
  contactEmail: 'hello@artisanmarket.com',
  supportPhone: '(800) 555-0199',
  currency: 'USD',
  currencySymbol: '$',
  freeShippingThreshold: 75,
  standardShippingCost: 5.99,
  expressShippingCost: 14.99,
  taxRate: 8,
  vendorCommissionRate: 12,
  enableVendorRegistration: true,
  requireVendorVerification: true,
  enableReviews: true,
  enableWishlist: true,
  maintenanceMode: false,
  socialLinks: {
    facebook: 'https://facebook.com/artisanmarket',
    twitter: 'https://twitter.com/artisanmarket',
    instagram: 'https://instagram.com/artisanmarket',
    youtube: 'https://youtube.com/artisanmarket',
  },
};