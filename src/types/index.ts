// ============================================
// Product Types
// ============================================

export interface ProductSpecification {
  name: string;
  value: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  vendorId: number;
  vendor: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  badge?: string;
  stock: number;
  sku: string;
  tags: string[];
  specifications: ProductSpecification[];
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// ============================================
// Category Types
// ============================================

export interface Category {
  slug: string;
  name: string;
  icon: string;
  count: number;
  image: string;
  description: string;
}

// ============================================
// Vendor Types
// ============================================

export interface Vendor {
  id: number;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  rating: number;
  logo: string;
  cover: string;
  tag: string;
  joinDate: string;
  location: string;
  totalSales: number;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  coverImages: string[];
}

// ============================================
// Search Types
// ============================================

export type SortOption =
  | 'relevance'
  | 'price-asc'
  | 'price-desc'
  | 'rating'
  | 'newest';

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sortBy?: SortOption;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
}

// ============================================
// Auth Types
// ============================================

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// ============================================
// Address Types
// ============================================

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

// ============================================
// Order Types
// ============================================

export interface OrderItem {
  product: Product;
  quantity: number;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// ============================================
// Checkout Types
// ============================================

export interface CheckoutData {
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export type PaymentMethod = 'credit-card' | 'debit-card' | 'paypal' | 'cod';

// ============================================
// Form Validation Types
// ============================================

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AddressFormValues {
  firstName: string;
  lastName: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}