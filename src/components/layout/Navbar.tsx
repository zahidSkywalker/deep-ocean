'use client';

import { useLabStore } from '@/store/useLabStore';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from './LanguageToggle';

export function Navbar() {
  const { currentView, goBack, language } = useLabStore();

  return (
    <nav
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-md"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
    >
      <div className="flex items-center gap-2">
        {currentView !== 'dashboard' ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="h-9 w-9 min-h-9 min-w-9"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FlaskConical className="h-4 w-4 text-primary" />
            </div>
          </div>
        )}
        <h1 className="text-sm font-semibold sm:text-base">
          {currentView === 'simulation'
            ? language === 'en' ? 'Simulation' : 'সিমুলেশন'
            : currentView === 'quiz'
              ? language === 'en' ? 'Quiz' : 'কুইজ'
              : 'NCTB Physics Lab'}
        </h1>
      </div>

      <LanguageToggle />
    </nav>
  );
}
