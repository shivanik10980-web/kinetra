'use client';

import React, { useState, useEffect } from 'react';
import { ExerciseDefinition, SessionSummary, SessionLifecycleState } from '@/lib/exercises/types';
import { useTranslation } from '@/lib/i18n/context';
import { MangaCard } from '../system/MangaCard';
import { Play, Pause, Square, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

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

  const [sessionState, setSessionState] = useState<SessionLifecycleState>('preview');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [manualCount, setManualCount] = useState<number>(0);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  // Exercise-specific guided steps
  const getExerciseSteps = () => {
    if (definition.id === 'squat') {
      return [
        'Stand or sit near a sturdy chair for balance support.',
        'Inhale, softly bend hips and knees to a comfortable depth (no forced depth).',
        'Pause at the bottom for 1-2 seconds with steady, calm breathing.',
        'Push through your feet to rise smoothly back up to standing.',
        'Pause at the top and take a full recovery breath before next cycle.',
      ];
    }
    if (definition.id === 'elbow_flexion') {
      return [
        'Sit or stand comfortably with arms relaxed at your sides.',
        'Smoothly bend your elbow, bringing hand toward shoulder with control.',
        'Pause at peak comfortable flexion for 1-2 seconds.',
        'Slowly lower your arm back to full comfortable extension.',
        'Relax your shoulder, take a steady breath, and repeat or switch arms.',
      ];
    }
    return [
      'Sit tall and comfortably in your chair or on a stable cushion.',
      'Take a slow, deep breath in through your nose, letting shoulders relax.',
      'Gently rotate shoulders back 5 times, maintaining smooth easy breathing.',
      'Turn your head slowly side to side within your natural comfortable range.',
      'Bring both hands to your chest, pause for 10 seconds of calm rhythm.',
    ];
  };

  const steps = getExerciseSteps();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionState === 'active') {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState]);

  const handleToggleTimer = () => {
    if (sessionState === 'preview' || sessionState === 'paused') {
      setSessionState('active');
    } else if (sessionState === 'active') {
      setSessionState('paused');
    }
  };

  const handleRecordInterval = () => {
    if (sessionState !== 'active') return;
    setManualCount((prev) => prev + 1);
  };

  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
    if (sessionState === 'active') {
      setManualCount((prev) => prev + 1);
    }
  };

  const handleFinish = () => {
    setSessionState('completed');
    const summary: SessionSummary = {
      id: `session_${Date.now()}_guided`,
      movement: definition.id,
      variantId: 'guided_standard',
      source: 'guided',
      startedAt: new Date(Date.now() - secondsElapsed * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      totalActiveTimeSec: Math.max(secondsElapsed, 1),
      totalValidTrackingTimeSec: 0,
      overallCoveragePercent: null, // Honest null for guided/no-camera (never claims 100% camera coverage)
      totalRepsCompleted: manualCount,
      scoredRepsCount: 0,
      medianQScore: null, // Q=null for guided mode, never fabricated
      isPreliminary: false,
      repDetails: [],
      observedCueIds: ['SESSION_SAVED'],
      evidenceSummary: 'Guided session: self-reported participation and timer completion (no camera coverage was used).',
    };
    onFinishSession(summary);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // Determine instructions key: use guidedInstructionsKey if in guided mode
  const instructionText = definition.guidedInstructionsKey
    ? t(definition.guidedInstructionsKey as any)
    : t(definition.instructionsKey as any);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <MangaCard title={t(definition.nameKey as any)} badge="Accessible Guided Mode">
        {/* Honest Mode Explanation */}
        <div className="p-3 mb-4 bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
          <span>Camera not active. Equal participation XP awarded upon completion.</span>
          <span className="font-mono text-[10px] uppercase font-bold text-[var(--cyan-dim)]">
            State: {sessionState}
          </span>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
          {instructionText}
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
              className="px-3 py-1.5 text-xs font-bold border border-[var(--border-color)] disabled:opacity-40"
            >
              Previous Step
            </button>
            <button
              onClick={handleNextStep}
              disabled={currentStepIdx === steps.length - 1}
              className="px-3 py-1.5 text-xs font-bold bg-[var(--cyan)] border border-[var(--border-color)] text-[var(--ink)] disabled:opacity-40"
            >
              {sessionState === 'active' ? 'Next Step & Count Interval' : 'Next Step'}
            </button>
          </div>
        </div>

        {/* Unstarted Guard Warning */}
        {sessionState === 'preview' && (
          <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Click &quot;Begin Practice&quot; below to start your timer and record intervals.</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTimer}
              className="touch-target px-5 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-sm border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] flex items-center gap-2"
            >
              {sessionState === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {sessionState === 'preview'
                ? t('action.start')
                : sessionState === 'active'
                ? t('action.pause')
                : t('action.resume')}
            </button>

            {/* Manual interval button: disabled in preview state */}
            <button
              onClick={handleRecordInterval}
              disabled={sessionState !== 'active'}
              title={sessionState !== 'active' ? 'Start practice first to record intervals' : 'Record interval'}
              className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] font-bold text-sm flex items-center gap-1.5 disabled:opacity-35 disabled:cursor-not-allowed"
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
              disabled={sessionState === 'preview' && manualCount === 0 && secondsElapsed === 0}
              className="touch-target px-5 py-2.5 bg-[var(--crimson)] text-white font-black text-sm border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] flex items-center gap-2 disabled:opacity-40"
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
