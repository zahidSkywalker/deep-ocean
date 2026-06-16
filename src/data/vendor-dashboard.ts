import type { OrderStatus } from '@/types';

// ============================================
// Vendor Analytics Mock Data
// ============================================

export const vendorAnalytics = {
  totalRevenue: 48250.0,
  totalOrders: 342,
  totalProducts: 24,
  averageRating: 4.8,
  totalReviews: 892,
  monthlyRevenue: [
    { month: 'Jan', revenue: 3200, orders: 28 },
    { month: 'Feb', revenue: 4100, orders: 35 },
    { month: 'Mar', revenue: 3800, orders: 32 },
    { month: 'Apr', revenue: 5200, orders: 42 },
    { month: 'May', revenue: 4600, orders: 38 },
    { month: 'Jun', revenue: 5500, orders: 45 },
    { month: 'Jul', revenue: 4800, orders: 39 },
    { month: 'Aug', revenue: 3900, orders: 30 },
    { month: 'Sep', revenue: 4200, orders: 34 },
    { month: 'Oct', revenue: 5100, orders: 41 },
    { month: 'Nov', revenue: 3700, orders: 28 },
    { month: 'Dec', revenue: 5200, orders: 50 },
  ],
  topProducts: [
    { productId: 1, salesCount: 89, revenue: 16910 },
    { productId: 3, salesCount: 67, revenue: 5260 },
    { productId: 5, salesCount: 54, revenue: 16199 },
    { productId: 6, salesCount: 43, revenue: 7095 },
    { productId: 8, salesCount: 38, revenue: 1444 },
  ],
  recentOrders: [
    { orderId: 'ORD-001', customerName: 'John Doe', amount: 189.99, status: 'shipped' as OrderStatus, date: '2026-06-14', itemCount: 1 },
    { orderId: 'ORD-002', customerName: 'Sarah Miller', amount: 378.00, status: 'processing' as OrderStatus, date: '2026-06-14', itemCount: 2 },
    { orderId: 'ORD-003', customerName: 'Mike Johnson', amount: 79.50, status: 'pending' as OrderStatus, date: '2026-06-13', itemCount: 1 },
    { orderId: 'ORD-004', customerName: 'Emily Chen', amount: 249.99, status: 'delivered' as OrderStatus, date: '2026-06-13', itemCount: 3 },
    { orderId: 'ORD-005', customerName: 'David Wilson', amount: 135.00, status: 'shipped' as OrderStatus, date: '2026-06-12', itemCount: 1 },
    { orderId: 'ORD-006', customerName: 'Lisa Brown', amount: 456.98, status: 'confirmed' as OrderStatus, date: '2026-06-12', itemCount: 4 },
    { orderId: 'ORD-007', customerName: 'James Taylor', amount: 89.00, status: 'cancelled' as OrderStatus, date: '2026-06-11', itemCount: 1 },
    { orderId: 'ORD-008', customerName: 'Anna White', amount: 298.50, status: 'delivered' as OrderStatus, date: '2026-06-11', itemCount: 2 },
  ],
  notifications: [
    { id: 'n1', type: 'order' as const, message: 'New order #ORD-001 received', time: '2 hours ago', read: false },
    { id: 'n2', type: 'review' as const, message: 'New 5-star review on Wireless Headphones', time: '5 hours ago', read: false },
    { id: 'n3', type: 'order' as const, message: 'Order #ORD-004 has been delivered', time: '1 day ago', read: false },
    { id: 'n4', type: 'system' as const, message: 'Monthly sales report is ready', time: '2 days ago', read: true },
    { id: 'n5', type: 'review' as const, message: 'New review on Leather Crossbody Bag', time: '2 days ago', read: true },
    { id: 'n6', type: 'system' as const, message: 'Your store verification is approved', time: '3 days ago', read: true },
  ],
};

// ============================================
// Vendor Navigation Items
// ============================================

export const vendorNavItems = [
  { label: 'Overview', href: '/vendor', icon: 'LayoutDashboard' },
  { label: 'Products', href: '/vendor/products', icon: 'Package' },
  { label: 'Orders', href: '/vendor/orders', icon: 'ShoppingBag' },
  { label: 'Reviews', href: '/vendor/reviews', icon: 'Star' },
  { label: 'Settings', href: '/vendor/settings', icon: 'Settings' },
];

// ============================================
// Vendor Reviews Mock Data
// ============================================

export interface VendorReview {
  id: string;
  customerName: string;
  customerAvatar: string;
  rating: number;
  productName: string;
  productSlug: string;
  text: string;
  date: string;
}

export const vendorReviews: VendorReview[] = [
  {
    id: 'r1',
    customerName: 'John Doe',
    customerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Wireless Noise-Canceling Headphones',
    productSlug: 'wireless-noise-canceling-headphones',
    text: 'Absolutely incredible sound quality! The noise cancellation is top-notch and the battery lasts forever. Best purchase I\'ve made this year.',
    date: '2026-06-12',
  },
  {
    id: 'r2',
    customerName: 'Sarah Mitchell',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Wireless Noise-Canceling Headphones',
    productSlug: 'wireless-noise-canceling-headphones',
    text: 'These headphones are a game-changer for my commute. Crystal clear audio and the comfort is unmatched.',
    date: '2026-06-10',
  },
  {
    id: 'r3',
    customerName: 'Michael Chen',
    customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
    rating: 4,
    productName: 'Smart Fitness Watch Pro',
    productSlug: 'smart-fitness-watch-pro',
    text: 'Great fitness tracking features. The heart rate monitor is very accurate. Only wish the screen was a bit brighter in direct sunlight.',
    date: '2026-06-08',
  },
  {
    id: 'r4',
    customerName: 'Emily Rodriguez',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Handcrafted Ceramic Vase Set',
    productSlug: 'handcrafted-ceramic-vase-set',
    text: 'These vases are absolutely stunning! You can tell they were made with care. Each one has unique character. Perfect for my living room.',
    date: '2026-06-07',
  },
  {
    id: 'r5',
    customerName: 'David Park',
    customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',
    rating: 4,
    productName: 'Artisan Leather Crossbody Bag',
    productSlug: 'artisan-leather-crossbody-bag',
    text: 'Beautiful craftsmanship and the leather smells amazing. Very spacious for its size. The strap could be slightly softer though.',
    date: '2026-06-05',
  },
  {
    id: 'r6',
    customerName: 'Jessica Taylor',
    customerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Premium Skincare Essential Kit',
    productSlug: 'premium-skincare-essential-kit',
    text: 'My skin has never felt better! All natural ingredients and you can see results within a week. Worth every penny.',
    date: '2026-06-04',
  },
  {
    id: 'r7',
    customerName: 'Robert Kim',
    customerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop',
    rating: 4,
    productName: 'Organic Cotton Oversized Tee',
    productSlug: 'organic-cotton-oversized-tee',
    text: 'Super comfortable and the fit is perfect. Love that it\'s organic cotton. Will definitely be buying more colors.',
    date: '2026-06-03',
  },
  {
    id: 'r8',
    customerName: 'Amanda Foster',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Natural Soy Wax Candle Trio',
    productSlug: 'natural-soy-wax-candle-trio',
    text: 'These candles fill the room with the most wonderful, subtle fragrance. Clean burning and the vessels are gorgeous.',
    date: '2026-06-02',
  },
  {
    id: 'r9',
    customerName: 'Chris Martinez',
    customerAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&h=80&fit=crop',
    rating: 3,
    productName: 'Bamboo Desk Organizer Set',
    productSlug: 'bamboo-desk-organizer-set',
    text: 'Good quality bamboo but the assembly instructions were a bit confusing. Once put together it looks great on my desk.',
    date: '2026-06-01',
  },
  {
    id: 'r10',
    customerName: 'Lauren Scott',
    customerAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Minimalist Analog Watch',
    productSlug: 'minimalist-analog-watch',
    text: 'Elegant and minimal — exactly what I was looking for. The leather strap is incredibly soft and the face is easy to read.',
    date: '2026-05-30',
  },
  {
    id: 'r11',
    customerName: 'Daniel Nguyen',
    customerAvatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop',
    rating: 4,
    productName: 'Portable Bluetooth Speaker',
    productSlug: 'portable-bluetooth-speaker',
    text: 'Surprisingly powerful bass for its size. Waterproof feature is a big plus for pool days. Battery life is solid.',
    date: '2026-05-28',
  },
  {
    id: 'r12',
    customerName: 'Rachel Green',
    customerAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Organic Matcha Powder Set',
    productSlug: 'organic-matcha-powder-set',
    text: 'Best matcha I\'ve found online. Vibrant green color and smooth, rich flavor. The whisk is a nice bonus!',
    date: '2026-05-27',
  },
  {
    id: 'r13',
    customerName: 'Tom Anderson',
    customerAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=80&h=80&fit=crop',
    rating: 4,
    productName: 'Stainless Steel Water Bottle',
    productSlug: 'stainless-steel-water-bottle',
    text: 'Keeps my water cold all day. The design is sleek and it fits perfectly in my car cup holder. Very happy with this purchase.',
    date: '2026-05-25',
  },
  {
    id: 'r14',
    customerName: 'Nicole Brown',
    customerAvatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=80&h=80&fit=crop',
    rating: 5,
    productName: 'Wool Blend Knit Throw',
    productSlug: 'wool-blend-knit-throw',
    text: 'So cozy and warm! The knit pattern is beautiful and the wool quality is excellent. Perfect for chilly evenings.',
    date: '2026-05-24',
  },
  {
    id: 'r15',
    customerName: 'Kevin Lee',
    customerAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&h=80&fit=crop',
    rating: 4,
    productName: 'Scented Essential Oil Diffuser',
    productSlug: 'scented-essential-oil-diffuser',
    text: 'Great diffuser with a nice modern design. The mist output is good and it runs quietly. Would make a great gift.',
    date: '2026-05-22',
  },
];