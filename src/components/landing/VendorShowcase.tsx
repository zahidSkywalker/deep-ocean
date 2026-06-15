'use client';

import { Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { vendors } from './data';

function VendorCard({ vendor }: { vendor: typeof vendors[0] }) {
  const tagColors: Record<string, string> = {
    'Top Rated': 'bg-fw-300 text-white',
    'Artisan': 'bg-ac-200 text-white',
    'Eco-Friendly': 'bg-ag-300 text-white',
    'Organic': 'bg-ac-300 text-white',
    'Handmade': 'bg-fw-200 text-white',
    'Innovation': 'bg-ag-100 text-white',
  };

  return (
    <div className="group flex-shrink-0 w-[300px] sm:w-[340px] md:w-[360px] bg-white rounded-2xl border border-ag-500/20 overflow-hidden hover-lift shadow-soft">
      {/* Cover Image */}
      <div className="relative h-28 overflow-hidden">
        <img
          src={vendor.cover}
          alt={`${vendor.name} cover`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <Badge className={`absolute top-3 right-3 text-[10px] font-heading font-semibold px-2 py-0.5 rounded-md ${tagColors[vendor.tag] || 'bg-ag-100 text-white'}`}>
          {vendor.tag}
        </Badge>
      </div>

      {/* Vendor Info */}
      <div className="p-5 md:p-6 pt-3 -mt-6 relative">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-white border-2 border-white shadow-soft-md overflow-hidden mb-3">
          <img
            src={vendor.logo}
            alt={`${vendor.name} logo`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <h3 className="font-heading font-semibold text-base text-ag-100 mb-1.5 truncate">
          {vendor.name}
        </h3>
        <p className="text-xs md:text-sm text-ag-300 font-body line-clamp-2 mb-3 leading-relaxed">
          {vendor.description}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="size-3.5 fill-fw-300 text-fw-300" />
            <span className="text-sm font-semibold text-ag-100 font-heading">{vendor.rating}</span>
            <span className="text-xs text-ag-300 font-body">({vendor.productCount} products)</span>
          </div>
          <Button variant="ghost" size="sm" className="text-fw-200 hover:text-fw-100 hover:bg-fw-500/50 text-xs font-heading font-medium h-8 px-3">
            Visit
            <ArrowRight className="size-3 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VendorShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section id="vendors" className="py-20 md:py-28 bg-ag-900">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-ag-100 mb-3">
              Featured Vendors
            </h2>
            <p className="text-ag-300 font-body max-w-md">
              Meet the talented sellers behind our curated marketplace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-ag-400 text-ag-200 hover:bg-white/50 rounded-xl"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-ag-400 text-ag-200 hover:bg-white/50 rounded-xl"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Vendor Cards Horizontal Scroll */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6"
        >
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </div>
    </section>
  );
}