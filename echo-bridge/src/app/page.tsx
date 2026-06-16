'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu } from 'lucide-react';
import { useSessionStore, type ChatMessage, type ActivityStep } from '@/store/session-store';
import SessionSidebar from '@/components/sidebar/SessionSidebar';
import ChatPanel from '@/components/chat/ChatPanel';

/* ------------------------------------------------------------------ */
/*  Generate activity steps for a new Echo message                     */
/* ------------------------------------------------------------------ */

function generateActivitySteps(): ActivityStep[] {
  return [
    { id: 'step-analyze', label: 'Analyzing your request...', status: 'completed', icon: 'Search' },
    { id: 'step-tools', label: 'Processing with tools...', status: 'completed', icon: 'Wrench' },
    { id: 'step-generate', label: 'Generating response...', status: 'completed', icon: 'Sparkles' },
  ];
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function EchoBridge() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [lastSentMessageId, setLastSentMessageId] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const addMessage = useSessionStore((s) => s.addMessage);
  const updateMessage = useSessionStore((s) => s.updateMessage);

  const currentSessionId = activeSessionId;

  // Auto-create a session on first load
  useEffect(() => {
    if (sessions.length === 0) {
      const id = createSession();
      setActiveSession(id);
    } else if (!activeSessionId) {
      setActiveSession(sessions[0].id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /* ---- Poll for Echo replies ---- */
  const startPolling = useCallback(
    (afterMessageId: string, sessionId: string) => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      const poll = async () => {
        try {
          const res = await fetch(`/api/reply?after=${afterMessageId}&_t=${Date.now()}`);
          const data = await res.json();

          if (data.messages && data.messages.length > 0) {
            // Add all Echo messages
            for (const msg of data.messages) {
              const echoMsg: ChatMessage = {
                id: `echo-${msg.id}-${Date.now()}`,
                role: 'echo',
                content: msg.content,
                timestamp: new Date(msg.timestamp).getTime(),
                status: 'sent',
                imageUrl: msg.attachments?.[0]?.url,
                activitySteps: generateActivitySteps(),
              };
              addMessage(sessionId, echoMsg);
            }

            // Update the last sent message to mark its echo response received
            const lastMsgId = data.messages[data.messages.length - 1]?.id;
            if (lastMsgId) {
              setLastSentMessageId(lastMsgId);
            }

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

      poll();
      pollTimerRef.current = setInterval(poll, 3000);
    },
    [addMessage]
  );

  /* ---- Send message ---- */
  const handleSend = useCallback(
    async (text: string, file?: File | null) => {
      if (!currentSessionId || isWaiting) return;

      const trimmed = text.trim();
      if (!trimmed && !file) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
        status: 'sending',
        imageUrl: file ? URL.createObjectURL(file) : undefined,
      };

      addMessage(currentSessionId, userMsg);
      setIsWaiting(true);

      try {
        let res: Response;

        if (file) {
          // Multipart form-data for image upload
          const formData = new FormData();
          formData.append('message', trimmed);
          formData.append('file', file);
          res = await fetch('/api/send', {
            method: 'POST',
            body: formData,
          });
        } else {
          res = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmed }),
          });
        }

        const data = await res.json();

        if (data.success && data.messageId) {
          updateMessage(currentSessionId, userMsg.id, { status: 'sent' });
          startPolling(data.messageId, currentSessionId);
        } else {
          updateMessage(currentSessionId, userMsg.id, { status: 'error' });
          setIsWaiting(false);
        }
      } catch {
        updateMessage(currentSessionId, userMsg.id, { status: 'error' });
        setIsWaiting(false);
      }
    },
    [currentSessionId, isWaiting, addMessage, updateMessage, startPolling]
  );

  /* ---- Retry message ---- */
  const handleRetry = useCallback(
    (content: string) => {
      handleSend(content);
    },
    [handleSend]
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0b0d14]">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 left-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-[#0e1018] text-white/50 shadow-lg backdrop-blur-sm transition-colors hover:bg-white/[0.06] hover:text-white/80 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Sidebar */}
      <SessionSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Chat panel */}
      <ChatPanel onSend={handleSend} isWaiting={isWaiting} onRetry={handleRetry} />
    </div>
  );
}