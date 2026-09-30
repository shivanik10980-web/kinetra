'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MangaCard } from '@/components/system/MangaCard';
import { AvatarViewer } from '@/components/avatar/AvatarViewer';
import { defaultStorage } from '@/lib/storage/indexeddb';
import {
  MUSCLE_REGIONS,
  WEREWOLF_LINEAGE,
  TIGERHUMAN_LINEAGE,
  GAME_ECONOMY,
} from '@/lib/avatar/config';
import {
  AvatarCustomization,
  AvatarProgression,
  WalletState,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_AVATAR_PROGRESSION,
  DEFAULT_WALLET_STATE,
} from '@/lib/avatar/types';
import { ProgressionState } from '@/lib/game/types';
import { INITIAL_PROGRESSION_STATE } from '@/lib/game/progression';
import { checkEvolutionEligibility } from '@/lib/game/currency';
import {
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
  Palette,
  Map,
  Compass,
  Trophy,
  Award,
  ArrowRight,
} from 'lucide-react';

export default function CharacterHomePage() {
  const [customization, setCustomization] = useState<AvatarCustomization>(
    DEFAULT_AVATAR_CUSTOMIZATION
  );
  const [avatarProgression, setAvatarProgression] = useState<AvatarProgression>(
    DEFAULT_AVATAR_PROGRESSION
  );
  const [wallet, setWallet] = useState<WalletState>(DEFAULT_WALLET_STATE);
  const [gameProgression, setGameProgression] = useState<ProgressionState>(
    INITIAL_PROGRESSION_STATE
  );

  useEffect(() => {
    Promise.all([
      defaultStorage.getAvatar(),
      defaultStorage.getWallet(),
      defaultStorage.getProgression(),
    ]).then(([avatarData, walletData, progData]) => {
      if (avatarData?.customization) setCustomization(avatarData.customization);
      if (avatarData?.progression) setAvatarProgression(avatarData.progression);
      if (walletData) setWallet(walletData);
      if (progData) setGameProgression(progData);
    });
  }, []);

  const evolutionCheck = checkEvolutionEligibility(avatarProgression.muscleAllocation);
  const isAwakened = avatarProgression.evolutionStage === 'awakened';
  const lineageConfig =
    avatarProgression.lineage === 'werewolf'
      ? WEREWOLF_LINEAGE
      : avatarProgression.lineage === 'tigerhuman'
      ? TIGERHUMAN_LINEAGE
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Character Profile Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black uppercase tracking-tight">
              {customization.characterName}
            </h1>
            <span
              className={`px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] ${
                isAwakened
                  ? avatarProgression.lineage === 'werewolf'
                    ? 'bg-purple-900 text-purple-100'
                    : 'bg-amber-900 text-amber-100'
                  : 'bg-[var(--cyan)] text-[var(--ink)]'
              }`}
            >
              {isAwakened ? `Awakened ${avatarProgression.lineage}` : 'Human Lineage'}
            </span>
          </div>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1">
            Lv.{gameProgression.level} {gameProgression.rank} • Persistent Local Avatar
          </p>
        </div>

        {/* Currency & XP Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="manga-panel px-4 py-2 bg-[var(--paper)] border-2 border-[var(--border-color)] flex items-center gap-2 shadow-[2px_2px_0px_var(--border-color)]">
            <Zap className="w-5 h-5 text-[var(--cyan-dim)]" />
            <div>
              <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">
                Growth Points (Spendable)
              </div>
              <div className="text-xl font-black text-[var(--cyan-dim)]">
                {wallet.growthPoints} GP
              </div>
            </div>
          </div>

          <div className="manga-panel px-4 py-2 bg-[var(--surface-panel)] border-2 border-[var(--border-color)] flex items-center gap-2 shadow-[2px_2px_0px_var(--border-color)]">
            <Trophy className="w-5 h-5 text-[var(--amber)]" />
            <div>
              <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">
                Lifetime XP (Permanent)
              </div>
              <div className="text-xl font-black">{wallet.lifetimeXp} XP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Avatar 3D Stage + Quick Actions & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Rotatable Model */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <MangaCard title="3D Character Stage" badge="INTERACTIVE AVATAR">
            <AvatarViewer
              customization={customization}
              progression={avatarProgression}
              className="w-full h-[460px]"
            />

            {/* Quick customization link below viewer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-[var(--border-color)]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                Attire: {customization.outfit.toUpperCase()}
              </span>
              <Link
                href="/avatar/creator"
                className="touch-target px-3 py-1.5 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-bold uppercase hover:bg-[var(--paper)] flex items-center gap-1.5"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Customise Likeness</span>
              </Link>
            </div>
          </MangaCard>

          {/* Recommended Practice Quick Card */}
          <div className="manga-panel p-4 bg-[var(--surface-inset)] border-2 border-[var(--border-color)] flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase text-[var(--cyan-dim)] flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Recommended Movement Practice
              </div>
              <div className="font-extrabold text-sm mt-0.5">
                5-Minute Mindful Squats or Seated Elbow Practice
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Earn +30 XP & +30 GP for practice, plus +10 for reflection.
              </div>
            </div>
            <Link
              href="/workout"
              className="touch-target px-4 py-2 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] whitespace-nowrap hover:translate-x-[-1px] hover:translate-y-[-1px]"
            >
              Practice
            </Link>
          </div>
        </div>

        {/* Right Column: Growth Studio Entry, Evolution Status, Adventure */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Growth Studio Hub Card */}
          <MangaCard title="Physical RPG Development" badge="GROWTH STUDIO">
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Allocate your spendable Growth Points (GP) into 6 distinct muscle groups.
                Progression is non-destructive and builds towards primal awakening.
              </p>

              {/* 6 Region mini status bars */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
                {MUSCLE_REGIONS.map((region) => {
                  const lvl = avatarProgression.muscleAllocation[region.id] || 0;
                  return (
                    <div
                      key={region.id}
                      className="p-2 bg-[var(--surface-panel)] border border-[var(--border-color)] text-center"
                    >
                      <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">
                        {region.id}
                      </div>
                      <div className="text-base font-black font-mono mt-0.5">
                        Lv.{lvl}
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          /{GAME_ECONOMY.MAX_MUSCLE_LEVEL}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Enter Growth Studio CTA */}
              <Link
                href="/avatar/studio"
                className="w-full touch-target py-3 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Open Muscle Growth Studio</span>
              </Link>
            </div>
          </MangaCard>

          {/* Evolution Gate Card */}
          <MangaCard title="Primal Lineage Status" badge={isAwakened ? 'AWAKENED' : 'THRESHOLD'}>
            {!isAwakened ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold">Evolution Readiness (All regions Lv.4)</span>
                  <span className="font-black text-[var(--violet-dim)]">
                    {evolutionCheck.totalGpInvestedInThreshold} / {GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP} GP
                  </span>
                </div>

                <div className="w-full h-3 bg-[var(--surface-inset)] border border-[var(--border-color)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--violet)] transition-all"
                    style={{
                      width: `${(evolutionCheck.totalGpInvestedInThreshold / GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP) * 100}%`,
                    }}
                  />
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Choose between the steadfast <strong>Werewolf</strong> or the agile{' '}
                  <strong>Tigerhuman</strong> lineage once all 6 muscle regions reach Level 4.
                </p>

                <Link
                  href="/avatar/evolution"
                  className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-black uppercase hover:bg-[var(--paper)] flex items-center justify-between shadow-[2px_2px_0px_var(--border-color)]"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[var(--violet-dim)]" />
                    <span>Inspect Evolution Gate</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-[var(--surface-inset)] border border-[var(--border-color)]">
                  <div className="font-black text-xs uppercase text-[var(--cyan-dim)]">
                    {lineageConfig?.name} Awakening Active
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Multiplier: <strong>1.5× muscle development gain per GP</strong>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Development Units: <strong>{avatarProgression.developmentUnitsTotal.toFixed(1)}</strong>
                  </div>
                </div>

                {/* Mutation milestones */}
                <div className="text-xs font-black uppercase text-[var(--text-secondary)]">
                  Mutation Milestones
                </div>
                <div className="space-y-1.5">
                  {lineageConfig?.milestones.slice(0, 3).map((m) => {
                    const isUnlocked = avatarProgression.developmentUnitsTotal >= m.developmentUnitsRequired;
                    return (
                      <div
                        key={m.tier}
                        className={`p-2 border text-xs flex items-center justify-between ${
                          isUnlocked
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                            : 'bg-[var(--surface-panel)] border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="font-bold">
                          Tier {m.tier}: {m.name}
                        </span>
                        <span className="font-mono text-[10px]">
                          {isUnlocked ? '✓ Unlocked' : `${m.developmentUnitsRequired} Units`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </MangaCard>

          {/* Adventure Map Entry Card */}
          <MangaCard title="Kinetic Adventure" badge="FIRST-WEEK JOURNEY">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-extrabold text-sm">7-Day Awakening Odyssey</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Connect your daily movement practice to thematic story chapters.
                </div>
              </div>
              <Link
                href="/adventure"
                className="touch-target px-4 py-2 bg-[var(--paper)] text-[var(--ink)] border-2 border-[var(--border-color)] text-xs font-black uppercase shadow-[2px_2px_0px_var(--border-color)] hover:bg-[var(--cyan)] flex items-center gap-1.5"
              >
                <Map className="w-4 h-4" />
                <span>Open Map</span>
              </Link>
            </div>
          </MangaCard>
        </div>
      </div>
    </div>
  );
}
