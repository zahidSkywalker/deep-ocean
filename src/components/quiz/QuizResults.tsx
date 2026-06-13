'use client';

import { useLabStore } from '@/store/useLabStore';
import { getTopicById } from '@/lib/topics';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

interface QuizResultsProps {
  topicId: string;
}

export function QuizResults({ topicId }: QuizResultsProps) {
  const { language, quizAnswers, resetQuiz, goBack, setView } = useLabStore();

  const topic = useMemo(() => getTopicById(topicId), [topicId]);

  if (!topic) return null;

  const questions = topic.quizQuestions;
  const totalQuestions = questions.length;
  const correctAnswers = questions.filter(
    (q) => quizAnswers[q.id] === q.correctIndex
  ).length;
  const score = Math.round((correctAnswers / totalQuestions) * 100);

  const handleRetry = () => {
    resetQuiz();
    setView('quiz');
  };

  const handleBack = () => {
    goBack();
  };

  return (
    <div className="flex flex-col items-center px-4 py-8 space-y-6">
      {/* Score Circle */}
      <div className="flex flex-col items-center space-y-3">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${
            score >= 70
              ? 'border-green-500/50 bg-green-500/10'
              : score >= 40
                ? 'border-yellow-500/50 bg-yellow-500/10'
                : 'border-destructive/50 bg-destructive/10'
          }`}
        >
          <div className="text-center">
            <p className="text-3xl font-bold">{score}%</p>
            <p className="text-xs text-muted-foreground">
              {correctAnswers}/{totalQuestions}
            </p>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2 justify-center">
            <CheckCircle2 className={`h-5 w-5 ${score >= 70 ? 'text-green-500' : 'text-yellow-500'}`} />
            {score >= 70
              ? language === 'en' ? 'Excellent!' : 'চমৎকার!'
              : score >= 40
                ? language === 'en' ? 'Good Effort!' : 'ভালো চেষ্টা!'
                : language === 'en' ? 'Keep Practicing!' : 'চর্চা চালিয়ে যান!'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === 'en'
              ? `You answered ${correctAnswers} out of ${totalQuestions} questions correctly.`
              : `আপনি ${totalQuestions} প্রশ্নের মধ্যে ${correctAnswers}টি সঠিকভাবে উত্তর দিয়েছেন।`}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1 min-h-[44px]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {language === 'en' ? 'Back' : 'ফিরে যান'}
        </Button>
        <Button
          onClick={handleRetry}
          className="flex-1 min-h-[44px]"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
        </Button>
      </div>

      {/* Review */}
      <div className="w-full space-y-2 pt-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {language === 'en' ? 'Review Answers' : 'উত্তর পর্যালোচনা'}
        </h3>
        {questions.map((q, i) => {
          const userAnswer = quizAnswers[q.id];
          const isCorrect = userAnswer === q.correctIndex;

          return (
            <div
              key={q.id}
              className={`rounded-lg border p-3 text-xs ${
                isCorrect
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-destructive/30 bg-destructive/5'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium">{language === 'en' ? q.question : q.questionBn}</p>
                  <p className="mt-1 text-muted-foreground">
                    {isCorrect
                      ? language === 'en' ? '✓ Correct' : '✓ সঠিক'
                      : language === 'en'
                        ? `✗ Your answer: ${q.options[userAnswer ?? 0]}. Correct: ${q.options[q.correctIndex]}`
                        : `✗ আপনার উত্তর: ${q.optionsBn[userAnswer ?? 0]}. সঠিক: ${q.optionsBn[q.correctIndex]}`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
