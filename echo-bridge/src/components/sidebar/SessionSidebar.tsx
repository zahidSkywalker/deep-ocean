'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, MoreHorizontal, Pencil, Trash2, X, Volume2 } from 'lucide-react';
import { useSessionStore, type Session } from '@/store/session-store';

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

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/*  Context Menu                                                       */
/* ------------------------------------------------------------------ */

interface ContextMenuState {
  sessionId: string | null;
  x: number;
  y: number;
}

function ContextMenu({
  state,
  onClose,
  onRename,
  onDelete,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!state.sessionId) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1d27] p-1 shadow-2xl shadow-black/40"
      style={{
        top: Math.min(state.y, window.innerHeight - 120),
        left: Math.min(state.x, window.innerWidth - 180),
        animation: 'fadeIn 0.12s ease-out',
      }}
    >
      <button
        onClick={() => {
          onRename(state.sessionId!);
          onClose();
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" />
        Rename
      </button>
      <button
        onClick={() => {
          onDelete(state.sessionId!);
          onClose();
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rename Dialog                                                      */
/* ------------------------------------------------------------------ */

function RenameDialog({
  initialName,
  onConfirm,
  onCancel,
}: {
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = name.trim();
      if (trimmed) onConfirm(trimmed);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-xs rounded-xl border border-white/[0.08] bg-[#1a1d27] p-4 shadow-2xl"
        style={{ animation: 'fadeIn 0.15s ease-out' }}
      >
        <h3 className="mb-3 text-sm font-medium text-white/80">Rename Session</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mb-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-purple-500/40 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
          placeholder="Session name"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const trimmed = name.trim();
              if (trimmed) onConfirm(trimmed);
            }}
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-purple-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SessionSidebar                                                     */
/* ------------------------------------------------------------------ */

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionSidebar({ isOpen, onClose }: SessionSidebarProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const renameSession = useSessionStore((s) => s.renameSession);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ sessionId: null, x: 0, y: 0 });
  const [renameDialogId, setRenameDialogId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleNewChat = useCallback(() => {
    const id = createSession();
    setActiveSession(id);
    onClose(); // Close mobile sidebar
  }, [createSession, setActiveSession, onClose]);

  const handleContextAction = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.preventDefault();
      setContextMenu({ sessionId, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleRename = useCallback((sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setRenameValue(session.name);
      setRenameDialogId(sessionId);
    }
  }, [sessions]);

  const handleRenameConfirm = useCallback(
    (name: string) => {
      if (renameDialogId) {
        renameSession(renameDialogId, name);
        setRenameDialogId(null);
      }
    },
    [renameDialogId, renameSession]
  );

  const handleDelete = useCallback(
    (sessionId: string) => {
      deleteSession(sessionId);
    },
    [deleteSession]
  );

  // Close sidebar on mobile when clicking a session
  const handleSessionClick = useCallback(
    (sessionId: string) => {
      setActiveSession(sessionId);
      onClose();
    },
    [setActiveSession, onClose]
  );

  // Get last message preview
  const getLastMessage = (session: Session) => {
    if (session.messages.length === 0) return 'No messages yet';
    const last = session.messages[session.messages.length - 1];
    const preview = last.content.slice(0, 40).trim();
    return preview + (last.content.length > 40 ? '…' : '');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          style={{ animation: 'backdropFadeIn 0.2s ease-out' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-full w-[280px] flex-col border-r border-white/[0.06] bg-[#0e1018] lg:static lg:z-0 ${
          isOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        } transition-transform duration-200 ease-out lg:translate-x-0`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20">
              <Volume2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/90">Echo Bridge</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
              aria-label="New chat"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
            {/* Close button on mobile */}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* New Chat button (prominent) */}
        <div className="px-3 pb-2">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] px-3 py-2.5 text-sm text-white/40 transition-colors hover:border-purple-500/30 hover:bg-white/[0.03] hover:text-white/60"
          >
            <MessageSquare className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1">
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSessionClick(session.id)}
                onContextMenu={(e) => handleContextAction(e, session.id)}
                className={`group flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  session.id === activeSessionId
                    ? 'bg-white/[0.06] border-l-2 border-purple-500'
                    : 'border-l-2 border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-sm font-medium ${
                      session.id === activeSessionId ? 'text-white/90' : 'text-white/60'
                    }`}
                  >
                    {session.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextAction(e, session.id);
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/0 transition-colors group-hover:text-white/30 hover:!bg-white/[0.06] hover:!text-white/60"
                    aria-label="Session options"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="truncate text-[11px] text-white/20">
                  {getLastMessage(session)}
                </p>
                <span className="text-[10px] text-white/15">
                  {getRelativeTime(session.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Rename dialog */}
        {renameDialogId && (
          <RenameDialog
            initialName={renameValue}
            onConfirm={handleRenameConfirm}
            onCancel={() => setRenameDialogId(null)}
          />
        )}
      </aside>

      {/* Context menu */}
      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu({ sessionId: null, x: 0, y: 0 })}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </>
  );
}