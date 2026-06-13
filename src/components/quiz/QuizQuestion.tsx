'use client';

import { useLabStore } from '@/store/useLabStore';
import type { QuizQuestion as QuizQuestionType } from '@/lib/topics';
import { cn } from '@/lib/utils';

interface QuizQuestionProps {
  question: QuizQuestionType;
  index: number;
  selectedAnswer: number | null;
}

export function QuizQuestion({ question, index, selectedAnswer }: QuizQuestionProps) {
  const { language, setQuizAnswer, quizSubmitted } = useLabStore();

  const handleSelect = (optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswer(question.id, optionIndex);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <p className="text-sm font-medium leading-relaxed">
        <span className="text-primary mr-2">{index + 1}.</span>
        {language === 'en' ? question.question : question.questionBn}
      </p>

      <div className="space-y-2">
        {(language === 'en' ? question.options : question.optionsBn).map(
          (option, optIdx) => {
            const isSelected = selectedAnswer === optIdx;
            const isCorrect = quizSubmitted && optIdx === question.correctIndex;
            const isWrong = quizSubmitted && isSelected && optIdx !== question.correctIndex;

            return (
              <button
                key={optIdx}
                onClick={() => handleSelect(optIdx)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-all min-h-[44px]',
                  isSelected && !quizSubmitted && 'border-primary bg-primary/10 text-foreground',
                  isCorrect && 'border-green-500 bg-green-500/10 text-green-400',
                  isWrong && 'border-destructive bg-destructive/10 text-destructive',
                  !isSelected && !isCorrect && !isWrong && 'border-border/50 hover:border-border hover:bg-muted/50 text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 min-h-[24px] min-w-[24px] shrink-0 items-center justify-center rounded-full border text-[10px] font-medium',
                    isSelected && !quizSubmitted && 'border-primary bg-primary text-primary-foreground',
                    isCorrect && 'border-green-500 bg-green-500 text-white',
                    isWrong && 'border-destructive bg-destructive text-white',
                    !isSelected && !isCorrect && !isWrong && 'border-border text-muted-foreground'
                  )}
                >
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span>{option}</span>
              </button>
            );
          }
        )}
      </div>

      {/* Show explanation after submit */}
      {quizSubmitted && selectedAnswer !== null && (
        <div
          className={cn(
            'rounded-lg p-3 text-xs',
            selectedAnswer === question.correctIndex
              ? 'bg-green-500/10 text-green-400'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {language === 'en' ? question.explanation : question.explanationBn}
        </div>
      )}
    </div>
  );
}
