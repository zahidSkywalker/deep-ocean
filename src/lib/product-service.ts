import { products } from '@/data/products';
import { vendors } from '@/data/vendors';
import { categories } from '@/data/categories';
import type { Product, Vendor, Category, SearchFilters, SearchResult } from '@/types';

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.category === categorySlug);
}

export function getProductsByVendor(vendorSlug: string): Product[] {
  const vendor = vendors.find((v) => v.slug === vendorSlug);
  if (!vendor) return [];
  return products.filter((p) => p.vendorId === vendor.id);
}

export function getRelatedProducts(productId: number, limit: number = 4): Product[] {
  const product = products.find((p) => p.id === productId);
  if (!product) return [];
  return products
    .filter((p) => p.category === product.category && p.id !== productId)
    .slice(0, limit);
}

export function searchProducts(filters: SearchFilters): SearchResult {
  let result = [...products];

  // Filter by query
  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.vendor.toLowerCase().includes(q)
    );
  }

  // Filter by category
  if (filters.category) {
    result = result.filter((p) => p.category === filters.category);
  }

  // Filter by price range
  if (filters.minPrice !== undefined && filters.minPrice !== null) {
    result = result.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    result = result.filter((p) => p.price <= filters.maxPrice!);
  }

  // Filter by rating
  if (filters.rating !== undefined && filters.rating !== null) {
    result = result.filter((p) => p.rating >= filters.rating!);
  }

  const total = result.length;

  // Sort
  switch (filters.sortBy) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case 'relevance':
    default:
      // For relevance, if there's a query, prioritize name matches
      if (filters.query) {
        const q = filters.query.toLowerCase();
        result.sort((a, b) => {
          const aName = a.name.toLowerCase().includes(q) ? 1 : 0;
          const bName = b.name.toLowerCase().includes(q) ? 1 : 0;
          return bName - aName || b.rating - a.rating;
        });
      }
      break;
  }

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const start = (page - 1) * limit;
  result = result.slice(start, start + limit);

  return { products: result, total };
}

export function getVendorBySlug(slug: string): Vendor | undefined {
  return vendors.find((v) => v.slug === slug);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getCategories(): Category[] {
  return categories;
}