'use client';

import { useState, useEffect } from 'react';
import { Search, Wrench, Sparkles, Check, Loader2 } from 'lucide-react';

interface StepConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const steps: StepConfig[] = [
  { id: 'analyze', label: 'Analyzing your request...', icon: <Search className="h-3.5 w-3.5" /> },
  { id: 'tools', label: 'Processing with tools...', icon: <Wrench className="h-3.5 w-3.5" /> },
  { id: 'generate', label: 'Generating response...', icon: <Sparkles className="h-3.5 w-3.5" /> },
];

export default function ActivityItem() {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show first step immediately
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 1: show immediately
    timers.push(
      setTimeout(() => {
        setVisibleSteps(1);
      }, 0)
    );

    // Step 2: show after 2.5s, complete step 1
    timers.push(
      setTimeout(() => {
        setCompletedSteps((prev) => new Set(prev).add('analyze'));
        setVisibleSteps(2);
      }, 2500)
    );

    // Step 3: show after 5s, complete step 2
    timers.push(
      setTimeout(() => {
        setCompletedSteps((prev) => new Set(prev).add('tools'));
        setVisibleSteps(3);
      }, 5000)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col gap-2 py-1">
      {steps.slice(0, visibleSteps).map((step, index) => {
        const isCompleted = completedSteps.has(step.id);
        const isActive = !isCompleted && index === visibleSteps - 1;

        return (
          <div
            key={step.id}
            className="flex items-center gap-3"
            style={{
              animation: `stepFadeIn 0.4s ease-out ${index === visibleSteps - 1 ? '0s' : undefined}`,
            }}
          >
            {/* Icon */}
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isActive
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-white/[0.06] text-white/20'
              }`}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" />
              ) : isActive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                step.icon
              )}
            </div>

            {/* Label */}
            <span
              className={`text-xs transition-colors duration-300 ${
                isCompleted
                  ? 'text-emerald-400/80'
                  : isActive
                    ? 'text-white/60'
                    : 'text-white/20'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}