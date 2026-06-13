'use client';

import { ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, RotateCcw, Play, Pause, HelpCircle, X } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';
import { getTopicById } from '@/lib/topics';
import { ControlsPanel } from './ControlsPanel';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SimulationContainerProps {
  topicId: string;
  children: ReactNode;
  liveValues?: { label: string; value: string; unit?: string }[];
  formulas?: { name: string; expression: string }[];
}

export function SimulationContainer({
  topicId,
  children,
  liveValues = [],
  formulas = [],
}: SimulationContainerProps) {
  const {
    language,
    isPlaying,
    togglePlay,
    isSettingsOpen,
    toggleSettings,
    setSettingsOpen,
    goBack,
    setView,
  } = useLabStore();

  const router = useRouter();
  const topic = getTopicById(topicId);

  const handleBack = useCallback(() => {
    goBack();
    router.push('/');
  }, [goBack, router]);

  const handleQuiz = useCallback(() => {
    setView('quiz');
  }, [setView]);

  const handleReset = useCallback(() => {
    useLabStore.getState().resetParams(topicId);
  }, [topicId]);

  const sortedLiveValues = useMemo(() => liveValues.slice(0, 3), [liveValues]);

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row overflow-hidden">
      {/* Canvas Area */}
      <div className="relative flex-1 min-h-0">
        {children}

        {/* Top-left: Back button */}
        <button
          onClick={handleBack}
          className="glass absolute left-3 top-3 z-10 flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Top-right: Quiz button */}
        {topic && topic.quizQuestions.length > 0 && (
          <button
            onClick={handleQuiz}
            className="glass absolute right-3 top-3 z-10 flex h-12 items-center gap-2 rounded-full px-4 transition-all active:scale-95 min-h-[48px]"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {language === 'en' ? 'Quiz' : 'কুইজ'}
            </span>
          </button>
        )}

        {/* Desktop live values (top-left, below back button) */}
        {sortedLiveValues.length > 0 && (
          <div className="glass absolute left-3 top-16 z-10 hidden rounded-lg p-2 lg:block">
            <div className="space-y-1">
              {sortedLiveValues.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{v.label}:</span>
                  <span className="font-mono font-medium text-primary">
                    {v.value}
                    {v.unit && <span className="text-muted-foreground ml-0.5">{v.unit}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom-center: Playback controls */}
        <div className="pill-bar absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 p-1">
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-all active:scale-95 hover:bg-white/10"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-all active:scale-95 hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={toggleSettings}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-all active:scale-95 hover:bg-white/10"
          >
            <Settings className={`h-4 w-4 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sheet / Desktop Right Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-20 bg-black/50 lg:hidden"
              onClick={() => setSettingsOpen(false)}
            />

            {/* Settings Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-30 max-h-[45vh] rounded-t-2xl border-t border-border/50 bg-card shadow-2xl lg:static lg:inset-auto lg:flex lg:w-80 lg:max-w-80 lg:flex-col lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
              }}
            >
              {/* Mobile drag handle + header */}
              <div className="flex items-center justify-between border-b border-border/50 p-3">
                <div className="flex items-center gap-2">
                  {/* Mobile drag handle */}
                  <div className="bottom-sheet-handle lg:hidden" />
                  <h2 className="text-sm font-semibold">
                    {language === 'en' ? 'Controls' : 'নিয়ন্ত্রণ'}
                  </h2>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-full transition-all active:scale-95 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile live values */}
              {sortedLiveValues.length > 0 && (
                <div className="border-b border-border/50 p-3 lg:hidden">
                  <div className="flex flex-wrap gap-2">
                    {sortedLiveValues.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1"
                      >
                        <span className="text-[10px] text-muted-foreground">{v.label}</span>
                        <span className="text-xs font-mono font-semibold text-primary">
                          {v.value}
                          {v.unit && <span className="text-muted-foreground">{v.unit}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parameters */}
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-1">
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
                    {language === 'en' ? 'Parameters' : 'প্যারামিটার'}
                  </h3>
                  <ControlsPanel topicId={topicId} />
                </div>

                {/* Formulas */}
                {formulas.length > 0 && (
                  <div className="border-t border-border/50 p-3 space-y-1">
                    <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
                      {language === 'en' ? 'Formulas' : 'সূত্র'}
                    </h3>
                    <div className="space-y-2">
                      {formulas.map((f, i) => (
                        <div key={i} className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs font-medium">{f.name}</p>
                          <p className="mt-1 font-mono text-sm text-primary">{f.expression}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
