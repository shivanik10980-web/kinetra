'use client';

import React, { useState } from 'react';
import { SportsSessionSummary } from '@/lib/sports/types';
import { useTranslation } from '@/lib/i18n/context';
import { MangaCard } from '../system/MangaCard';
import { applyReward } from '@/lib/game/progression';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { Award, CheckCircle, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface DrillReviewModalProps {
  summary: SportsSessionSummary;
  onClose: () => void;
}

export const DrillReviewModal: React.FC<DrillReviewModalProps> = ({ summary, onClose }) => {
  const { t } = useTranslation();

  const [reflection, setReflection] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [awardedXp, setAwardedXp] = useState(0);

  const dateKey = new Date().toISOString().split('T')[0];

  const handleSaveAndClaim = async () => {
    if (isSaved) return;

    // Save sports drill as a session
    const fullSession = {
      id: summary.id,
      movement: `sports_${summary.sportId}_${summary.drillId}` as any,
      variantId: summary.drillId,
      source: summary.source,
      startedAt: summary.startedAt,
      endedAt: summary.endedAt,
      totalActiveTimeSec: summary.durationSec,
      totalValidTrackingTimeSec: Math.round((summary.durationSec * summary.trackingCoverage) / 100),
      overallCoveragePercent: summary.trackingCoverage,
      totalRepsCompleted: summary.completedIntervals,
      scoredRepsCount: summary.completedIntervals,
      medianQScore: summary.meanConfidence ? Math.round(summary.meanConfidence * 100) : null,
      isPreliminary: false,
      repDetails: [],
      observedCueIds: Object.keys(summary.observedCuesCount) as any,
      userReflection: reflection || undefined,
    };
    await defaultStorage.saveSession(fullSession);

    // Apply XP to ledger
    let prog = await defaultStorage.getProgression();
    const slotRes = applyReward(prog, {
      eventId: `sports_slot_${summary.id}`,
      type: 'slot',
      source: summary.source,
      dateKey,
      details: { movement: `sports_${summary.drillId}` },
    });

    let totalGained = slotRes.awardedXp;
    prog = slotRes.newState;

    if (reflection.trim().length > 3) {
      const reflectRes = applyReward(prog, {
        eventId: `sports_reflect_${summary.id}`,
        type: 'reflection',
        source: summary.source,
        dateKey,
      });
      totalGained += reflectRes.awardedXp;
      prog = reflectRes.newState;
    }

    await defaultStorage.saveProgression(prog);
    setAwardedXp(totalGained);
    setIsSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <MangaCard title="Drill Evidence Summary" badge="SPORTS SKILL LAB">
          {/* Main Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                Completed Intervals
              </div>
              <div className="text-3xl font-black mt-1">{summary.completedIntervals}</div>
            </div>

            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                Duration
              </div>
              <div className="text-3xl font-black mt-1 font-mono">{summary.durationSec}s</div>
            </div>

            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                Coverage
              </div>
              <div className="text-3xl font-black mt-1">{summary.trackingCoverage}%</div>
            </div>

            <div className="manga-panel p-3 bg-[var(--surface-inset)] text-center">
              <div className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)]">
                Confidence
              </div>
              <div className="text-3xl font-black mt-1 text-[var(--cyan-dim)]">
                {summary.meanConfidence !== null ? `${Math.round(summary.meanConfidence * 100)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Transparent Evidence / Unknowns Card */}
          <div className="manga-panel p-4 mb-6 bg-[var(--surface-panel)] border-l-4 border-l-[var(--cyan)]">
            <h4 className="font-extrabold text-xs uppercase text-[var(--text-secondary)] mb-2">
              Transparent Observation Accounting
            </h4>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Observed Evidence:</strong> Stance dwell, movement transitions, posture stability.
                </span>
              </div>
              {summary.unknownItems.length > 0 ? (
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-2 border border-amber-300">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Items Left Unknown:</strong>{' '}
                    {summary.unknownItems.join(', ')}. (Never substituted with a fabricated score).
                  </div>
                </div>
              ) : (
                <div className="text-[var(--text-secondary)]">
                  All expected camera joints remained within required confidence thresholds.
                </div>
              )}
            </div>
          </div>

          {/* Reflection */}
          {!isSaved && (
            <div className="mb-6 flex flex-col gap-2">
              <label htmlFor="sports-reflection" className="font-extrabold text-sm flex items-center justify-between">
                <span>Drill Reflection & Balance Note</span>
                <span className="text-xs text-[var(--violet-dim)] font-bold">+10 XP</span>
              </label>
              <textarea
                id="sports-reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="How did your stance, footwork, and deceleration feel?"
                rows={2}
                className="w-full p-3 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] text-sm resize-none"
              />
            </div>
          )}

          {/* Saved State Success Notification */}
          {isSaved && (
            <div className="manga-panel p-4 mb-6 bg-[var(--paper)] border-2 border-[var(--border-color)] text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-black text-lg uppercase tracking-wide">
                Sports Practice Logged
              </div>
              <div className="text-sm font-extrabold text-[var(--cyan-dim)] mt-1">
                +{awardedXp} XP Awarded Today (Capped at 40 XP/day)
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-[var(--border-color)]">
            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Equal participation XP parity
            </span>
            <div className="flex items-center gap-3">
              {!isSaved ? (
                <button
                  onClick={handleSaveAndClaim}
                  className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  Save & Claim XP
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="touch-target px-6 py-2.5 bg-[var(--paper)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] flex items-center gap-2"
                >
                  Finish
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
