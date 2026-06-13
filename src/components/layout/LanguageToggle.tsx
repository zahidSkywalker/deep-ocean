'use client';

import { useLabStore } from '@/store/useLabStore';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { language, setLanguage } = useLabStore();

  return (
    <div className="flex items-center rounded-full border border-border/50 bg-muted/50 p-0.5">
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-all min-h-[32px]',
          language === 'en'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('bn')}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-all min-h-[32px]',
          language === 'bn'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        বাং
      </button>
    </div>
  );
}
