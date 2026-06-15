'use client';

import { ArrowRight, Zap, Truck, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders over $75' },
  { icon: Shield, title: 'Secure Payment', desc: '100% protected checkout' },
  { icon: Clock, title: 'Easy Returns', desc: '30-day return policy' },
  { icon: Zap, title: 'Fast Delivery', desc: '2-5 business days' },
];

export default function PromoBanner() {
  return (
    <section id="promo" className="relative overflow-hidden">
      {/* Main Promo Banner */}
      <div className="gradient-promo py-16 sm:py-20">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2l2 3.5-2 3z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6">
                <Zap className="size-4 text-fw-300" />
                <span className="text-sm font-medium text-fw-400 font-body">Limited Time Offer</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Summer Sale is
                <span className="block text-fw-300">Here!</span>
              </h2>
              <p className="text-lg text-ag-500 font-body mb-8 max-w-lg mx-auto lg:mx-0">
                Up to 50% off on thousands of products from top vendors. Don&apos;t miss out on the best deals this season.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Button className="bg-fw-300 hover:bg-fw-400 text-white rounded-xl px-8 h-12 text-base font-heading font-semibold shadow-lg">
                  Shop the Sale
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 h-12 text-base font-heading font-semibold">
                  View All Deals
                </Button>
              </div>
            </div>

            {/* Right Visual */}
            <div className="flex-1 max-w-md w-full">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                  <div className="font-heading text-4xl font-bold text-fw-300">50%</div>
                  <div className="text-sm text-ag-500 font-body mt-1">Max Discount</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                  <div className="font-heading text-4xl font-bold text-fw-300">5K+</div>
                  <div className="text-sm text-ag-500 font-body mt-1">Items on Sale</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                  <div className="font-heading text-4xl font-bold text-fw-300">48h</div>
                  <div className="text-sm text-ag-500 font-body mt-1">Flash Deals</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                  <div className="font-heading text-4xl font-bold text-fw-300">200+</div>
                  <div className="text-sm text-ag-500 font-body mt-1">Brands</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-white border-b border-ag-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:divide-x divide-ag-500/20">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-3 py-5 px-4 lg:px-8">
                <div className="w-10 h-10 rounded-xl bg-fw-500 flex items-center justify-center shrink-0">
                  <feature.icon className="size-5 text-fw-200" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-ag-100">{feature.title}</h4>
                  <p className="text-xs text-ag-300 font-body">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
