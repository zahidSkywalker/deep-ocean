'use client';

import { Bot, Sparkles } from 'lucide-react';
import { MessageCircle } from 'lucide-react';

interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  'Help me build a website',
  'Explain quantum computing',
  'Write a Python script',
];

export default function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-purple-500/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20">
          <Bot className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-xl font-semibold tracking-tight text-white/90">
        Talk to Echo
      </h2>

      {/* Subtext */}
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-white/40">
        Send a message and Echo will respond with agentic capabilities. Your conversations are bridged through Discord in real-time.
      </p>

      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white/50 transition-all duration-200 hover:border-purple-500/30 hover:bg-white/[0.06] hover:text-white/80"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400/60" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}