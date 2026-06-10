'use client'

/**
 * Mathematical formula display box.
 * Shows formula name, symbolic form, substitution, and computed result.
 */
export function MathBox({
  title,
  formula,
  substitution,
  result,
  color = '#a78bfa',
}: {
  title?: string
  formula: string
  substitution?: string
  result?: string
  color?: string
}) {
  return (
    <div
      className="rounded-lg p-2.5 border transition-all"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}20`,
      }}
    >
      {title && (
        <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color }}>
          {title}
        </p>
      )}
      <p className="text-xs font-mono text-white/90">{formula}</p>
      {substitution && (
        <p className="text-[11px] font-mono text-gray-400 mt-0.5">{substitution}</p>
      )}
      {result && (
        <p className="text-xs font-mono font-bold mt-1" style={{ color: '#00ff88' }}>
          {result}
        </p>
      )}
    </div>
  )
}

/**
 * Section header for the math panel.
 */
export function MathSectionHeader({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
      <span className="text-sm">{icon}</span>
      <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest">{label}</h3>
    </div>
  )
}

/**
 * Divider in the math panel.
 */
export function MathDivider() {
  return <div className="border-t border-white/5 my-2" />
}
