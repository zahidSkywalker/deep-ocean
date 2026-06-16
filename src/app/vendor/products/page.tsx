'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useVendorStore } from '@/store/useVendorStore';
import { ProductFormDialog } from '@/components/vendor/ProductFormDialog';
import { categories } from '@/data/categories';
import type { Product } from '@/types';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'active' | 'draft' | 'out-of-stock';

function getProductStatus(product: Product): 'active' | 'out-of-stock' {
  return product.stock > 0 ? 'active' : 'out-of-stock';
}

export default function VendorProductsPage() {
  const vendorProducts = useVendorStore((s) => s.vendorProducts);
  const deleteProduct = useVendorStore((s) => s.deleteProduct);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return vendorProducts.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const status = getProductStatus(p);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [vendorProducts, search, categoryFilter, statusFilter]);

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" has been deleted`);
      setDeleteTarget(null);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditProduct(null);
  };

  const getCategoryName = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.name ?? slug;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-ag-100">Products</h2>
          <p className="text-sm text-ag-300 font-body mt-1">
            {vendorProducts.length} product{vendorProducts.length !== 1 ? 's' : ''} in your store
          </p>
        </div>
        <Button
          onClick={() => {
            setEditProduct(null);
            setFormOpen(true);
          }}
          className="bg-ag-100 hover:bg-ag-200 text-white font-heading gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
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
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-36 font-body">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table (desktop) / Cards (mobile) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <p className="text-lg font-medium text-ag-200 font-body">No products found</p>
          <p className="text-sm text-ag-300 font-body mt-1">Try adjusting your filters or add a new product</p>
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
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Price</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Stock</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Rating</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 font-heading font-semibold text-ag-200 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ag-500/10">
                  {filteredProducts.map((product) => {
                    const status = getProductStatus(product);
                    return (
                      <tr key={product.id} className="hover:bg-ag-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-ag-100 font-body truncate max-w-[200px]">{product.name}</p>
                              <p className="text-xs text-ag-300 font-body">SKU: {product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-ag-200 font-body text-xs">{getCategoryName(product.category)}</td>
                        <td className="py-3 px-3">
                          <div>
                            <span className="font-semibold text-ag-100 font-heading">${product.price.toFixed(2)}</span>
                            {product.originalPrice && (
                              <span className="text-xs text-ag-300 line-through ml-1.5">${product.originalPrice.toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-body ${product.stock < 10 ? 'text-red-500 font-semibold' : 'text-ag-100'}`}>
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
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {status === 'active' ? 'Active' : 'Out of Stock'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-ag-300 hover:text-ag-100 hover:bg-ag-800/50"
                              onClick={() => handleEdit(product)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-ag-300 hover:text-red-500 hover:bg-red-50"
                              onClick={() => setDeleteTarget(product)}
                            >
                              <Trash2 className="w-4 h-4" />
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
              const status = getProductStatus(product);
              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-soft p-4">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ag-100 font-body text-sm truncate">{product.name}</p>
                      <p className="text-xs text-ag-300 font-body mt-0.5">{getCategoryName(product.category)}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-semibold text-ag-100 font-heading text-sm">${product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-ag-300 line-through">${product.originalPrice.toFixed(2)}</span>
                        )}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ml-auto ${
                            status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {status === 'active' ? 'Active' : 'Out of Stock'}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-ag-300 hover:text-ag-100"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-ag-300 hover:text-red-500"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit Form Dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editProduct={editProduct}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-heading">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-heading"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}