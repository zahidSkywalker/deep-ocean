'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Wifi, WifiOff, Loader2, Volume2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: 'user' | 'echo';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

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
/*  Typing indicator dots animation                                    */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-2 w-2 rounded-full bg-purple-400/70"
          style={{
            animation: `typingBounce 1.4s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Chat Component                                                 */
/* ------------------------------------------------------------------ */

export default function EchoBridge() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [lastSentMessageId, setLastSentMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectionStatus = useConnectionStatus();

  /* ---- Scroll to bottom on new messages ---- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaiting]);

  /* ---- Poll for Echo reply ---- */
  const startPolling = useCallback((afterMessageId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/reply?after=${afterMessageId}&_t=${Date.now()}`);
        const data = await res.json();

        if (data.reply) {
          const replyMsg: ChatMessage = {
            id: `echo-${Date.now()}`,
            role: 'echo',
            content: data.reply,
            timestamp: new Date(),
            status: 'sent',
          };

          setMessages((prev) => [...prev, replyMsg]);
          setIsWaiting(false);
          setLastSentMessageId(null);

          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch {
        // Silently retry on next interval
      }
    };

    // Start polling every 3 seconds
    poll();
    pollTimerRef.current = setInterval(poll, 3000);
  }, []);

  /* ---- Cleanup polling on unmount ---- */
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /* ---- Send message ---- */
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isWaiting) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsWaiting(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (data.success && data.messageId) {
        // Update the user message status
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'sent' } : m))
        );
        setLastSentMessageId(data.messageId);
        startPolling(data.messageId);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'error' } : m))
        );
        setIsWaiting(false);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'error' } : m))
      );
      setIsWaiting(false);
    }
  };

  /* ---- Handle keyboard send (Enter without Shift) ---- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ---- Auto-resize textarea ---- */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  /* ---- Format time ---- */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    connected: { color: 'bg-emerald-400', label: 'Connected', Icon: Wifi },
    disconnected: { color: 'bg-red-400', label: 'Disconnected', Icon: WifiOff },
    checking: { color: 'bg-amber-400', label: 'Checking...', Icon: Loader2 },
  };

  const currentStatus = statusConfig[connectionStatus];
  const StatusIcon = currentStatus.Icon;

  return (
    <div className="flex h-[100dvh] flex-col bg-[#0b0d14]">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Logo / Brand */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20">
            <Volume2 className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">Echo Bridge</h1>
            <p className="text-xs text-white/40">Discord-to-Web Chat</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
          <span className={`block h-2 w-2 rounded-full ${currentStatus.color} ${connectionStatus === 'checking' ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-medium text-white/60">{currentStatus.label}</span>
          <StatusIcon className={`h-3.5 w-3.5 text-white/30 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
        </div>
      </header>

      {/* ─── Chat Area ─── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Empty State */}
          {messages.length === 0 && !isWaiting && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-purple-500/20">
                <Bot className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="mb-1 text-lg font-semibold text-white/80">Talk to Echo</h2>
              <p className="max-w-sm text-sm text-white/40">
                Send a message and Echo will respond from Discord. Messages are relayed through a
                Discord channel in real-time.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{
                animation: 'messageSlideIn 0.3s ease-out',
              }}
            >
              <div className={`flex max-w-[85%] gap-2.5 sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                      : 'bg-white/[0.06]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-purple-400" />
                  )}
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-1">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/10'
                        : 'rounded-tl-sm border border-white/[0.06] bg-[#1a1d27] text-white/90'
                    } ${msg.status === 'error' ? 'opacity-60 ring-1 ring-red-500/30' : ''}`}
                  >
                    {msg.status === 'error' && (
                      <span className="mb-1 block text-[10px] font-medium text-red-400">
                        Failed to send
                      </span>
                    )}
                    {msg.content}
                  </div>
                  <span className={`px-1 text-[10px] text-white/20 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isWaiting && (
            <div className="flex justify-start" style={{ animation: 'messageSlideIn 0.3s ease-out' }}>
              <div className="flex gap-2.5">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/[0.06] bg-[#1a1d27] px-4 py-3">
                  <TypingIndicator />
                  <span className="text-xs text-white/30">Echo is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ─── Input Area ─── */}
      <footer className="safe-bottom border-t border-white/[0.06] bg-[#0b0d14]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={isWaiting}
                className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isWaiting}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
              aria-label="Send message"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-white/15">
            Messages are sent to Discord · Powered by Echo Bridge
          </p>
        </div>
      </footer>
    </div>
  );
}
