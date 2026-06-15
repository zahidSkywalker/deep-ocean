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