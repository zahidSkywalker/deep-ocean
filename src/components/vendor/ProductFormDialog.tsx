'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categories } from '@/data/categories';
import { useVendorStore } from '@/store/useVendorStore';
import type { Product } from '@/types';
import { toast } from 'sonner';

const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0.01, 'Price must be positive'),
  originalPrice: z.coerce.number().optional(),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  tags: z.string(),
  imageUrls: z.string(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProduct?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, editProduct }: ProductFormDialogProps) {
  const currentVendor = useVendorStore((s) => s.currentVendor);
  const addProduct = useVendorStore((s) => s.addProduct);
  const updateProduct = useVendorStore((s) => s.updateProduct);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: editProduct
      ? {
          name: editProduct.name,
          description: editProduct.description,
          category: editProduct.category,
          price: editProduct.price,
          originalPrice: editProduct.originalPrice ?? undefined,
          stock: editProduct.stock,
          sku: editProduct.sku,
          tags: editProduct.tags.join(', '),
          imageUrls: editProduct.images.join(', '),
        }
      : {
          name: '',
          description: '',
          category: '',
          price: 0,
          originalPrice: undefined,
          stock: 0,
          sku: '',
          tags: '',
          imageUrls: '',
        },
  });

  const isEditing = !!editProduct;

  const onSubmit = (data: ProductFormValues) => {
    const images = data.imageUrls
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    if (isEditing && editProduct) {
      updateProduct(editProduct.id, {
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price,
        originalPrice: data.originalPrice || undefined,
        stock: data.stock,
        sku: data.sku,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
        images: images.length > 0 ? images : editProduct.images,
        image: images[0] ?? editProduct.image,
      });
      toast.success('Product updated successfully');
    } else {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newProduct = addProduct({
        name: data.name,
        slug,
        description: data.description,
        category: data.category,
        vendorId: currentVendor?.id ?? 1,
        vendor: currentVendor?.name ?? 'Vendor',
        price: data.price,
        originalPrice: data.originalPrice || undefined,
        rating: 0,
        reviews: 0,
        image: images[0] ?? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'],
        stock: data.stock,
        sku: data.sku,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
        specifications: [],
        createdAt: new Date().toISOString().split('T')[0],
      });
      toast.success(`"${newProduct.name}" added successfully`);
    }

    onOpenChange(false);
    reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-heading text-xl text-ag-100">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </SheetTitle>
          <SheetDescription className="font-body">
            {isEditing ? 'Update product details below.' : 'Fill in the details to add a new product.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-heading text-sm text-ag-100">Product Name</Label>
            <Input
              id="name"
              placeholder="e.g. Handcrafted Ceramic Vase"
              className="font-body"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500 font-body">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-heading text-sm text-ag-100">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your product..."
              rows={4}
              className="font-body"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500 font-body">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm text-ag-100">Category</Label>
            <Select
              defaultValue={editProduct?.category}
              onValueChange={(val) => setValue('category', val, { shouldValidate: true })}
            >
              <SelectTrigger className="font-body">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-red-500 font-body">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="font-heading text-sm text-ag-100">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="font-body"
                {...register('price')}
              />
              {errors.price && <p className="text-xs text-red-500 font-body">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalPrice" className="font-heading text-sm text-ag-100">Original Price ($)</Label>
              <Input
                id="originalPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                className="font-body"
                {...register('originalPrice')}
              />
              {errors.originalPrice && <p className="text-xs text-red-500 font-body">{errors.originalPrice.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock" className="font-heading text-sm text-ag-100">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                placeholder="0"
                className="font-body"
                {...register('stock')}
              />
              {errors.stock && <p className="text-xs text-red-500 font-body">{errors.stock.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku" className="font-heading text-sm text-ag-100">SKU</Label>
              <Input
                id="sku"
                placeholder="e.g. PROD-001"
                className="font-body"
                {...register('sku')}
              />
              {errors.sku && <p className="text-xs text-red-500 font-body">{errors.sku.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="font-heading text-sm text-ag-100">Tags</Label>
            <Input
              id="tags"
              placeholder="handmade, ceramic, artisan (comma-separated)"
              className="font-body"
              {...register('tags')}
            />
            {errors.tags && <p className="text-xs text-red-500 font-body">{errors.tags.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrls" className="font-heading text-sm text-ag-100">Image URLs</Label>
            <Textarea
              id="imageUrls"
              placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              rows={3}
              className="font-body"
              {...register('imageUrls')}
            />
            {errors.imageUrls && <p className="text-xs text-red-500 font-body">{errors.imageUrls.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-heading"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-ag-100 hover:bg-ag-200 text-white font-heading"
              disabled={isSubmitting}
            >
              {isEditing ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}