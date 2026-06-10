'use client'

import { motion } from 'framer-motion'
import { type Topic } from '@/lib/topics'
import { ArrowRight } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface TopicCardProps {
  topic: Topic
  onClick: () => void
  index: number
}

export default function TopicCard({ topic, onClick, index }: TopicCardProps) {
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string; size?: number }>>)[topic.icon] || LucideIcons.Atom

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-white/10 bg-[#1a1a2e] p-5 transition-all duration-300 hover:border-[#00d4ff]/40 hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open ${topic.title} simulation`}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#00d4ff]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00d4ff]/10 text-[#00d4ff]">
            <IconComponent size={20} />
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-400">
            Ch. {topic.chapter}
          </span>
        </div>
        <h3 className="mb-0.5 text-base font-semibold text-white">{topic.title}</h3>
        <p className="mb-2 text-sm text-[#00d4ff]/80">{topic.titlebn}</p>
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-400">{topic.description}</p>
        <div className="flex items-center gap-1 text-xs text-[#00d4ff]/60 transition-colors group-hover:text-[#00d4ff]">
          <span>Launch Simulation</span>
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  )
}
