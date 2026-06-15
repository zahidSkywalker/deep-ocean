'use client';

import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import CategoryGrid from '@/components/landing/CategoryGrid';
import { ProductSection } from '@/components/landing/ProductSection';
import VendorShowcase from '@/components/landing/VendorShowcase';
import PromoBanner from '@/components/landing/PromoBanner';
import NewsletterSection from '@/components/landing/NewsletterSection';
import Footer from '@/components/landing/Footer';
import { featuredProducts, trendingProducts } from '@/components/landing/data';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-fw-500">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <CategoryGrid />
        <ProductSection
          id="featured"
          title="Featured Products"
          subtitle="Hand-picked favorites from our top vendors — quality guaranteed"
          products={featuredProducts}
        />
        <VendorShowcase />
        <PromoBanner />
        <ProductSection
          id="trending"
          title="Trending Now"
          subtitle="What everyone's loving — discover the hottest products this week"
          products={trendingProducts}
        />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
}
