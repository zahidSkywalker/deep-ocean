'use client';

import { useLabStore } from '@/store/useLabStore';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function DashboardHero() {
  const { language, searchQuery, setSearchQuery, classFilter, setClassFilter } = useLabStore();

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            NCTB Physics Lab
          </span>
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {language === 'en'
            ? 'Interactive 3D Simulations for Bangladesh Curriculum'
            : 'বাংলাদেশ পাঠ্যক্রমের জন্য ইন্টারেক্টিভ ৩ডি সিমুলেশন'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={language === 'en' ? 'Search simulations...' : 'সিমুলেশন খুঁজুন...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="search"
          className="w-full"
        />
      </div>

      {/* Class Filter Pills */}
      <div className="flex gap-2">
        {(['all', '9-10', '11-12'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setClassFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all min-h-[32px] ${
              classFilter === filter
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            {filter === 'all'
              ? language === 'en' ? 'All' : 'সব'
              : filter === '9-10'
                ? language === 'en' ? 'Class 9-10' : 'শ্রেণি ৯-১০'
                : language === 'en' ? 'Class 11-12' : 'শ্রেণি ১১-১২'}
          </button>
        ))}
      </div>
    </div>
  );
}
