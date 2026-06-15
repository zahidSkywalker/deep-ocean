'use client';

import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { categories } from '@/data';

interface SearchFiltersProps {
  selectedCategories: string[];
  onCategoryChange: (slug: string, checked: boolean) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  minRating: number | null;
  onRatingChange: (rating: number | null) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

function RatingOption({
  rating,
  label,
  selected,
  onClick,
}: {
  rating: number;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-body transition-colors ${
        selected
          ? 'bg-fw-500 text-fw-100'
          : 'text-ag-200 hover:bg-ag-800'
      }`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`size-4 ${
              star <= rating
                ? 'fill-fw-300 text-fw-300'
                : 'fill-ag-500 text-ag-500'
            }`}
          />
        ))}
      </div>
      <span>& Up</span>
    </button>
  );
}

export default function SearchFilters({
  selectedCategories,
  onCategoryChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  minRating,
  onRatingChange,
  onClearAll,
  hasActiveFilters,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-base text-ag-100">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-ag-300 hover:text-ag-100 h-8 px-2"
          >
            <X className="size-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <Separator className="bg-ag-500/30" />

      {/* Categories */}
      <div>
        <h4 className="font-heading font-semibold text-sm text-ag-100 mb-4">
          Category
        </h4>
        <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto">
          {categories.map((cat) => (
            <label
              key={cat.slug}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={selectedCategories.includes(cat.slug)}
                onCheckedChange={(checked) =>
                  onCategoryChange(cat.slug, !!checked)
                }
                className="border-ag-400 data-[state=checked]:bg-ag-100 data-[state=checked]:border-ag-100 size-4"
              />
              <span className="text-sm font-body text-ag-200 group-hover:text-ag-100 transition-colors">
                {cat.name}
              </span>
              <span className="text-xs text-ag-400 font-body ml-auto">
                {cat.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator className="bg-ag-500/30" />

      {/* Price Range */}
      <div>
        <h4 className="font-heading font-semibold text-sm text-ag-100 mb-4">
          Price Range
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs text-ag-300 font-body mb-1.5 block">Min</Label>
            <Input
              type="number"
              placeholder="$0"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="h-11 text-sm font-body bg-white border-ag-500/40 rounded-xl"
            />
          </div>
          <span className="text-ag-400 mt-5">—</span>
          <div className="flex-1">
            <Label className="text-xs text-ag-300 font-body mb-1.5 block">Max</Label>
            <Input
              type="number"
              placeholder="Any"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="h-11 text-sm font-body bg-white border-ag-500/40 rounded-xl"
            />
          </div>
        </div>
      </div>

      <Separator className="bg-ag-500/30" />

      {/* Rating */}
      <div>
        <h4 className="font-heading font-semibold text-sm text-ag-100 mb-4">
          Rating
        </h4>
        <div className="flex flex-col gap-1.5">
          {[4, 3, 2, 1].map((rating) => (
            <RatingOption
              key={rating}
              rating={rating}
              label={`${rating} & Up`}
              selected={minRating === rating}
              onClick={() => onRatingChange(minRating === rating ? null : rating)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}