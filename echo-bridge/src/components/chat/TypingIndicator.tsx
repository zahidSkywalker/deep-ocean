'use client';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
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
      <span className="text-xs text-white/30">Echo is thinking...</span>
    </div>
  );
}