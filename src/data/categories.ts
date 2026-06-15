import type { Category } from '@/types';

export const categories: Category[] = [
  {
    slug: 'electronics',
    name: 'Electronics',
    icon: 'Monitor',
    count: 2840,
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop',
    description: 'Cutting-edge gadgets, audio equipment, smart devices, and premium tech accessories from trusted vendors.',
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    icon: 'Shirt',
    count: 5120,
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
    description: 'Curated apparel, bags, and accessories from sustainable and artisan fashion brands.',
  },
  {
    slug: 'home-living',
    name: 'Home & Living',
    icon: 'Lamp',
    count: 3260,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    description: 'Handcrafted home décor, furniture, candles, and essentials to elevate your living space.',
  },
  {
    slug: 'beauty',
    name: 'Beauty',
    icon: 'Sparkles',
    count: 1890,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
    description: 'Natural and organic skincare, beauty kits, and wellness products from top brands.',
  },
  {
    slug: 'sports',
    name: 'Sports',
    icon: 'Dumbbell',
    count: 2150,
    image: 'https://images.unsplash.com/photo-1461896836934-bd45ba8a0a71?w=400&h=400&fit=crop',
    description: 'Fitness gear, water bottles, and performance wearables for an active lifestyle.',
  },
  {
    slug: 'books',
    name: 'Books',
    icon: 'BookOpen',
    count: 4670,
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop',
    description: 'Bestselling books, journals, and educational materials across all genres.',
  },
  {
    slug: 'toys',
    name: 'Toys',
    icon: 'Gamepad2',
    count: 1240,
    image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=400&fit=crop',
    description: 'Fun and educational toys, games, and collectibles for all ages.',
  },
  {
    slug: 'garden',
    name: 'Garden',
    icon: 'Flower2',
    count: 980,
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
    description: 'Plants, planters, macramé, and garden essentials for green thumbs and plant lovers.',
  },
];

export const categorySlugMap: Record<string, string> = categories.reduce(
  (acc, cat) => {
    acc[cat.name] = cat.slug;
    return acc;
  },
  {} as Record<string, string>
);