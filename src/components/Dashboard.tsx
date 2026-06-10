'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Atom, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { topics, getAllChapters } from '@/lib/topics'
import { useStore } from '@/store/useStore'
import TopicCard from './TopicCard'

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const setTopic = useStore((s) => s.setTopic)
  const setView = useStore((s) => s.setView)
  const chapters = useMemo(() => getAllChapters(), [])

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.titlebn.includes(searchQuery) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesChapter = selectedChapter === null || t.chapter === selectedChapter
      return matchesSearch && matchesChapter
    })
  }, [searchQuery, selectedChapter])

  const handleTopicClick = (topicId: string) => {
    setTopic(topicId)
    setView('simulation')
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00d4ff] to-cyan-600 text-black">
              <Atom size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">NCTB Physics Lab</h1>
              <p className="text-xs text-gray-500">Interactive 3D Physics Simulations</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search simulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-white/10 bg-[#1a1a2e] pl-10 text-white placeholder:text-gray-500 focus:border-[#00d4ff]/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedChapter === null ? 'default' : 'outline'}
              onClick={() => setSelectedChapter(null)}
              className="cursor-pointer transition-all hover:bg-[#00d4ff]/20 hover:text-[#00d4ff] hover:border-[#00d4ff]/30"
            >
              All Chapters
            </Badge>
            {chapters.map((ch) => (
              <Badge
                key={ch}
                variant={selectedChapter === ch ? 'default' : 'outline'}
                onClick={() => setSelectedChapter(selectedChapter === ch ? null : ch)}
                className="cursor-pointer transition-all hover:bg-[#00d4ff]/20 hover:text-[#00d4ff] hover:border-[#00d4ff]/30"
              >
                Chapter {ch}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results count */}
        <motion.p
          key={filteredTopics.length}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 text-sm text-gray-500"
        >
          {filteredTopics.length} simulation{filteredTopics.length !== 1 ? 's' : ''} available
        </motion.p>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTopics.map((topic, i) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={i}
              onClick={() => handleTopicClick(topic.id)}
            />
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Atom className="mb-4 h-12 w-12 text-gray-700" />
            <p className="text-lg font-medium text-gray-400">No simulations found</p>
            <p className="text-sm text-gray-600">Try a different search or chapter filter</p>
          </div>
        )}
      </main>
    </div>
  )
}
