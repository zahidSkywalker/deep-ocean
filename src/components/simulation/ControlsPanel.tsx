'use client';

import { useLabStore } from '@/store/useLabStore';
import { getTopicById } from '@/lib/topics';
import { Slider } from '@/components/ui/slider';
import { useMemo } from 'react';

interface ControlsPanelProps {
  topicId: string;
}

export function ControlsPanel({ topicId }: ControlsPanelProps) {
  const { language, params, setParam } = useLabStore();

  const topic = useMemo(() => getTopicById(topicId), [topicId]);

  if (!topic) return null;

  const currentParams = params[topicId] || {};

  return (
    <div className="space-y-3">
      {topic.params.map((param) => {
        const value = currentParams[param.id] ?? param.default;

        // Handle circuitType and decayType as toggle buttons
        if (param.id === 'circuitType' || param.id === 'decayType' || param.id === 'lensType') {
          return (
            <div key={param.id} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs text-muted-foreground">
                  {language === 'en' ? param.label : param.labelBn}
                </label>
              </div>
              <div className="flex gap-2">
                {param.id === 'circuitType' && (
                  <>
                    <button
                      onClick={() => setParam(topicId, param.id, 0)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[40px] ${
                        value === 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {language === 'en' ? 'Series' : 'শ্রেণি'}
                    </button>
                    <button
                      onClick={() => setParam(topicId, param.id, 1)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[40px] ${
                        value === 1
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {language === 'en' ? 'Parallel' : 'সমান্তরাল'}
                    </button>
                  </>
                )}
                {param.id === 'decayType' && (
                  <>
                    <button
                      onClick={() => setParam(topicId, param.id, 0)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[40px] ${
                        value === 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      α
                    </button>
                    <button
                      onClick={() => setParam(topicId, param.id, 1)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[40px] ${
                        value === 1
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      β
                    </button>
                    <button
                      onClick={() => setParam(topicId, param.id, 2)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[40px] ${
                        value === 2
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      γ
                    </button>
                  </>
                )}
                {param.id === 'lensType' && (
                  <>
                    <button
                      onClick={() => setParam(topicId, param.id, 0)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[40px] ${
                        value === 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {language === 'en' ? 'Microscope' : 'মাইক্রোস্কোপ'}
                    </button>
                    <button
                      onClick={() => setParam(topicId, param.id, 1)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[40px] ${
                        value === 1
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {language === 'en' ? 'Telescope' : 'টেলিস্কোপ'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={param.id} className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs text-muted-foreground">
                {language === 'en' ? param.label : param.labelBn}
              </label>
              <span className="text-xs font-mono font-medium text-foreground">
                {typeof value === 'number' && value >= 1000 ? value.toExponential(1) : value}
                {param.unit && <span className="text-muted-foreground ml-0.5">{param.unit}</span>}
              </span>
            </div>
            <Slider
              min={param.min}
              max={param.max}
              step={param.step}
              value={[value]}
              onValueChange={([v]) => setParam(topicId, param.id, v)}
              className="py-2"
            />
          </div>
        );
      })}
    </div>
  );
}
