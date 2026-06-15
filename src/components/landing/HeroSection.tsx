'use client';

import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const stats = [
  { value: '12K+', label: 'Products' },
  { value: '850+', label: 'Vendors' },
  { value: '50K+', label: 'Happy Customers' },
  { value: '99%', label: 'Satisfaction' },
];

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <section className="relative overflow-hidden gradient-hero">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232b3027' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-fw-300/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-ac-300/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-24 md:py-32 lg:py-40">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-ag-500/30 rounded-full px-5 py-2 mb-8">
            <Sparkles className="size-4 text-fw-300" />
            <span className="text-sm font-medium text-ag-200 font-body">Discover curated products from 850+ vendors</span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-ag-100 leading-tight mb-4">
            Your Marketplace for
            <span className="block text-fw-200 mt-1">Unique Finds</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-ag-200 mb-10 font-body leading-relaxed max-w-2xl mx-auto">
            Explore handcrafted goods, premium products, and exclusive items from trusted vendors around the world.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-12">
            <div className="flex items-center bg-white rounded-2xl shadow-soft-lg border border-ag-500/30 overflow-hidden">
              <Search className="size-5 text-ag-400 ml-5 shrink-0" />
              <Input
                type="text"
                placeholder="What are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-16 px-4 border-0 rounded-none shadow-none text-base font-body placeholder:text-ag-400 focus-visible:ring-0 focus-visible:border-0"
              />
              <Button className="m-2 bg-ag-100 hover:bg-ag-200 text-white rounded-xl px-6 h-12 font-heading font-semibold shrink-0">
                Search
              </Button>
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-sm text-ag-300 font-body">Popular:</span>
              {['Electronics', 'Fashion', 'Home Decor', 'Beauty'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="text-sm px-3 py-1 bg-white/70 hover:bg-white text-ag-200 hover:text-ag-100 rounded-full border border-ag-500/30 transition-colors font-body"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button className="bg-fw-300 hover:bg-fw-200 text-white rounded-xl px-8 h-12 text-base font-heading font-semibold shadow-soft-md">
              Start Shopping
              <ArrowRight className="size-4 ml-1" />
            </Button>
            <Button variant="outline" className="border-ag-400 text-ag-200 hover:bg-white/50 rounded-xl px-8 h-12 text-base font-heading font-semibold">
              Become a Vendor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 sm:mt-24 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 max-w-3xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 md:p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-ag-500/20">
              <div className="font-heading text-2xl md:text-3xl font-bold text-ag-100">{stat.value}</div>
              <div className="text-sm text-ag-300 font-body mt-1.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}