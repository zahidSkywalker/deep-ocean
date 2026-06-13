'use client';

import { useLabStore } from '@/store/useLabStore';
import { getTopicsByClass, searchTopics } from '@/lib/topics';
import { TopicCard } from './TopicCard';
import { useMemo } from 'react';

export function TopicGrid() {
  const { language, classFilter, searchQuery } = useLabStore();

  const topics = useMemo(() => {
    let filtered = getTopicsByClass(classFilter);
    if (searchQuery) {
      const searched = searchTopics(searchQuery);
      filtered = filtered.filter(t => searched.some(s => s.id === t.id));
    }
    return filtered;
  }, [classFilter, searchQuery]);

  const class910 = topics.filter(t => t.classLevel === '9-10');
  const class1112 = topics.filter(t => t.classLevel === '11-12');

  return (
    <div className="px-4 pb-6 space-y-6">
      {/* Class 9-10 Section */}
      {class910.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1 w-5 rounded-full bg-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {language === 'en' ? 'Class 9-10' : 'শ্রেণি ৯-১০'}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {class910.map(topic => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      )}

      {/* Class 11-12 Section */}
      {class1112.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1 w-5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">
              {language === 'en' ? 'Class 11-12' : 'শ্রেণি ১১-১২'}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {class1112.map(topic => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {topics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {language === 'en'
              ? 'No simulations found matching your search.'
              : 'আপনার অনুসন্ধানের সাথে কোনো সিমুলেশন পাওয়া যায়নি।'}
          </p>
        </div>
      )}
    </div>
  );
}
