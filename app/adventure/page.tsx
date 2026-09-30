'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MangaCard } from '@/components/system/MangaCard';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { ProgressionState } from '@/lib/game/types';
import { INITIAL_PROGRESSION_STATE } from '@/lib/game/progression';
import { WalletState, DEFAULT_WALLET_STATE } from '@/lib/avatar/types';
import {
  MapPin,
  CheckCircle,
  Compass,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Calendar,
} from 'lucide-react';

interface AdventureDay {
  day: number;
  title: string;
  theme: string;
  lore: string;
  recommendedMovement: string;
  focusArea: string;
}

const FIRST_WEEK_ADVENTURE: AdventureDay[] = [
  {
    day: 1,
    title: 'The Awakening Footing',
    theme: 'Ground Contact & Base Stance',
    lore: 'Your journey begins with grounded balance. Feel your weight settle evenly between heel and midfoot.',
    recommendedMovement: 'Mindful Squats (Standing) or Seated Chair Rooting',
    focusArea: 'Legs & Core',
  },
  {
    day: 2,
    title: 'Rhythm of the Kinetic Breath',
    theme: 'Tempo & Joint Synchronization',
    lore: 'Control before velocity. Match joint flexion with calm, nasal inhalations and exhales.',
    recommendedMovement: 'Elbow Flexion Cadence or Gentle Arm Sweeps',
    focusArea: 'Arms & Shoulders',
  },
  {
    day: 3,
    title: 'The Core of Stillness',
    theme: 'Spinal Alignment & Midline Integrity',
    lore: 'Even in explosive agility, true force radiates outward from an unbroken, stabilized center.',
    recommendedMovement: 'Seated Postural Hold or Controlled Squat Pauses',
    focusArea: 'Core & Back',
  },
  {
    day: 4,
    title: 'Tension & Release',
    theme: 'Muscle Activation Awareness',
    lore: 'Distinguish passive collapse from intentional muscular contraction. Feel the lat wings engage.',
    recommendedMovement: 'Back Pinch Retractions or Seated Arm Lifts',
    focusArea: 'Back & Chest',
  },
  {
    day: 5,
    title: 'Echoes of the Wild',
    theme: 'Dynamic Acceleration & Deceleration',
    lore: 'The primal spirit tests your ability to stop safely. Athletic deceleration precedes safe acceleration.',
    recommendedMovement: 'Sports Stance Drill or Gentle Knee Drives',
    focusArea: 'Full Body Kinetics',
  },
  {
    day: 6,
    title: 'The Threshold Gate',
    theme: 'Primal Awakening Alignment',
    lore: 'All 6 physical domains converge. The primal spirits of the Wolf and the Tiger take notice of your discipline.',
    recommendedMovement: 'Complete Practice Session + Thoughtful Reflection',
    focusArea: 'Awakening Threshold',
  },
  {
    day: 7,
    title: 'Apex Harmony',
    theme: 'Recovery Literacy & Master Rest',
    lore: 'Rest is not absence of practice; it is the vital forge where fantasy muscle and nervous systems adapt.',
    recommendedMovement: 'Restful Reflection & Mindful Recovery Check-in',
    focusArea: 'Mindful Recovery Parity',
  },
];

export default function AdventurePage() {
  const [progression, setProgression] = useState<ProgressionState>(INITIAL_PROGRESSION_STATE);
  const [wallet, setWallet] = useState<WalletState>(DEFAULT_WALLET_STATE);

  useEffect(() => {
    Promise.all([
      defaultStorage.getProgression(),
      defaultStorage.getWallet(),
    ]).then(([progData, walletData]) => {
      if (progData) setProgression(progData);
      if (walletData) setWallet(walletData);
    });
  }, []);

  const completedDaysCount = Object.keys(progression.dailyLedgers || {}).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-black uppercase bg-[var(--cyan)] text-[var(--ink)] border border-[var(--border-color)]">
              Week 1
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Awakening Odyssey
            </h1>
          </div>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1">
            Turn five minutes of daily movement into your next fantasy adventure chapter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="manga-panel px-4 py-2 bg-[var(--paper)] border-2 border-[var(--border-color)] flex items-center gap-2 shadow-[2px_2px_0px_var(--border-color)]">
            <Calendar className="w-4 h-4 text-[var(--cyan-dim)]" />
            <span className="text-xs font-black uppercase text-[var(--text-secondary)]">Days Logged:</span>
            <span className="text-base font-black">{completedDaysCount} / 7 Days</span>
          </div>

          <div className="manga-panel px-4 py-2 bg-[var(--surface-panel)] border-2 border-[var(--border-color)] flex items-center gap-2 shadow-[2px_2px_0px_var(--border-color)]">
            <Zap className="w-4 h-4 text-[var(--cyan-dim)]" />
            <span className="text-xs font-black uppercase text-[var(--text-secondary)]">Wallet:</span>
            <span className="text-base font-black text-[var(--cyan-dim)]">{wallet.growthPoints} GP</span>
          </div>
        </div>
      </div>

      {/* Narrative Adventure Node Track */}
      <div className="space-y-4">
        {FIRST_WEEK_ADVENTURE.map((chapter) => {
          const isCompleted = completedDaysCount >= chapter.day;
          const isCurrent = completedDaysCount === chapter.day - 1;
          const isLocked = completedDaysCount < chapter.day - 1;

          return (
            <div
              key={chapter.day}
              className={`manga-panel p-5 border-2 transition-all ${
                isCompleted
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400'
                  : isCurrent
                  ? 'bg-[var(--surface-inset)] border-[var(--cyan)] shadow-[3px_3px_0px_var(--cyan)]'
                  : 'bg-[var(--surface-panel)] border-[var(--border-color)] opacity-70'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Node Badge Icon */}
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : isCurrent
                        ? 'bg-[var(--cyan)] text-[var(--ink)] border-[var(--border-color)] animate-pulse'
                        : 'bg-[var(--surface-panel)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : isCurrent ? (
                      `D${chapter.day}`
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>

                  {/* Chapter Information */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-[var(--text-secondary)]">
                        Day {chapter.day} Chapter
                      </span>
                      <span className="text-[11px] text-[var(--border-color)]">|</span>
                      <span className="text-[11px] font-extrabold text-[var(--cyan-dim)] uppercase">
                        {chapter.theme}
                      </span>
                    </div>

                    <h3 className="text-lg font-black uppercase tracking-tight mt-0.5">
                      {chapter.title}
                    </h3>

                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                      {chapter.lore}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs font-bold text-[var(--text-primary)]">
                      <span className="text-[var(--text-secondary)] font-normal">Focus:</span>
                      <span>{chapter.focusArea}</span>
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="flex items-center gap-2 md:self-center shrink-0">
                  {isCompleted ? (
                    <span className="px-3 py-1.5 text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Completed
                    </span>
                  ) : isCurrent ? (
                    <Link
                      href="/workout"
                      className="touch-target px-5 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center gap-2"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Start Day {chapter.day} Practice</span>
                    </Link>
                  ) : (
                    <span className="px-3 py-1 text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
