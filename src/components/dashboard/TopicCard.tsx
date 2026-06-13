'use client';

import { useRouter } from 'next/navigation';
import { useLabStore } from '@/store/useLabStore';
import type { Topic } from '@/lib/topics';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const { language } = useLabStore();
  const router = useRouter();

  const handleLaunch = () => {
    router.push(`/simulations/${topic.id}`);
  };

  return (
    <button
      onClick={handleLaunch}
      className={`group relative flex w-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card text-left transition-all active:scale-[0.98] topic-${topic.id}`}
    >
      {/* Top color accent */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: topic.color }}
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg"
            style={{ backgroundColor: `${topic.color}20` }}
          >
            <div
              className="h-4 w-4 rounded-sm"
              style={{ backgroundColor: topic.color }}
            />
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {topic.classLevel === '9-10'
              ? language === 'en' ? 'Class 9-10' : 'শ্রেণি ৯-১০'
              : language === 'en' ? 'Class 11-12' : 'শ্রেণি ১১-১২'}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold leading-tight">
            {language === 'en' ? topic.title : topic.titleBn}
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {language === 'en' ? topic.description : topic.descriptionBn}
          </p>
        </div>

        {/* Launch Button */}
        <div className="flex items-center gap-1 pt-1">
          <span
            className="text-xs font-medium"
            style={{ color: topic.color }}
          >
            {language === 'en' ? 'Launch' : 'শুরু করুন'}
          </span>
          <ArrowRight
            className="h-3 w-3 transition-transform group-active:translate-x-0.5"
            style={{ color: topic.color }}
          />
        </div>
      </div>
    </button>
  );
}
