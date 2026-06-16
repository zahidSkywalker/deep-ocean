'use client';

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, RefreshCw } from 'lucide-react';
import type { ChatMessage, ActivityStep } from '@/store/session-store';
import CodeBlock from './CodeBlock';

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/*  Icon mapper for activity steps                                     */
/* ------------------------------------------------------------------ */

import { Search, Wrench, Sparkles, Globe, FileCode, Brain, Database } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Search: <Search className="h-3.5 w-3.5" />,
  Wrench: <Wrench className="h-3.5 w-3.5" />,
  Sparkles: <Sparkles className="h-3.5 w-3.5" />,
  Globe: <Globe className="h-3.5 w-3.5" />,
  FileCode: <FileCode className="h-3.5 w-3.5" />,
  Brain: <Brain className="h-3.5 w-3.5" />,
  Database: <Database className="h-3.5 w-3.5" />,
};

function ActivityStepsTimeline({ steps }: { steps: ActivityStep[] }) {
  return (
    <div className="mb-3 flex flex-col gap-1.5 border-b border-white/[0.04] pb-3">
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-center gap-2.5"
        >
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
              step.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400'
                : step.status === 'active'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-white/[0.04] text-white/15'
            }`}
          >
            {step.status === 'completed' ? (
              <Check className="h-3 w-3" />
            ) : step.status === 'active' ? (
              <span className="block h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            ) : (
              iconMap[step.icon] || <Sparkles className="h-3 w-3" />
            )}
          </div>
          <span
            className={`text-xs ${
              step.status === 'completed'
                ? 'text-emerald-400/70'
                : step.status === 'active'
                  ? 'text-white/60'
                  : 'text-white/20'
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MessageBubble                                                      */
/* ------------------------------------------------------------------ */

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (content: string) => void;
}

export default function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Memoize markdown components
  const markdownComponents = useMemo(
    () => ({
      code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        // If it's a fenced code block (has language class and is a <pre> child)
        if (match) {
          return <CodeBlock language={match[1]} code={codeString} />;
        }

        // Check if we're inside a <pre> — we can detect this by checking if the parent
        // element would render as a <pre> block. react-markdown passes `node` which
        // we can use. But simpler: if className is present but no language, or
        // if the code content has newlines, treat as a block.
        if (codeString.includes('\n') && !className) {
          return <CodeBlock language="text" code={codeString} />;
        }

        // Inline code
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      // Don't wrap code blocks in an extra <pre>
      pre({ children }: React.HTMLAttributes<HTMLPreElement>) {
        return <>{children}</>;
      },
    }),
    []
  );

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ animation: 'messageSlideIn 0.3s ease-out' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`flex max-w-[85%] gap-2.5 sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <div
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isUser
              ? 'bg-gradient-to-br from-purple-500 to-blue-500'
              : 'bg-white/[0.06]'
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-purple-400" />
          )}
        </div>

        {/* Bubble + meta */}
        <div className="flex flex-col gap-1">
          {/* Message content */}
          <div
            className={`relative group/bubble rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/10'
                : 'rounded-tl-sm border border-white/[0.06] bg-[#1a1d27] text-white/90'
            } ${message.status === 'error' ? 'opacity-60 ring-1 ring-red-500/30' : ''}`}
          >
            {/* Error indicator */}
            {message.status === 'error' && (
              <span className="mb-1 block text-[10px] font-medium text-red-400">
                Failed to send
              </span>
            )}

            {/* Activity steps timeline */}
            {message.activitySteps && message.activitySteps.length > 0 && (
              <ActivityStepsTimeline steps={message.activitySteps} />
            )}

            {/* Image attachment */}
            {message.imageUrl && (
              <div className="mb-2 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.imageUrl}
                  alt="Attachment"
                  className="max-h-64 max-w-full rounded-xl object-cover"
                />
              </div>
            )}

            {/* Message text */}
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="echo-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Hover actions */}
            {hovered && (
              <div
                className={`absolute top-2 flex gap-1 transition-opacity ${
                  isUser ? 'left-2' : 'right-2'
                }`}
                style={{ animation: 'fadeIn 0.15s ease-out' }}
              >
                <button
                  onClick={handleCopy}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white/50 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white/80"
                  aria-label="Copy message"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                {isUser && onRetry && (
                  <button
                    onClick={() => onRetry(message.content)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white/50 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white/80"
                    aria-label="Retry message"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span
            className={`px-1 text-[10px] text-white/20 ${isUser ? 'text-right' : 'text-left'}`}
          >
            {getRelativeTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}