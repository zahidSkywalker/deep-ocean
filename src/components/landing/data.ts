export const categories = [
  { name: "Electronics", icon: "Monitor", count: 2840, image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop" },
  { name: "Fashion", icon: "Shirt", count: 5120, image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop" },
  { name: "Home & Living", icon: "Lamp", count: 3260, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop" },
  { name: "Beauty", icon: "Sparkles", count: 1890, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop" },
  { name: "Sports", icon: "Dumbbell", count: 2150, image: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a71?w=400&h=400&fit=crop" },
  { name: "Books", icon: "BookOpen", count: 4670, image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop" },
  { name: "Toys", icon: "Gamepad2", count: 1240, image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=400&fit=crop" },
  { name: "Garden", icon: "Flower2", count: 980, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop" },
];

export interface Product {
  id: number;
  name: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
}

export const featuredProducts: Product[] = [
  { id: 1, name: "Wireless Noise-Canceling Headphones", vendor: "SoundWave Audio", price: 189.99, originalPrice: 249.99, rating: 4.8, reviews: 342, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", badge: "Best Seller" },
  { id: 2, name: "Organic Cotton Oversized Tee", vendor: "NaturWear Co.", price: 45.00, rating: 4.6, reviews: 128, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop" },
  { id: 3, name: "Handcrafted Ceramic Vase Set", vendor: "Earth & Clay Studio", price: 78.50, originalPrice: 95.00, rating: 4.9, reviews: 87, image: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400&h=400&fit=crop", badge: "New" },
  { id: 4, name: "Premium Skincare Essential Kit", vendor: "Glow Botanics", price: 124.00, rating: 4.7, reviews: 215, image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop", badge: "Hot" },
  { id: 5, name: "Smart Fitness Watch Pro", vendor: "FitTech Labs", price: 299.99, originalPrice: 349.99, rating: 4.5, reviews: 456, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop" },
  { id: 6, name: "Artisan Leather Crossbody Bag", vendor: "Heritage Crafts", price: 165.00, rating: 4.8, reviews: 93, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop", badge: "Handmade" },
  { id: 7, name: "Bamboo Desk Organizer Set", vendor: "ZenHome Goods", price: 56.00, originalPrice: 72.00, rating: 4.4, reviews: 162, image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&h=400&fit=crop" },
  { id: 8, name: "Natural Soy Wax Candle Trio", vendor: "Lumière Studio", price: 38.00, rating: 4.9, reviews: 74, image: "https://images.unsplash.com/photo-1602607374402-9769c8286d3d?w=400&h=400&fit=crop", badge: "Trending" },
];

export const trendingProducts: Product[] = [
  { id: 9, name: "Minimalist Analog Watch", vendor: "TimeCraft Watches", price: 220.00, originalPrice: 280.00, rating: 4.7, reviews: 189, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop", badge: "Trending" },
  { id: 10, name: "Vintage Denim Jacket", vendor: "RetroThread Co.", price: 135.00, rating: 4.6, reviews: 97, image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=400&fit=crop" },
  { id: 11, name: "Portable Bluetooth Speaker", vendor: "BassWave Audio", price: 79.99, rating: 4.5, reviews: 334, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop", badge: "Sale" },
  { id: 12, name: "Handmade Macrame Wall Hanging", vendor: "Boho Artisan", price: 65.00, rating: 4.8, reviews: 58, image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=400&fit=crop" },
  { id: 13, name: "Stainless Steel Water Bottle", vendor: "EcoLife Essentials", price: 32.00, originalPrice: 42.00, rating: 4.4, reviews: 412, image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop" },
  { id: 14, name: "Scented Essential Oil Diffuser", vendor: "AromaZen Home", price: 49.99, rating: 4.7, reviews: 156, image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop", badge: "Popular" },
  { id: 15, name: "Organic Matcha Powder Set", vendor: "Leaf & Bowl", price: 28.50, rating: 4.9, reviews: 203, image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=400&fit=crop", badge: "Organic" },
  { id: 16, name: "Wool Blend Knit Throw", vendor: "CozyNest Living", price: 89.00, originalPrice: 110.00, rating: 4.6, reviews: 78, image: "https://images.unsplash.com/photo-1580301762395-21ce6d555b43?w=400&h=400&fit=crop" },
];

export interface Vendor {
  id: number;
  name: string;
  description: string;
  productCount: number;
  rating: number;
  logo: string;
  cover: string;
  tag: string;
}

export const vendors: Vendor[] = [
  { id: 1, name: "SoundWave Audio", description: "Premium audio equipment crafted for audiophiles", productCount: 124, rating: 4.9, logo: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=100&h=100&fit=crop", cover: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=300&fit=crop", tag: "Top Rated" },
  { id: 2, name: "Earth & Clay Studio", description: "Handmade ceramics and pottery from local artisans", productCount: 86, rating: 4.8, logo: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=100&h=100&fit=crop", cover: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=600&h=300&fit=crop", tag: "Artisan" },
  { id: 3, name: "NaturWear Co.", description: "Sustainable fashion made from organic materials", productCount: 215, rating: 4.7, logo: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop", cover: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=300&fit=crop", tag: "Eco-Friendly" },
  { id: 4, name: "Glow Botanics", description: "Natural skincare and beauty products", productCount: 152, rating: 4.8, logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=100&h=100&fit=crop", cover: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=300&fit=crop", tag: "Organic" },
  { id: 5, name: "Heritage Crafts", description: "Premium leather goods handcrafted with care", productCount: 67, rating: 4.9, logo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100&h=100&fit=crop", cover: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=600&h=300&fit=crop", tag: "Handmade" },
  { id: 6, name: "FitTech Labs", description: "Innovative fitness technology and wearables", productCount: 93, rating: 4.6, logo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop", cover: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=300&fit=crop", tag: "Innovation" },
];

export const navLinks = [
  { label: "Categories", href: "#categories" },
  { label: "Vendors", href: "#vendors" },
  { label: "Deals", href: "#promo" },
  { label: "About", href: "#newsletter" },
];
