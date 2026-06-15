'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ShoppingCart, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useCartStore, getTotalItems } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { navLinks } from './data';

function AnnouncementBar() {
  return (
    <div className="gradient-announce text-white text-center py-2 px-4 text-sm font-medium font-body">
      <div className="flex items-center justify-center gap-2">
        <span className="hidden sm:inline">🎉</span>
        <span>Free shipping on orders over $75 — Use code <strong>WELCOME15</strong> for 15% off your first order!</span>
        <span className="hidden sm:inline">🎉</span>
      </div>
    </div>
  );
}

function DesktopNav() {
  return (
    <nav className="hidden lg:flex items-center gap-2">
      {navLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="px-4 py-2 text-sm font-medium text-ag-200 hover:text-ag-100 hover:bg-ag-800/50 rounded-lg transition-colors font-heading"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden text-ag-200 hover:text-ag-100 hover:bg-ag-800/50">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-fw-500 border-r border-ag-500/50 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-ag-500/30">
          <SheetTitle className="font-heading text-xl text-ag-100">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigation menu</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col p-4 gap-1">
          {navLinks.map((link) => (
            <SheetClose asChild key={link.label}>
              <a
                href={link.href}
                className="px-4 py-3 text-base font-medium text-ag-200 hover:text-ag-100 hover:bg-ag-800/50 rounded-xl transition-colors font-heading"
              >
                {link.label}
              </a>
            </SheetClose>
          ))}
          <MobileAuthButtons />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-xl mx-6 lg:mx-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ag-300 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search products, vendors, categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-11 pl-11 pr-4 bg-white border-ag-500/60 rounded-xl text-sm font-body placeholder:text-ag-400 focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
        />
      </div>
    </form>
  );
}

function MobileAuthButtons() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <>
      <div className="mt-4 pt-4 border-t border-ag-500/30 px-4">
        <SheetClose asChild>
          <Button asChild className="w-full bg-ag-100 hover:bg-ag-200 text-white rounded-xl font-heading">
            <Link href={isAuthenticated ? '/account' : '/login'}>
              {isAuthenticated ? 'My Account' : 'Sign In'}
            </Link>
          </Button>
        </SheetClose>
      </div>
      {!isAuthenticated && (
        <div className="mt-3 px-4">
          <SheetClose asChild>
            <Button asChild variant="outline" className="w-full border-ag-400 text-ag-200 hover:bg-ag-800/50 rounded-xl font-heading">
              <Link href="/register">Register</Link>
            </Button>
          </SheetClose>
        </div>
      )}
    </>
  );
}

function HeaderIcons() {
  const items = useCartStore((s) => s.items);
  const totalItems = getTotalItems(items);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild className="relative text-ag-200 hover:text-ag-100 hover:bg-ag-800/50">
        <Link href="/cart">
          <ShoppingCart className="size-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-fw-300 text-white text-[10px] font-bold rounded-full border-2 border-fw-500">
              {totalItems > 99 ? '99+' : totalItems}
            </Badge>
          )}
          <span className="sr-only">Cart</span>
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild className="text-ag-200 hover:text-ag-100 hover:bg-ag-800/50">
        <Link href={isAuthenticated ? '/account' : '/login'}>
          <User className="size-5" />
          <span className="sr-only">Account</span>
        </Link>
      </Button>
    </div>
  );
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      <AnnouncementBar />
      <div
        className={`transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-soft-md'
            : 'bg-white shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
          <div className="flex items-center justify-between h-18 md:h-20">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-ag-100 rounded-lg flex items-center justify-center">
                <span className="text-white font-heading font-bold text-base">A</span>
              </div>
              <span className="font-heading font-bold text-xl text-ag-100 tracking-tight hidden sm:block">
                Artisan<span className="text-fw-300">Market</span>
              </span>
            </a>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 justify-center">
              <SearchBar />
            </div>

            {/* Desktop Nav */}
            <DesktopNav />

            {/* Right Icons */}
            <div className="flex items-center gap-1">
              <HeaderIcons />
              <MobileNav />
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-4">
            <SearchBar />
          </div>
        </div>
      </div>
    </header>
  );
}