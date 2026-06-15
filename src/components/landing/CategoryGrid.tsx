'use client';

import Link from 'next/link';
import { categories } from './data';
import {
  Monitor,
  Shirt,
  Lamp,
  Sparkles,
  Dumbbell,
  BookOpen,
  Gamepad2,
  Flower2,
  ArrowRight,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Monitor, Shirt, Lamp, Sparkles, Dumbbell, BookOpen, Gamepad2, Flower2,
};

function CategoryCard({ category, index }: { category: typeof categories[0]; index: number }) {
  const Icon = iconMap[category.icon] || Sparkles;
  const href = category.slug ? `/search?category=${category.slug}` : '#';

  return (
    <Link href={href}>
      <div
        className="group relative flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-ag-500/20 hover-lift shadow-soft cursor-pointer h-full"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Icon container */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${
          index % 3 === 0 ? 'bg-fw-500' : index % 3 === 1 ? 'bg-ag-800' : 'bg-ac-800'
        }`}
        >
          <Icon
            className={`size-7 transition-colors duration-300 ${
              index % 3 === 0 ? 'text-fw-300' : index % 3 === 1 ? 'text-ag-300' : 'text-ac-300'
            }`}
          />
        </div>

        <h3 className="font-heading font-semibold text-ag-100 text-sm mb-1 group-hover:text-fw-200 transition-colors">
          {category.name}
        </h3>
        <p className="text-xs text-ag-300 font-body">
          {category.count.toLocaleString()} products
        </p>

        {/* Hover arrow */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ArrowRight className="size-4 text-fw-300" />
        </div>
      </div>
    </Link>
  );
}

export default function CategoryGrid() {
  return (
    <section id="categories" className="py-16 sm:py-20 bg-fw-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ag-100 mb-3">
            Shop by Category
          </h2>
          <p className="text-ag-300 font-body max-w-lg mx-auto">
            Browse our curated categories and find exactly what you&apos;re looking for
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category, index) => (
            <CategoryCard key={category.name} category={category} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}