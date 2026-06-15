'use client';

import { Facebook, Twitter, Instagram, Youtube, CreditCard } from 'lucide-react';

const footerSections = [
  {
    title: 'Shop',
    links: ['All Products', 'Categories', 'Deals & Offers', 'New Arrivals', 'Best Sellers'],
  },
  {
    title: 'Vendors',
    links: ['Become a Vendor', 'Vendor Portal', 'Success Stories', 'Vendor Guidelines', 'API Access'],
  },
  {
    title: 'Company',
    links: ['About Us', 'Careers', 'Press', 'Blog', 'Contact'],
  },
  {
    title: 'Support',
    links: ['Help Center', 'Shipping Info', 'Returns & Exchanges', 'Privacy Policy', 'Terms of Service'],
  },
];

const socialLinks = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Youtube, label: 'Youtube', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-ag-100 text-white mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-white font-heading font-bold text-base">A</span>
              </div>
              <span className="font-heading font-bold text-xl tracking-tight">
                Artisan<span className="text-fw-300">Market</span>
              </span>
            </a>

            <p className="text-ag-500 text-sm font-body leading-relaxed mb-6 max-w-xs">
              Your trusted marketplace for unique, handcrafted, and premium products from vendors worldwide.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <social.icon className="size-4 text-ag-400 hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-heading font-semibold text-sm md:text-base text-white mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ag-400 hover:text-white hover:underline underline-offset-4 transition-colors font-body"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-xs text-ag-500 font-body">
              © 2025 ArtisanMarket. All rights reserved.
            </p>

            {/* Payment Methods */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-6 rounded bg-white/10 flex items-center justify-center">
                  <CreditCard className="size-3.5 text-ag-400" />
                </div>
                <div className="w-10 h-6 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold text-ag-400 font-heading">
                  VISA
                </div>
                <div className="w-10 h-6 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold text-ag-400 font-heading">
                  MC
                </div>
                <div className="w-10 h-6 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold text-ag-400 font-heading">
                  AMEX
                </div>
                <div className="w-10 h-6 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold text-ag-400 font-heading">
                  PYPL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}