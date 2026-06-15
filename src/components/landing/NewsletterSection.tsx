'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@')) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
      }, 3000);
    }
  };

  return (
    <section id="newsletter" className="relative py-20 md:py-28 bg-fw-500 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-ag-500/30 to-transparent" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-ac-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-fw-400/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-ac-400/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="size-7 text-ac-200" />
          </div>

          <h2 className="font-heading text-3xl md:text-4xl font-bold text-ag-100 mb-3">
            Stay in the Loop
          </h2>
          <p className="text-ag-300 font-body mb-8 max-w-lg mx-auto leading-relaxed">
            Subscribe to our newsletter for exclusive deals, new arrivals, and insider tips from our top vendors.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ag-400 pointer-events-none" />
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-13 pl-11 pr-4 bg-white border-ag-500/60 rounded-xl text-sm font-body placeholder:text-ag-400 focus-visible:ring-fw-300/30 focus-visible:border-fw-300"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitted}
              className={`h-13 px-6 rounded-xl font-heading font-semibold shrink-0 transition-all ${
                isSubmitted
                  ? 'bg-ag-300 text-white'
                  : 'bg-ag-100 hover:bg-ag-200 text-white'
              }`}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle className="size-4 mr-1.5" />
                  Subscribed!
                </>
              ) : (
                <>
                  <Send className="size-4 mr-1.5" />
                  Subscribe
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-ag-400 font-body mt-5">
            No spam, ever. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
}