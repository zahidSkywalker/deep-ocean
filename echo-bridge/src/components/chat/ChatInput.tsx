'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, ImagePlus, X, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, file?: File | null) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate it's an image
    if (!selectedFile.type.startsWith('image/')) return;

    // Validate size (max 8MB)
    if (selectedFile.size > 8 * 1024 * 1024) return;

    setFile(selectedFile);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selectedFile));
  }, [preview]);

  const handleRemoveFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }, [preview]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    if (disabled) return;

    onSend(trimmed, file);
    setText('');
    handleRemoveFile();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, file, disabled, onSend, handleRemoveFile]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileSelect(selected);
      // Reset input value so same file can be selected again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const canSend = (text.trim().length > 0 || file !== null) && !disabled;

  return (
    <div className="safe-bottom border-t border-white/[0.06] bg-[#0b0d14]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Image preview */}
        {preview && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative overflow-hidden rounded-xl border border-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Upload preview"
                className="h-16 w-16 object-cover"
              />
            </div>
            <button
              onClick={handleRemoveFile}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-white/40 transition-colors hover:bg-red-500/20 hover:text-red-400"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div
          className={`flex items-end gap-2 rounded-xl border transition-colors ${
            isDragging
              ? 'border-purple-500/40 bg-purple-500/5'
              : 'border-white/[0.08] bg-white/[0.04] focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/20'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="mb-3 ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Attach image"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent py-3 pr-2 text-sm leading-relaxed text-white/90 placeholder:text-white/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Attachment indicator / character count */}
          {file && (
            <div className="mb-3 flex items-center gap-1 text-[10px] text-white/20">
              <Paperclip className="h-3 w-3" />
              <span>{(file.size / 1024).toFixed(0)}KB</span>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="mb-3 mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Footer text */}
        <p className="mt-2 text-center text-[10px] text-white/15">
          Messages are sent to Discord · Powered by Echo Bridge
        </p>
      </div>
    </div>
  );
}