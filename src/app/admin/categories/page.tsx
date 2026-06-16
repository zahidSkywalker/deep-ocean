'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { categories } from '@/data/categories';
import { useAdminStore } from '@/store/useAdminStore';
import type { Category } from '@/types';
import { toast } from 'sonner';

export default function AdminCategoriesPage() {
  const addCategory = useAdminStore((s) => s.addCategory);
  const updateCategory = useAdminStore((s) => s.updateCategory);
  const deleteCategory = useAdminStore((s) => s.deleteCategory);
  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');

  const openAddForm = () => {
    setEditCategory(null);
    setFormName('');
    setFormSlug('');
    setFormIcon('');
    setFormDescription('');
    setFormImage('');
    setFormOpen(true);
  };

  const openEditForm = (cat: Category) => {
    setEditCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormIcon(cat.icon);
    setFormDescription(cat.description);
    setFormImage(cat.image);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('Category name is required');
      return;
    }
    const slug = formSlug.trim() || formName.trim().toLowerCase().replace(/\s+/g, '-');
    if (editCategory) {
      updateCategory(editCategory.slug, {
        name: formName,
        icon: formIcon,
        description: formDescription,
        image: formImage,
      });
      toast.success(`"${formName}" has been updated`);
    } else {
      addCategory({
        slug,
        name: formName,
        icon: formIcon || 'Package',
        description: formDescription,
        image: formImage,
      });
      toast.success(`"${formName}" has been added`);
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteCategory(deleteTarget.slug);
      toast.success(`"${deleteTarget.name}" has been deleted`);
      setDeleteTarget(null);
    }
  };

  const generateSlug = (name: string) => {
    setFormSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-ag-100">Category Management</h2>
          <p className="text-sm text-ag-300 font-body mt-1">
            {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} on the platform
          </p>
        </div>
        <Button
          onClick={openAddForm}
          className="bg-ag-100 hover:bg-ag-200 text-white font-heading gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {categories.map((cat) => (
          <div key={cat.slug} className="bg-white rounded-2xl shadow-soft overflow-hidden hover-lift">
            {/* Image */}
            <div className="relative h-36 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <h3 className="font-heading font-bold text-white text-sm">{cat.name}</h3>
                <p className="text-white/70 text-xs font-body">/{cat.slug}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs bg-fw-300/10 text-fw-300">
                  <Package className="w-3 h-3 mr-1" />
                  {cat.count.toLocaleString()} products
                </Badge>
                <Badge variant="outline" className="text-xs border-ag-500/30 text-ag-300">
                  {cat.icon}
                </Badge>
              </div>
              <p className="text-xs text-ag-300 font-body line-clamp-2">{cat.description}</p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-ag-500/10">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-ag-300 hover:text-ag-100 font-heading" onClick={() => openEditForm(cat)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-ag-300 hover:text-red-500 font-heading" onClick={() => setDeleteTarget(cat)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditCategory(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-ag-100">
              {editCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription className="font-body">
              {editCategory ? 'Update category information' : 'Create a new product category'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 font-body">
            <div>
              <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Name</label>
              <Input
                value={formName}
                onChange={(e) => { setFormName(e.target.value); if (!editCategory) generateSlug(e.target.value); }}
                placeholder="Category name"
                className="font-body"
              />
            </div>
            <div>
              <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Slug</label>
              <Input
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="auto-generated-slug"
                className="font-body"
              />
              <p className="text-[11px] text-ag-400 mt-1">Auto-generated from name. Edit if needed.</p>
            </div>
            <div>
              <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Icon</label>
              <Input
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                placeholder="e.g. Monitor, Shirt, Sparkles"
                className="font-body"
              />
            </div>
            <div>
              <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Description</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief category description"
                className="font-body"
              />
            </div>
            <div>
              <label className="text-xs font-heading text-ag-200 uppercase tracking-wider mb-1.5 block">Image URL</label>
              <Input
                value={formImage}
                onChange={(e) => setFormImage(e.target.value)}
                placeholder="https://..."
                className="font-body"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="font-heading" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-ag-100 hover:bg-ag-200 text-white font-heading" onClick={handleSave}>
              {editCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Category</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This will affect all products in this category.
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