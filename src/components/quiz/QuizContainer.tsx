'use client';

import { useLabStore } from '@/store/useLabStore';
import { getTopicById } from '@/lib/topics';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';

export function QuizContainer() {
  const { currentTopicId, quizAnswers, quizSubmitted, language } = useLabStore();

  const topic = useMemo(() => {
    if (!currentTopicId) return null;
    return getTopicById(currentTopicId);
  }, [currentTopicId]);

  if (!topic) return null;

  const questions = topic.quizQuestions;
  const answeredCount = Object.keys(quizAnswers).filter(
    (k) => quizAnswers[k] !== null
  ).length;
  const progress = (answeredCount / questions.length) * 100;

  if (quizSubmitted) {
    return <QuizResults topicId={currentTopicId} />;
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {language === 'en' ? 'Quiz' : 'কুইজ'}: {language === 'en' ? topic.title : topic.titleBn}
          </h2>
          <span className="text-xs text-muted-foreground">
            {answeredCount}/{questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuizQuestion
            key={q.id}
            question={q}
            index={index}
            selectedAnswer={quizAnswers[q.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
