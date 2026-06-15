'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  Star,
  Heart,
  ShoppingCart,
  Eye,
  X,
  PackageSearch,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { searchProducts } from '@/lib/product-service';
import SearchFilters from '@/components/search/SearchFilters';
import { categories } from '@/data';
import type { Product, SortOption } from '@/types';

const sortLabels: Record<SortOption, string> = {
  relevance: 'Relevance',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Highest Rated',
  newest: 'Newest',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= Math.floor(rating)
              ? 'fill-fw-300 text-fw-300'
              : star <= rating
              ? 'fill-fw-400 text-fw-400'
              : 'fill-ag-500 text-ag-500'
          }`}
        />
      ))}
    </div>
  );
}

const badgeColors: Record<string, string> = {
  'Best Seller': 'bg-ag-100 text-white',
  'New': 'bg-fw-300 text-white',
  'Hot': 'bg-red-500 text-white',
  'Handmade': 'bg-ac-200 text-white',
  'Trending': 'bg-fw-200 text-white',
  'Sale': 'bg-red-500 text-white',
  'Popular': 'bg-ag-200 text-white',
  'Organic': 'bg-ac-300 text-white',
};

function ProductCardGrid({ product }: { product: Product }) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="bg-white rounded-2xl border border-ag-500/20 overflow-hidden hover-lift shadow-soft h-full">
        {/* Image */}
        <div className="relative aspect-square bg-ag-800 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {product.badge && (
            <Badge
              className={`absolute top-3 left-3 font-heading text-[11px] font-semibold px-2.5 py-0.5 rounded-lg ${badgeColors[product.badge] || 'bg-ag-100 text-white'}`}
            >
              {product.badge}
            </Badge>
          )}
        </div>
        {/* Info */}
        <div className="p-5 md:p-6">
          <p className="text-xs text-fw-200 font-body font-medium mb-1.5 truncate">
            {product.vendor}
          </p>
          <h3 className="font-heading font-semibold text-sm md:text-base text-ag-100 leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={product.rating} />
            <span className="text-xs text-ag-300 font-body">
              {product.rating} ({product.reviews})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-lg md:text-xl text-ag-100">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-ag-400 font-body line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
            {product.originalPrice && (
              <Badge
                variant="secondary"
                className="bg-red-50 text-red-600 text-[10px] font-body font-semibold px-1.5 py-0 rounded-md border-0"
              >
                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ag-500/20 overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="p-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialSort = (searchParams.get('sort') as SortOption) || 'relevance';
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialRating = searchParams.get('rating')
    ? parseInt(searchParams.get('rating')!)
    : null;

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [minRating, setMinRating] = useState<number | null>(initialRating);
  const [searchInput, setSearchInput] = useState(initialQuery);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minRating !== null;

  const handleCategoryChange = useCallback((slug: string, checked: boolean) => {
    setSelectedCategories((prev) =>
      checked ? [...prev, slug] : prev.filter((c) => c !== slug)
    );
  }, []);

  const clearAll = useCallback(() => {
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setMinRating(null);
    setQuery('');
    setSearchInput('');
  }, []);

  const results = useMemo(() => {
    return searchProducts({
      query: query || undefined,
      category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: minRating ?? undefined,
      sortBy,
      page: 1,
      limit: 40,
    });
  }, [query, selectedCategories, minPrice, maxPrice, minRating, sortBy]);

  // For multi-category filter
  const multiCategoryResults = useMemo(() => {
    if (selectedCategories.length <= 1) return results;
    // Manually filter for multiple categories
    const filtered = results.products.filter((p) =>
      selectedCategories.includes(p.category)
    );
    // Re-count for multi-cat
    const total = results.total; // approximate
    return { products: filtered, total: filtered.length };
  }, [results, selectedCategories]);

  const displayResults =
    selectedCategories.length > 1 ? multiCategoryResults : results;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
  };

  const activeFilterBadges = [
    ...selectedCategories.map((slug) => {
      const cat = categories.find((c) => c.slug === slug);
      return cat ? { label: cat.name, type: 'category' as const, value: slug } : null;
    }),
    ...(minPrice ? [{ label: `Min $${minPrice}`, type: 'minPrice' as const, value: '' }] : []),
    ...(maxPrice ? [{ label: `Max $${maxPrice}`, type: 'maxPrice' as const, value: '' }] : []),
    ...(minRating ? [{ label: `${minRating}+ Stars`, type: 'rating' as const, value: '' }] : []),
  ].filter(Boolean) as { label: string; type: string; value: string }[];

  function removeFilter(type: string, value: string) {
    switch (type) {
      case 'category':
        setSelectedCategories((prev) => prev.filter((c) => c !== value));
        break;
      case 'minPrice':
        setMinPrice('');
        break;
      case 'maxPrice':
        setMaxPrice('');
        break;
      case 'rating':
        setMinRating(null);
        break;
    }
  }

  // Mobile filter sidebar content
  const filterContent = (
    <SearchFilters
      selectedCategories={selectedCategories}
      onCategoryChange={handleCategoryChange}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onMinPriceChange={setMinPrice}
      onMaxPriceChange={setMaxPrice}
      minRating={minRating}
      onRatingChange={setMinRating}
      onClearAll={clearAll}
      hasActiveFilters={hasActiveFilters}
    />
  );

  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-10 md:py-16 lg:py-20">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm font-body">
              <li>
                <Link href="/" className="text-ag-300 hover:text-fw-200 transition-colors">
                  Home
                </Link>
              </li>
              <ChevronDown className="size-3 text-ag-400 -rotate-90" />
              <li>
                <span className="text-ag-100 font-medium">Search</span>
              </li>
            </ol>
          </nav>

          {/* Page Title */}
          <div className="mb-10">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-ag-100 mb-3">
              {query ? `Results for "${query}"` : 'Browse Products'}
            </h1>
            <p className="text-ag-300 font-body text-sm md:text-base">
              Showing {displayResults.products.length} of {displayResults.total} products
            </p>
          </div>

          {/* Search Bar (top) */}
          <form onSubmit={handleSearch} className="mb-10">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-ag-300 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search products, vendors, categories..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border-ag-500/60 rounded-xl text-sm font-body placeholder:text-ag-400 focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
              />
            </div>
          </form>

          {/* Active Filters */}
          {activeFilterBadges.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-8">
              <span className="text-xs text-ag-300 font-body">Active:</span>
              {activeFilterBadges.map((badge) => (
                <button
                  key={`${badge.type}-${badge.value}`}
                  onClick={() => removeFilter(badge.type, badge.value)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-ag-100 text-white text-xs font-body rounded-lg hover:bg-ag-200 transition-colors"
                >
                  {badge.label}
                  <X className="size-3" />
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-ag-300 hover:text-ag-100 font-body h-8"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Toolbar: Sort + Mobile Filter Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {/* Mobile filter trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="lg:hidden border-ag-400 text-ag-200 hover:bg-ag-800/50 rounded-xl font-heading font-medium"
                  >
                    <SlidersHorizontal className="size-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-80 bg-fw-900 border-r border-ag-500/50 p-0"
                >
                  <SheetHeader className="px-6 pt-6 pb-4 border-b border-ag-500/30">
                    <SheetTitle className="font-heading text-xl text-ag-100">
                      Filters
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Filter products
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                    {filterContent}
                  </div>
                </SheetContent>
              </Sheet>

              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-[220px] bg-white border-ag-500/40 rounded-xl font-body text-sm h-11">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-ag-300 hover:text-ag-100 font-body h-8 hidden lg:flex"
              >
                Clear All Filters
              </Button>
            )}
          </div>

          {/* Main Content: Sidebar + Grid */}
          <div className="flex gap-8 lg:gap-10">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-28 bg-fw-900 rounded-2xl border border-ag-500/20 p-6">
                {filterContent}
              </div>
            </aside>

            {/* Product Grid */}
            <div className="flex-1 min-w-0">
              {displayResults.products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                  {displayResults.products.map((product) => (
                    <ProductCardGrid key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 md:py-32">
                  <div className="w-24 h-24 rounded-full bg-ag-800/50 flex items-center justify-center mb-8">
                    <PackageSearch className="size-12 text-ag-300" />
                  </div>
                  <h3 className="font-heading text-xl md:text-2xl font-bold text-ag-100 mb-3">
                    No products found
                  </h3>
                  <p className="text-ag-300 font-body text-center max-w-md mb-8 text-sm md:text-base leading-relaxed">
                    Try adjusting your search or filter criteria to find what you&apos;re looking for.
                  </p>
                  <Button
                    onClick={clearAll}
                    variant="outline"
                    className="border-ag-400 text-ag-200 hover:bg-ag-800/50 font-heading font-medium rounded-xl px-8"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-fw-500 py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-40 mb-10" />
            <Skeleton className="h-12 w-full max-w-2xl mb-10" />
            <ProductGridSkeleton />
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}