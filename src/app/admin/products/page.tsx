'use client';

import { useState, useMemo } from 'react';
import { Search, Star, Flag, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import { vendors } from '@/data/vendors';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

function getStockStatus(stock: number): { label: string; className: string } {
  if (stock === 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-700' };
  if (stock < 10) return { label: 'Low Stock', className: 'bg-amber-100 text-amber-700' };
  return { label: 'In Stock', className: 'bg-green-100 text-green-700' };
}

export default function AdminProductsPage() {
  const flaggedProducts = useAdminStore((s) => s);
  const toggleProductFlag = useAdminStore((s) => s.toggleProductFlag);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [localFlags, setLocalFlags] = useState<Set<number>>(new Set());

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesVendor = vendorFilter === 'all' || p.vendorId === Number(vendorFilter);
      return matchesSearch && matchesCategory && matchesVendor;
    });
  }, [products, search, categoryFilter, vendorFilter]);

  const getCategoryName = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.name ?? slug;
  };

  const handleToggleFlag = (productId: number, productName: string) => {
    setLocalFlags((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        toast.success(`"${productName}" unflagged`);
      } else {
        next.add(productId);
        toast.success(`"${productName}" flagged for review`);
      }
      return next;
    });
    toggleProductFlag(productId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-ag-100">Product Management</h2>
        <p className="text-sm text-ag-300 font-body mt-1">
          {products.length} product{products.length !== 1 ? 's' : ''} across all vendors
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 md:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ag-400 pointer-events-none" />
            <Input
              placeholder="Search products or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 font-body"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44 font-body">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-full sm:w-48 font-body">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <p className="text-lg font-medium text-ag-200 font-body">No products found</p>
          <p className="text-sm text-ag-300 font-body mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ag-500/20 bg-ag-800/20">
                    <th className="text-left py-3 px-4 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Product</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Category</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Vendor</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Price</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Stock</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Rating</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ag-500/10">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    const isFlagged = localFlags.has(product.id);
                    return (
                      <tr key={product.id} className={`hover:bg-ag-800/30 transition-colors ${isFlagged ? 'bg-red-50/50' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-ag-100 font-body truncate max-w-[200px]">{product.name}</p>
                              <p className="text-xs text-ag-300 font-body">SKU: {product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-ag-200 font-body text-xs">{getCategoryName(product.category)}</td>
                        <td className="py-3 px-3 text-ag-200 font-body text-xs">{product.vendor}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-ag-100 font-heading">${product.price.toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-body ${product.stock < 10 ? (product.stock === 0 ? 'text-red-500 font-semibold' : 'text-amber-600 font-semibold') : 'text-ag-100'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-fw-300 fill-fw-300" />
                            <span className="text-ag-100 font-body text-xs">{product.rating}</span>
                            <span className="text-ag-300 text-xs">({product.reviews})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="secondary" className={`text-xs ${stockStatus.className}`}>
                            {stockStatus.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-ag-300 hover:text-ag-100 hover:bg-ag-800/50" asChild>
                              <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${isFlagged ? 'text-red-500 hover:bg-red-50' : 'text-ag-300 hover:text-amber-500 hover:bg-amber-50'}`}
                              onClick={() => handleToggleFlag(product.id, product.name)}
                            >
                              <Flag className={`w-4 h-4 ${isFlagged ? 'fill-red-500' : ''}`} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid gap-3">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              const isFlagged = localFlags.has(product.id);
              return (
                <div key={product.id} className={`bg-white rounded-2xl shadow-soft p-4 ${isFlagged ? 'ring-1 ring-red-200' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ag-100 font-body text-sm truncate">{product.name}</p>
                      <p className="text-xs text-ag-300 font-body mt-0.5">{getCategoryName(product.category)} · {product.vendor}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-semibold text-ag-100 font-heading text-sm">${product.price.toFixed(2)}</span>
                        <Badge variant="secondary" className={`text-[10px] ${stockStatus.className}`}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-ag-500/10">
                    <div className="flex items-center gap-3 text-xs text-ag-300 font-body">
                      <span>Stock: <span className={product.stock < 10 ? 'text-red-500 font-semibold' : 'text-ag-100'}>{product.stock}</span></span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-fw-300 fill-fw-300" />
                        {product.rating} ({product.reviews})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-ag-300 hover:text-ag-100" asChild>
                        <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${isFlagged ? 'text-red-500' : 'text-ag-300'}`}
                        onClick={() => handleToggleFlag(product.id, product.name)}
                      >
                        <Flag className={`w-4 h-4 ${isFlagged ? 'fill-red-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}