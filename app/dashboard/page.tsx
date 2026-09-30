'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { ProgressionState } from '@/lib/game/types';
import { INITIAL_PROGRESSION_STATE } from '@/lib/game/progression';
import { SessionSummary } from '@/lib/exercises/types';
import { MangaCard } from '@/components/system/MangaCard';
import { calculateConsistencyScore, calculateMobilityPracticeScore } from '@/lib/scoring/metrics';
import {
  Activity,
  Award,
  Calendar,
  Compass,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();

  const [progression, setProgression] = useState<ProgressionState>(INITIAL_PROGRESSION_STATE);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [todayXp, setTodayXp] = useState<number>(0);

  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    defaultStorage.getProgression().then((prog) => {
      setProgression(prog);
      const todayLedger = prog.dailyLedgers[todayKey];
      setTodayXp(todayLedger ? todayLedger.xpEarned : 0);
    });
    defaultStorage.getSessions().then(setSessions);
  }, [todayKey]);

  // Derived metrics
  const scoredSessions = sessions.filter((s) => s.medianQScore !== null);
  const overallMedianQ =
    scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((acc, s) => acc + (s.medianQScore || 0), 0) / scoredSessions.length
        )
      : null;

  // Consistency: past 7 days slots
  const daysInPastWeek = 7;
  const fulfilledDays = Object.values(progression.dailyLedgers).filter((l) => l.slotFlag).length;
  const consistency = calculateConsistencyScore(fulfilledDays, daysInPastWeek);

  // Mobility practice
  const mobilitySessions = sessions.filter(
    (s) => s.movement === 'seated_guided' || s.movement === 'recovery_checkin'
  );
  const mobilityScore = calculateMobilityPracticeScore(mobilitySessions.length, Math.max(1, fulfilledDays));

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Guest Practitioner • Local Sandbox
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/workout"
            className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>{t('action.start')}</span>
          </Link>
        </div>
      </div>

      {/* Main Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level & Rank */}
        <MangaCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">
              {t('dashboard.level')} & {t('dashboard.rank')}
            </span>
            <Trophy className="w-4 h-4 text-[var(--amber)]" />
          </div>
          <div className="text-3xl font-black">
            Lv.{progression.level} <span className="text-xl text-[var(--violet-dim)]">{progression.rank}</span>
          </div>
          <div className="text-xs font-bold text-[var(--text-secondary)] mt-2">
            {progression.xpToNextRank !== null
              ? `${progression.xpToNextRank} XP to next rank`
              : 'Max Rank Achieved'}
          </div>
        </MangaCard>

        {/* Daily XP Cap Meter */}
        <MangaCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">
              {t('dashboard.xp_today')}
            </span>
            <Zap className="w-4 h-4 text-[var(--cyan-dim)]" />
          </div>
          <div className="text-3xl font-black tabular-nums">
            {todayXp} <span className="text-base text-[var(--text-secondary)] font-bold">/ 60 XP</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-[var(--surface-inset)] h-2.5 border border-[var(--border-color)] mt-3">
            <div
              className="bg-[var(--cyan)] h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (todayXp / 60) * 100)}%` }}
            />
          </div>
        </MangaCard>

        {/* Weekly Consistency */}
        <MangaCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">
              {t('dashboard.consistency_score')}
            </span>
            <Calendar className="w-4 h-4 text-[var(--violet)]" />
          </div>
          <div className="text-3xl font-black">
            {consistency.score !== null ? `${consistency.score}%` : '—'}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">
            {consistency.fulfilled} of {consistency.total} planned days completed
          </div>
        </MangaCard>

        {/* Technique Estimate (Q) */}
        <MangaCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">
              {t('dashboard.technique_score')}
            </span>
            <Activity className="w-4 h-4 text-[var(--cyan)]" />
          </div>
          <div className="text-3xl font-black text-[var(--cyan-dim)]">
            {overallMedianQ !== null ? overallMedianQ : '—'}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">
            {overallMedianQ !== null ? 'Median scored cycle index' : t('dashboard.technique_null')}
          </div>
        </MangaCard>
      </div>

      {/* Quest Banner & Next Flexible Mission */}
      <div className="manga-panel bracket-frame p-6 bg-[var(--surface-panel)] flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <div className="badge-status bg-[var(--violet-subtle)] text-[var(--violet-dim)] mb-2">
            DAILY MISSION
          </div>
          <h2 className="text-xl font-black uppercase tracking-wide">
            {t('quests.daily_mission')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('quests.daily_desc')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/quests"
            className="touch-target px-5 py-2.5 bg-[var(--paper)] text-[var(--ink)] font-black text-sm border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] flex items-center gap-2"
          >
            <span>View Quest Board</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent History Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
            {t('dashboard.recent_history')}
          </h2>
          {sessions.length > 0 && (
            <Link
              href="/history"
              className="text-xs font-bold text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
            >
              View Full History
            </Link>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="manga-panel p-8 text-center bg-[var(--surface-inset)]">
            <Compass className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-60" />
            <h3 className="font-extrabold text-base uppercase mb-1">
              {t('dashboard.no_sessions')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-4">
              Begin with squat practice, single arm flexion, or a calm seated flow.
            </p>
            <Link
              href="/workout"
              className="touch-target px-6 py-2 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] inline-flex items-center gap-1.5"
            >
              Start Session
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse manga-panel text-sm bg-[var(--surface-panel)]">
              <thead>
                <tr className="border-b-2 border-[var(--border-color)] bg-[var(--surface-inset)] text-[var(--text-secondary)] text-xs uppercase font-extrabold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Movement</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Reps</th>
                  <th className="p-3">Technique (Q)</th>
                  <th className="p-3">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border-color)] hover:bg-[var(--surface-inset)]">
                    <td className="p-3 font-mono text-xs">{new Date(s.startedAt).toLocaleDateString()}</td>
                    <td className="p-3 font-bold uppercase">{s.movement.replace('_', ' ')}</td>
                    <td className="p-3">
                      <span className="badge-status text-[11px] bg-[var(--paper)] text-[var(--ink)]">
                        {s.source}
                      </span>
                    </td>
                    <td className="p-3 font-bold">{s.totalRepsCompleted}</td>
                    <td className="p-3 font-black text-[var(--cyan-dim)]">
                      {s.medianQScore !== null ? s.medianQScore : '—'}
                    </td>
                    <td className="p-3">{s.overallCoveragePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Local-First Architecture Guarantee Card */}
      <div className="manga-panel p-4 bg-[var(--surface-inset)] border border-[var(--border-color)] flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t('dashboard.offline_status')}</span>
        </div>
        <Link href="/profile" className="underline hover:text-[var(--text-primary)]">
          Inspect Privacy Consent
        </Link>
      </div>
    </div>
  );
}
