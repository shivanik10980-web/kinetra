'use client';

import React, { useState } from 'react';
import { SessionSummary } from '@/lib/exercises/types';
import { useTranslation } from '@/lib/i18n/context';
import { MangaCard } from '../system/MangaCard';
import { applyReward } from '@/lib/game/progression';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { sanitizeSessionForCloudCoach } from '@/lib/privacy/consent';
import {
  Award,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';

interface SessionReviewModalProps {
  summary: SessionSummary;
  onClose: () => void;
}

export const SessionReviewModal: React.FC<SessionReviewModalProps> = ({ summary, onClose }) => {
  const { t, locale } = useTranslation();

  const [reflectionText, setReflectionText] = useState('');
  const [effort, setEffort] = useState<'comfortable' | 'moderate' | 'challenging' | 'restorative'>('comfortable');
  const [isSaved, setIsSaved] = useState(false);
  const [awardedXp, setAwardedXp] = useState<number>(0);
  const [coachExplanation, setCoachExplanation] = useState<string | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);

  const dateKey = new Date().toISOString().split('T')[0];

  const handleSaveAndClaim = async () => {
    if (isSaved) return;

    // 1. Save session to local IndexedDB
    const updatedSummary: SessionSummary = {
      ...summary,
      userReflection: reflectionText || undefined,
      selfReportedEffort: effort,
    };
    await defaultStorage.saveSession(updatedSummary);

    // 2. Apply XP rewards
    let currentProgression = await defaultStorage.getProgression();

    // Reward for movement slot
    const slotRes = applyReward(currentProgression, {
      eventId: `slot_${summary.id}`,
      type: 'slot',
      source: summary.source,
      dateKey,
      details: {
        movement: summary.movement,
        hadPause: summary.observedCueIds.includes('TRACKING_PAUSED'),
      },
    });

    let totalGained = slotRes.awardedXp;
    currentProgression = slotRes.newState;

    // Reward for reflection if provided
    if (reflectionText.trim().length > 3) {
      const reflectRes = applyReward(currentProgression, {
        eventId: `reflect_${summary.id}`,
        type: 'reflection',
        source: summary.source,
        dateKey,
      });
      totalGained += reflectRes.awardedXp;
      currentProgression = reflectRes.newState;
    }

    await defaultStorage.saveProgression(currentProgression);

    setAwardedXp(totalGained);
    setIsSaved(true);
  };

  const handleAskCloudCoach = async () => {
    setIsLoadingCoach(true);
    try {
      const sanitizedPayload = sanitizeSessionForCloudCoach(summary, locale);
      const res = await fetch('/api/coach/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedPayload),
      });
      const data = await res.json();
      setCoachExplanation(data.explanation || data.localFallback);
    } catch {
      setCoachExplanation('Practice noted. Consistent steady rhythm supports mindful joint control.');
    } finally {
      setIsLoadingCoach(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <MangaCard title={t('review.title')} badge={summary.source.toUpperCase()}>
          {/* Main Stat Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                {t('review.reps_completed')}
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1">
                {summary.totalRepsCompleted}
              </div>
            </div>

            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                {t('review.scored_reps')}
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1">
                {summary.scoredRepsCount}
              </div>
            </div>

            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                {t('review.median_q')}
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1 text-[var(--cyan-dim)]">
                {summary.medianQScore !== null ? summary.medianQScore : '—'}
              </div>
            </div>

            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                {t('review.coverage')}
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1">
                {summary.overallCoveragePercent}%
              </div>
            </div>
          </div>

          {/* Explanation / Preliminary Notice */}
          {summary.source === 'live' && summary.medianQScore !== null && summary.isPreliminary && (
            <div className="p-3 mb-4 bg-amber-50 border-2 border-amber-400 text-amber-900 text-xs font-bold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>{t('review.preliminary_notice')}</span>
            </div>
          )}

          {summary.source === 'guided' && (
            <div className="p-3 mb-4 bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
              Accessible guided session. Equal 30 XP awarded; no artificial pose score generated.
            </div>
          )}

          {/* Score Formula Transparency Card */}
          <div className="p-3 mb-6 bg-[var(--surface-panel)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
            <span className="font-extrabold text-[var(--text-primary)]">Score Calculation: </span>
            {t('review.q_formula_note')}
          </div>

          {/* Reflection Slot (+10 XP) */}
          {!isSaved && (
            <div className="mb-6 flex flex-col gap-2">
              <label htmlFor="session-reflection" className="font-extrabold text-sm flex items-center justify-between">
                <span>{t('review.reflection_prompt')}</span>
                <span className="text-xs text-[var(--violet-dim)] font-bold">+10 XP</span>
              </label>
              <textarea
                id="session-reflection"
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder={t('review.reflection_placeholder')}
                rows={3}
                className="w-full p-3 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] text-sm focus:bg-[var(--surface-panel)] resize-none"
              />

              {/* Effort check */}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="text-xs font-bold text-[var(--text-secondary)]">Pacing:</span>
                {(['comfortable', 'moderate', 'challenging', 'restorative'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEffort(mode)}
                    className={`px-2.5 py-1 text-xs font-bold border ${
                      effort === mode
                        ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)]'
                        : 'border-gray-300 text-gray-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved State Success Notification */}
          {isSaved && (
            <div className="manga-panel p-4 mb-6 bg-[var(--paper)] border-2 border-[var(--border-color)] text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-black text-lg uppercase tracking-wide">
                Session Saved to Local Ledger
              </div>
              <div className="text-sm font-extrabold text-[var(--cyan-dim)] mt-1">
                +{awardedXp} XP Awarded Today (Capped at 40 XP/day)
              </div>
            </div>
          )}

          {/* Optional Cloud Coach Explanation */}
          {coachExplanation && (
            <div className="manga-panel p-4 mb-6 bg-[var(--surface-inset)] border-l-4 border-l-[var(--violet)]">
              <div className="text-xs font-bold text-[var(--violet-dim)] uppercase mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Coach Observation Note
              </div>
              <p className="text-sm font-medium leading-relaxed">{coachExplanation}</p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-[var(--border-color)]">
            <div>
              {!coachExplanation && !isLoadingCoach && (
                <button
                  type="button"
                  onClick={handleAskCloudCoach}
                  className="text-xs font-bold text-[var(--text-secondary)] underline hover:text-[var(--text-primary)] flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  Ask Optional Coach (Privacy-sanitized)
                </button>
              )}
              {isLoadingCoach && (
                <span className="text-xs font-bold text-[var(--text-secondary)]">Analyzing summary...</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isSaved ? (
                <button
                  onClick={handleSaveAndClaim}
                  className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  {t('review.save_with_reflection')}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="touch-target px-6 py-2.5 bg-[var(--paper)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] flex items-center gap-2"
                >
                  {t('action.close')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </MangaCard>
      </div>
    </div>
  );
};
