'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { ProgressionState, BadgeId } from '@/lib/game/types';
import { INITIAL_PROGRESSION_STATE, applyReward } from '@/lib/game/progression';
import { MangaCard } from '@/components/system/MangaCard';
import {
  Award,
  CheckCircle,
  Clock,
  HeartHandshake,
  Shield,
  Trophy,
  Zap,
  Lock,
  Compass,
  ArrowRight,
} from 'lucide-react';

export default function QuestsPage() {
  const { t } = useTranslation();

  const [progression, setProgression] = useState<ProgressionState>(INITIAL_PROGRESSION_STATE);
  const [restRecordedToday, setRestRecordedToday] = useState(false);

  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    defaultStorage.getProgression().then((prog) => {
      setProgression(prog);
      const today = prog.dailyLedgers[todayKey];
      if (today && today.slotFlag) {
        setRestRecordedToday(true);
      }
    });
  }, [todayKey]);

  const todayLedger = progression.dailyLedgers[todayKey] || {
    dateKey: todayKey,
    slotFlag: false,
    reflectionFlag: false,
    xpEarned: 0,
    eventIds: [],
  };

  const handleRecordRestDay = async () => {
    if (todayLedger.slotFlag) return;

    const res = applyReward(progression, {
      eventId: `rest_${todayKey}`,
      type: 'slot',
      source: 'guided',
      dateKey: todayKey,
      details: { movement: 'recovery_checkin' },
    });

    await defaultStorage.saveProgression(res.newState);
    setProgression(res.newState);
    setRestRecordedToday(true);
  };

  const handleCompleteBossLearnStage = async () => {
    const updatedBoss = { ...progression.boss };
    updatedBoss.stageProgress.learn = true;
    if (
      updatedBoss.stageProgress.learn &&
      updatedBoss.stageProgress.practise_adapt &&
      updatedBoss.stageProgress.reflect_recover &&
      !updatedBoss.clearedAt
    ) {
      updatedBoss.currentStage = 'cleared';
      updatedBoss.clearedAt = new Date().toISOString();
    }
    const updatedProgression = { ...progression, boss: updatedBoss };
    await defaultStorage.saveProgression(updatedProgression);
    setProgression(updatedProgression);
  };

  const badgesList: { id: BadgeId; name: string; desc: string }[] = [
    {
      id: 'first_checkin',
      name: 'First Check-in',
      desc: 'Completed your first movement or reflection slot.',
    },
    {
      id: 'viewfinder',
      name: 'Viewfinder',
      desc: 'Completed a practice session with live camera calibration.',
    },
    {
      id: 'thoughtful_pause',
      name: 'Thoughtful Pause',
      desc: 'Utilized pause or reported discomfort without penalty.',
    },
    {
      id: 'three_practice_days',
      name: 'Three Practice Days',
      desc: 'Showed up for practice or mindful recovery across 3 calendar days.',
    },
    {
      id: 'mobility_explorer',
      name: 'Mobility Explorer',
      desc: 'Completed an accessible seated flow or recovery check-in.',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Top Header */}
      <div className="border-b-2 border-[var(--border-color)] pb-4">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
          {t('quests.title')}
        </h1>
        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1">
          Flexible non-punitive mission rhythm • Equal rest parity
        </p>
      </div>

      {/* Daily Flexible Mission Card */}
      <section className="manga-panel bracket-frame p-6 bg-[var(--surface-panel)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--border-color)] pb-4 mb-6">
          <div>
            <span className="badge-status bg-[var(--cyan)] text-[var(--ink)] mb-2 shadow-[2px_2px_0px_var(--border-color)]">
              DAILY FLEXIBLE MISSION
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight">
              {t('quests.daily_mission')}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {t('quests.daily_desc')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">
              Today&apos;s XP Earned
            </div>
            <div className="text-3xl font-black tabular-nums text-[var(--cyan-dim)]">
              {todayLedger.xpEarned} / 60 XP
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Movement Slot */}
          <div className="manga-panel p-4 bg-[var(--surface-inset)] flex items-start justify-between gap-4">
            <div>
              <div className="font-black text-base uppercase flex items-center gap-2">
                {todayLedger.slotFlag ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Zap className="w-5 h-5 text-[var(--cyan-dim)]" />
                )}
                Movement Practice Slot
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Complete any 1 squat set, elbow practice, or seated guided flow.
              </p>
              <div className="text-xs font-bold text-[var(--cyan-dim)] mt-2">
                {todayLedger.slotFlag ? t('quests.slot_done') : t('quests.slot_pending')}
              </div>
            </div>
            {!todayLedger.slotFlag && (
              <Link
                href="/workout"
                className="touch-target px-4 py-2 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)]"
              >
                Start
              </Link>
            )}
          </div>

          {/* Reflection Slot */}
          <div className="manga-panel p-4 bg-[var(--surface-inset)] flex items-start justify-between gap-4">
            <div>
              <div className="font-black text-base uppercase flex items-center gap-2">
                {todayLedger.reflectionFlag ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-[var(--violet-dim)]" />
                )}
                Mindful Reflection Slot
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Submit a short reflection after your session on how your body felt.
              </p>
              <div className="text-xs font-bold text-[var(--violet-dim)] mt-2">
                {todayLedger.reflectionFlag ? t('quests.reflection_done') : t('quests.reflection_pending')}
              </div>
            </div>
          </div>
        </div>

        {/* Rest Alternative Option */}
        <div className="mt-6 p-4 border-2 border-dashed border-[var(--border-color)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-extrabold text-sm uppercase">
                {t('quests.rest_alternative')}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {t('quests.rest_desc')}
              </p>
            </div>
          </div>
          <button
            onClick={handleRecordRestDay}
            disabled={todayLedger.slotFlag}
            className="touch-target px-4 py-2 bg-[var(--surface-panel)] text-[var(--text-primary)] font-black text-xs border-2 border-[var(--border-color)] hover:bg-[var(--cyan)] disabled:opacity-40"
          >
            {todayLedger.slotFlag ? 'Slot Already Recorded Today' : t('quests.claim_rest')}
          </button>
        </div>
      </section>

      {/* Personal Boss: The Static Gate */}
      <section className="manga-panel p-6 bg-[var(--surface-panel)]">
        <div className="badge-status bg-[var(--violet-subtle)] text-[var(--violet-dim)] mb-2">
          PERSONAL BOSS CHALLENGE
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-1">
          {t('quests.boss_title')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {t('quests.boss_desc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stage 1: Learn */}
          <div className="manga-panel p-4 bg-[var(--surface-inset)] border-l-4 border-l-[var(--cyan)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase text-[var(--text-secondary)]">Stage 1</span>
              {progression.boss.stageProgress.learn ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="text-xs font-bold text-amber-500">Incomplete</span>
              )}
            </div>
            <h3 className="font-extrabold text-sm mb-2">{t('quests.stage_1')}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Review posture instructions and understand comfortable excursion limits.
            </p>
            {!progression.boss.stageProgress.learn && (
              <button
                onClick={handleCompleteBossLearnStage}
                className="px-3 py-1.5 bg-[var(--cyan)] text-[var(--ink)] font-bold text-xs border border-[var(--border-color)]"
              >
                Review & Learn
              </button>
            )}
          </div>

          {/* Stage 2: Practise or Adapt */}
          <div className="manga-panel p-4 bg-[var(--surface-inset)] border-l-4 border-l-[var(--cyan)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase text-[var(--text-secondary)]">Stage 2</span>
              {progression.boss.stageProgress.practise_adapt ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="text-xs font-bold text-amber-500">Incomplete</span>
              )}
            </div>
            <h3 className="font-extrabold text-sm mb-2">{t('quests.stage_2')}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Complete at least 1 camera practice or guided adaptation session.
            </p>
            <Link
              href="/workout"
              className="text-xs font-bold text-[var(--cyan-dim)] underline hover:text-[var(--text-primary)]"
            >
              Go to Practice
            </Link>
          </div>

          {/* Stage 3: Reflect & Recover */}
          <div className="manga-panel p-4 bg-[var(--surface-inset)] border-l-4 border-l-[var(--violet)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase text-[var(--text-secondary)]">Stage 3</span>
              {progression.boss.stageProgress.reflect_recover ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="text-xs font-bold text-amber-500">Incomplete</span>
              )}
            </div>
            <h3 className="font-extrabold text-sm mb-2">{t('quests.stage_3')}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Submit a thoughtful post-workout reflection or record a recovery rest day.
            </p>
          </div>
        </div>

        {progression.boss.currentStage === 'cleared' && (
          <div className="mt-4 p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-extrabold text-sm text-center">
            {t('quests.gate_cleared')}
          </div>
        )}
      </section>

      {/* Badges Section */}
      <section>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
          {t('quests.badges_title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badgesList.map((badge) => {
            const isUnlocked = progression.unlockedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`manga-panel p-4 relative ${
                  isUnlocked ? 'bg-[var(--surface-panel)]' : 'bg-[var(--surface-inset)] opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-9 h-9 border-2 border-[var(--border-color)] flex items-center justify-center ${
                      isUnlocked ? 'bg-[var(--cyan)] text-[var(--ink)]' : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {isUnlocked ? <Trophy className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase">{badge.name}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {badge.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
