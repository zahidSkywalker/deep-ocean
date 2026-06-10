'use client'

/**
 * Styled control slider for simulation parameters.
 * Touch-friendly with 44px minimum touch target height.
 */
export function ControlSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  color = '#00d4ff',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  unit?: string
  color?: string
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <label className="block group cursor-pointer py-1 -mx-1 px-1 rounded-lg active:bg-white/5 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        <span
          className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
          style={{
            color,
            backgroundColor: `${color}15`,
          }}
        >
          {value}
          {unit && <span className="text-gray-500 ml-0.5 text-[10px]">{unit}</span>}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}44`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ accentColor: color }}
        />
      </div>
    </label>
  )
}

/**
 * Styled control button for simulation actions.
 */
export function ControlButton({
  label,
  onClick,
  color = '#00d4ff',
  variant = 'filled',
}: {
  label: string
  onClick: () => void
  color?: string
  variant?: 'filled' | 'outline'
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full py-2.5 sm:py-2 px-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-150
        ${variant === 'filled'
          ? 'text-black hover:brightness-110 active:scale-[0.98]'
          : 'border hover:bg-white/5 active:scale-[0.98]'
        }
      `}
      style={
        variant === 'filled'
          ? { background: color, boxShadow: `0 0 12px ${color}44` }
          : { borderColor: color, color }
      }
    >
      {label}
    </button>
  )
}
