'use client';

import React, { useState, useEffect } from 'react';
import { ExerciseDefinition, SessionSummary } from '@/lib/exercises/types';
import { useTranslation } from '@/lib/i18n/context';
import { MangaCard } from '../system/MangaCard';
import { Play, Pause, Square, Plus, CheckCircle, Clock } from 'lucide-react';

interface GuidedWorkoutProps {
  definition: ExerciseDefinition;
  onFinishSession: (summary: SessionSummary) => void;
  onSwitchToCamera?: () => void;
}

export const GuidedWorkout: React.FC<GuidedWorkoutProps> = ({
  definition,
  onFinishSession,
  onSwitchToCamera,
}) => {
  const { t } = useTranslation();

  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [manualCount, setManualCount] = useState<number>(0);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  const steps = [
    'Sit tall and comfortably in your chair or on a stable cushion.',
    'Take a slow, deep breath in through your nose, letting shoulders relax.',
    'Gently rotate shoulders back 5 times, maintaining smooth easy breathing.',
    'Turn your head slowly side to side within your natural comfortable range.',
    'Bring both hands to your chest, pause for 10 seconds of calm rhythm.',
  ];

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleToggleTimer = () => {
    setIsActive(!isActive);
  };

  const handleFinish = () => {
    setIsActive(false);
    const summary: SessionSummary = {
      id: `session_${Date.now()}_guided`,
      movement: definition.id,
      variantId: 'guided_standard',
      source: 'guided',
      startedAt: new Date(Date.now() - secondsElapsed * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      totalActiveTimeSec: secondsElapsed,
      totalValidTrackingTimeSec: secondsElapsed,
      overallCoveragePercent: 100, // guided mode full participation
      totalRepsCompleted: manualCount,
      scoredRepsCount: 0,
      medianQScore: null, // Q=null for guided mode, never fabricated
      isPreliminary: false,
      repDetails: [],
      observedCueIds: ['SESSION_SAVED'],
    };
    onFinishSession(summary);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <MangaCard title={t(definition.nameKey as any)} badge="Accessible Guided Mode">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t(definition.instructionsKey as any)}
        </p>

        {/* Timer & Count Display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="manga-panel p-4 text-center bg-[var(--surface-inset)]">
            <div className="text-xs uppercase font-extrabold text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Duration
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono mt-1">
              {formatTime(secondsElapsed)}
            </div>
          </div>
          <div className="manga-panel p-4 text-center bg-[var(--surface-inset)]">
            <div className="text-xs uppercase font-extrabold text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Intervals
            </div>
            <div className="text-3xl sm:text-4xl font-black mt-1">
              {manualCount}
            </div>
          </div>
        </div>

        {/* Step Guide */}
        <div className="manga-panel p-4 mb-6 bg-[var(--surface-panel)] border-l-4 border-l-[var(--cyan)]">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
            Step {currentStepIdx + 1} of {steps.length}
          </div>
          <p className="text-base font-extrabold text-[var(--text-primary)] leading-relaxed">
            {steps[currentStepIdx]}
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setCurrentStepIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIdx === 0}
              className="px-3 py-1 text-xs font-bold border border-[var(--border-color)] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => {
                setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1));
                setManualCount((prev) => prev + 1);
              }}
              disabled={currentStepIdx === steps.length - 1}
              className="px-3 py-1 text-xs font-bold bg-[var(--cyan)] border border-[var(--border-color)] text-[var(--ink)]"
            >
              Next Step & Record
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTimer}
              className="touch-target px-5 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-sm border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] flex items-center gap-2"
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isActive ? t('action.pause') : t('action.start')}
            </button>
            <button
              onClick={() => setManualCount((c) => c + 1)}
              className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] font-bold text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Interval
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToCamera && (
              <button
                onClick={onSwitchToCamera}
                className="text-xs font-bold text-[var(--text-secondary)] underline hover:text-[var(--text-primary)] mr-2"
              >
                Switch to Camera
              </button>
            )}
            <button
              onClick={handleFinish}
              className="touch-target px-5 py-2.5 bg-[var(--crimson)] text-white font-black text-sm border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              {t('action.stop')}
            </button>
          </div>
        </div>
      </MangaCard>
    </div>
  );
};
