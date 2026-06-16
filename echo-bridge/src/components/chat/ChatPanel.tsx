'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, Loader2, Bot } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import TypingIndicator from './TypingIndicator';
import ActivityItem from './ActivityItem';
import type { ChatMessage } from '@/store/session-store';

/* ------------------------------------------------------------------ */
/*  Connection status hook                                             */
/* ------------------------------------------------------------------ */

function useConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/reply?after=0&_t=' + Date.now());
        if (res.ok) {
          setStatus('connected');
        } else {
          setStatus('disconnected');
        }
      } catch {
        setStatus('disconnected');
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return status;
}

/* ------------------------------------------------------------------ */
/*  ChatPanel                                                          */
/* ------------------------------------------------------------------ */

interface ChatPanelProps {
  onSend: (text: string, file?: File | null) => void;
  isWaiting: boolean;
  onRetry: (content: string) => void;
}

export default function ChatPanel({ onSend, isWaiting, onRetry }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeSession = useSessionStore((s) => s.getActiveSession());
  const messages = activeSession?.messages || [];
  const connectionStatus = useConnectionStatus();

  // Auto-scroll to bottom on new messages or waiting state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaiting]);

  const handleSuggestionClick = useCallback(
    (text: string) => {
      onSend(text);
    },
    [onSend]
  );

  const statusConfig = {
    connected: { color: 'bg-emerald-400', label: 'Connected', Icon: Wifi },
    disconnected: { color: 'bg-red-400', label: 'Disconnected', Icon: WifiOff },
    checking: { color: 'bg-amber-400', label: 'Checking...', Icon: Loader2 },
  };

  const currentStatus = statusConfig[connectionStatus];
  const StatusIcon = currentStatus.Icon;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Header bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-white/80">
            {activeSession?.name || 'Echo Bridge'}
          </h1>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
          <span
            className={`block h-2 w-2 rounded-full ${currentStatus.color} ${connectionStatus === 'checking' ? 'animate-pulse' : ''}`}
          />
          <span className="text-xs font-medium text-white/60">{currentStatus.label}</span>
          <StatusIcon
            className={`h-3.5 w-3.5 text-white/30 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`}
          />
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Empty state */}
          {messages.length === 0 && !isWaiting && (
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          )}

          {/* Messages */}
          {messages.map((msg: ChatMessage) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetry={msg.role === 'user' ? onRetry : undefined}
            />
          ))}

          {/* Activity + typing indicator when waiting */}
          {isWaiting && (
            <div
              className="flex justify-start"
              style={{ animation: 'messageSlideIn 0.3s ease-out' }}
            >
              <div className="flex gap-2.5">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-white/[0.06] bg-[#1a1d27] px-4 py-3">
                  <ActivityItem />
                  <div className="mt-2 border-t border-white/[0.04] pt-2">
                    <TypingIndicator />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <ChatInput onSend={onSend} disabled={isWaiting} />
    </div>
  );
}