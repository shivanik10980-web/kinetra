'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { ExerciseDefinition, ExerciseVariant, MovementType, SessionSummary } from '@/lib/exercises/types';
import { SQUAT_DEFINITION } from '@/lib/exercises/squat';
import { ELBOW_FLEXION_DEFINITION } from '@/lib/exercises/elbow-flexion';
import { SEATED_GUIDED_DEFINITION, RECOVERY_CHECKIN_DEFINITION } from '@/lib/exercises/seated-guided';
import { PoseCamera } from '@/components/workout/PoseCamera';
import { GuidedWorkout } from '@/components/workout/GuidedWorkout';
import { SessionReviewModal } from '@/components/workout/SessionReviewModal';
import { MangaCard } from '@/components/system/MangaCard';
import { Compass, Camera, HeartHandshake, Sliders, Check } from 'lucide-react';

const EXERCISES: Record<MovementType, ExerciseDefinition> = {
  squat: SQUAT_DEFINITION,
  elbow_flexion: ELBOW_FLEXION_DEFINITION,
  seated_guided: SEATED_GUIDED_DEFINITION,
  recovery_checkin: RECOVERY_CHECKIN_DEFINITION,
};

function WorkoutPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialMode = searchParams.get('mode') === 'guided' ? 'guided' : 'camera';
  const initialMovement = (searchParams.get('movement') as MovementType) || 'squat';

  const [selectedMovement, setSelectedMovement] = useState<MovementType>(
    initialMode === 'guided' && initialMovement === 'squat' ? 'seated_guided' : initialMovement
  );
  const [selectedMode, setSelectedMode] = useState<'camera' | 'guided'>(initialMode);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [finishedSummary, setFinishedSummary] = useState<SessionSummary | null>(null);

  const activeDefinition = EXERCISES[selectedMovement] || SQUAT_DEFINITION;
  const activeVariant = activeDefinition.variants[selectedVariantIdx] || activeDefinition.variants[0];

  const handleSelectMovement = (movement: MovementType) => {
    setSelectedMovement(movement);
    setSelectedVariantIdx(0);
    if (movement === 'seated_guided' || movement === 'recovery_checkin') {
      setSelectedMode('guided');
    }
  };

  const handleFinishSession = (summary: SessionSummary) => {
    setFinishedSummary(summary);
  };

  const handleReviewClose = () => {
    setFinishedSummary(null);
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            Movement Practice
          </h1>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1">
            Deterministic observation • No forced depth • Safe participation
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-1 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] p-1">
          <button
            onClick={() => setSelectedMode('camera')}
            disabled={selectedMovement === 'seated_guided' || selectedMovement === 'recovery_checkin'}
            className={`touch-target px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1.5 transition-colors ${
              selectedMode === 'camera'
                ? 'bg-[var(--cyan)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Camera Vision
          </button>
          <button
            onClick={() => setSelectedMode('guided')}
            className={`touch-target px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1.5 transition-colors ${
              selectedMode === 'guided'
                ? 'bg-[var(--cyan)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Guided Mode
          </button>
        </div>
      </div>

      {/* Movement & Variant Selection Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['squat', 'elbow_flexion', 'seated_guided', 'recovery_checkin'] as MovementType[]).map((id) => {
          const def = EXERCISES[id];
          const isSelected = selectedMovement === id;
          return (
            <button
              key={id}
              onClick={() => handleSelectMovement(id)}
              className={`manga-panel p-3 text-left transition-all ${
                isSelected
                  ? 'border-[var(--border-color)] bg-[var(--cyan-subtle)] shadow-[3px_3px_0px_var(--border-color)] translate-y-[-2px]'
                  : 'bg-[var(--surface-panel)] hover:bg-[var(--surface-inset)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-black text-[var(--text-secondary)]">
                  {def.category}
                </span>
                {isSelected && <Check className="w-4 h-4 text-[var(--cyan-dim)]" />}
              </div>
              <div className="font-black text-sm uppercase leading-tight">
                {t(def.nameKey as any)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Variant Selector (if camera exercise has variants) */}
      {selectedMode === 'camera' && activeDefinition.variants.length > 1 && (
        <div className="manga-panel p-3 bg-[var(--surface-inset)] flex items-center gap-3 flex-wrap">
          <span className="text-xs font-extrabold uppercase text-[var(--text-secondary)] flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" />
            Comfort Range Profile:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {activeDefinition.variants.map((variant, idx) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantIdx(idx)}
                className={`px-3 py-1 text-xs font-bold border transition-colors ${
                  selectedVariantIdx === idx
                    ? 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                }`}
              >
                {t(variant.nameKey as any)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Practice Workspace */}
      <div className="mt-2">
        {selectedMode === 'camera' ? (
          <PoseCamera
            definition={activeDefinition}
            variant={activeVariant}
            onFinishSession={handleFinishSession}
            onSwitchToGuided={() => setSelectedMode('guided')}
          />
        ) : (
          <GuidedWorkout
            definition={activeDefinition}
            onFinishSession={handleFinishSession}
            onSwitchToCamera={
              selectedMovement === 'squat' || selectedMovement === 'elbow_flexion'
                ? () => setSelectedMode('camera')
                : undefined
            }
          />
        )}
      </div>

      {/* Session Review Modal */}
      {finishedSummary && (
        <SessionReviewModal
          summary={finishedSummary}
          onClose={handleReviewClose}
        />
      )}
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold">Loading Workout System...</div>}>
      <WorkoutPageContent />
    </Suspense>
  );
}

