'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Square,
  Settings2,
  Copy,
  Check,
  Bot,
  ChevronDown,
  X,
  Sparkles,
  ArrowDown,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { AI_CONFIG, EXAMPLE_PROMPTS } from '@/lib/ai-config';

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Code Block Component ───────────────────────────────────────────────────

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    const text = codeRef.current?.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group relative my-4 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d1117]">
      {/* Language label and copy */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-md hover:bg-white/[0.06]"
        >
          {copied ? (
            <>
              <Check size={12} /> Copied
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>
      <div ref={codeRef} className="overflow-x-auto p-4">
        <pre className="text-sm leading-relaxed">
          <code className={className}>{children}</code>
        </pre>
      </div>
    </div>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-purple-300 text-[0.875em] font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock className={className}>{children}</CodeBlock>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-400/30 hover:decoration-purple-400 transition-colors"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-xl border border-white/[0.08]">
                <table className="w-full text-sm">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="px-4 py-2.5 text-left bg-white/[0.04] font-semibold text-zinc-200 border-b border-white/[0.08]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2.5 text-zinc-300 border-b border-white/[0.06]">
                {children}
              </td>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-4 pl-4 border-l-2 border-purple-500/40 text-zinc-400 italic">
                {children}
              </blockquote>
            );
          },
          ul({ children }) {
            return <ul className="my-2 space-y-1 list-disc list-outside ml-5 text-zinc-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 space-y-1 list-decimal list-outside ml-5 text-zinc-300">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed pl-1">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold text-white mt-6 mb-3">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold text-white mt-5 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-white mt-4 mb-2">{children}</h3>;
          },
          hr() {
            return <hr className="my-6 border-white/[0.08]" />;
          },
          p({ children }) {
            return <p className="my-2 leading-relaxed text-zinc-300">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-purple-400/60"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Welcome Screen ──────────────────────────────────────────────────────────

function WelcomeScreen({ onSendPrompt }: { onSendPrompt: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center"
    >
      {/* Logo / Icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Sparkles size={36} className="text-white" />
        </div>
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-xl -z-10" />
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
        Free AI Chat
      </h1>
      <p className="text-zinc-400 text-base sm:text-lg max-w-md mb-10 leading-relaxed">
        Ask me anything — coding, writing, analysis, brainstorming, and more. Powered by leading open-source models.
      </p>

      {/* Example prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {EXAMPLE_PROMPTS.map((prompt, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
            onClick={() => onSendPrompt(prompt.text)}
            className="group flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-purple-500/20 transition-all duration-200 text-left"
          >
            <span className="text-xl shrink-0 mt-0.5">{prompt.icon}</span>
            <div>
              <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                {prompt.title}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{prompt.text}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md shadow-purple-500/10">
            <Bot size={16} className="text-white" />
          </div>
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`relative px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-md'
              : 'bg-white/[0.04] border border-white/[0.08] rounded-bl-md'
          }`}
        >
          {isUser ? (
            <p className="text-[0.935rem] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              {message.content ? (
                <MarkdownContent content={message.content} />
              ) : isStreaming ? (
                <TypingIndicator />
              ) : null}
            </>
          )}
        </div>

        {/* Actions (AI only) */}
        {!isUser && message.content && !isStreaming && (
          <div className="flex items-center gap-1 mt-1.5 ml-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded-md hover:bg-white/[0.04]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Model Selector ─────────────────────────────────────────────────────────

function ModelSelector({
  selectedModel,
  onModelChange,
}: {
  selectedModel: string;
  onModelChange: (model: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentModel = AI_CONFIG.models.find((m) => m.id === selectedModel);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all duration-200 text-sm"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        <span className="hidden sm:inline text-zinc-300 max-w-[160px] truncate">
          {currentModel?.name || selectedModel}
        </span>
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#1a1d27] border border-white/[0.1] shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Select Model
              </div>
              {AI_CONFIG.models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedModel === model.id
                      ? 'bg-purple-500/10 text-purple-300'
                      : 'hover:bg-white/[0.04] text-zinc-300'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      selectedModel === model.id ? 'bg-purple-400' : 'bg-zinc-600'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{model.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{model.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Settings Modal ─────────────────────────────────────────────────────────

function SettingsModalInner({
  onClose,
  apiKey,
  baseUrl,
  onSave,
}: {
  onClose: () => void;
  apiKey: string;
  baseUrl: string;
  onSave: (key: string, url: string) => void;
}) {
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);

  const handleSave = () => {
    onSave(localApiKey.trim(), localBaseUrl.trim());
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg rounded-2xl bg-[#1a1d27] border border-white/[0.1] shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">API Key</label>
            <input
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all text-sm font-mono"
              placeholder="sk-..."
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              Your API key stays in your browser and is never sent to any server.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Base URL</label>
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all text-sm font-mono"
              placeholder="https://api.routeway.ai/v1"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all shadow-md shadow-purple-500/20"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingsModal(props: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  baseUrl: string;
  onSave: (key: string, url: string) => void;
}) {
  if (!props.isOpen) return null;
  return <SettingsModalInner key={props.apiKey + props.baseUrl} {...props} />;
}

// ─── Main Chat App ───────────────────────────────────────────────────────────

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_CONFIG.defaultModel);
  const [apiKey, setApiKey] = useState(AI_CONFIG.apiKey);
  const [baseUrl, setBaseUrl] = useState(AI_CONFIG.baseUrl);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBtn(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [inputValue]);

  // ─── Stream Response ─────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
      };

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInputValue('');
      setIsLoading(true);
      setError(null);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: userMessage.role, content: userMessage.content },
      ];

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: apiMessages,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => 'Unknown error');
          throw new Error(
            `API returned ${response.status}: ${errBody}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to get response stream');

        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User stopped generation — keep partial content
        } else {
          const errorMsg =
            err instanceof Error ? err.message : 'An unexpected error occurred';
          setError(errorMsg);
          // Remove empty assistant message
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantMessage.id)
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, isLoading, selectedModel, apiKey, baseUrl]
  );

  const stopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const handleSaveSettings = (newKey: string, newUrl: string) => {
    setApiKey(newKey);
    setBaseUrl(newUrl);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0b0d14]">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-white/[0.06] bg-[#0b0d14]/80 backdrop-blur-xl z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md shadow-purple-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white hidden sm:block">
              Free AI Chat
            </h1>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && !isLoading && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all text-sm text-zinc-400 hover:text-zinc-200"
                title="New chat"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all text-zinc-400 hover:text-zinc-200"
              title="Settings"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Chat Area ───────────────────────────────────────────────── */}
      <main
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto relative"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {messages.length === 0 ? (
            <WelcomeScreen onSendPrompt={sendMessage} />
          ) : (
            <div className="space-y-6 pb-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={
                      isLoading &&
                      message.role === 'assistant' &&
                      message === messages[messages.length - 1]
                    }
                  />
                ))}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-red-400/80 mt-0.5">{error}</p>
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-full bg-[#1a1d27] border border-white/[0.1] text-zinc-400 hover:text-white shadow-lg hover:bg-white/[0.06] transition-all"
            >
              <ArrowDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Input Area ────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-white/[0.06] bg-[#0b0d14]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleFormSubmit} className="relative">
            <div className="flex items-end gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus-within:border-purple-500/30 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-white placeholder-zinc-600 focus:outline-none py-2.5 px-3 text-[0.935rem] leading-relaxed max-h-[200px] scrollbar-thin"
                disabled={isLoading}
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stopGenerating}
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition-all shadow-md shadow-red-500/20"
                  title="Stop generating"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all shadow-md shadow-purple-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </form>

          {/* Powered by */}
          <p className="text-center text-[11px] text-zinc-600 mt-3">
            Powered by{' '}
            <a
              href="https://routeway.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-purple-400 transition-colors"
            >
              RouteWay AI
            </a>{' '}
            · Free models may have rate limits · Responses are not stored
          </p>
        </div>
      </footer>

      {/* ─── Settings Modal ────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        baseUrl={baseUrl}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
