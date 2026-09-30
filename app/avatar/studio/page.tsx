'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MangaCard } from '@/components/system/MangaCard';
import { AvatarViewer } from '@/components/avatar/AvatarViewer';
import { defaultStorage } from '@/lib/storage/indexeddb';
import {
  HUMAN_MUSCLE_REGIONS,
  FANTASY_MUSCLE_REGIONS,
  GAME_ECONOMY,
  COMBINATION_TITLES,
  MuscleRegionId,
} from '@/lib/avatar/config';
import {
  AvatarCustomization,
  AvatarProgression,
  WalletState,
  MuscleAllocation,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_AVATAR_PROGRESSION,
  DEFAULT_WALLET_STATE,
  DEFAULT_HUMAN_MUSCLE_ALLOCATION,
  DEFAULT_FANTASY_MUSCLE_ALLOCATION,
} from '@/lib/avatar/types';
import {
  calculateRegionCost,
  calculateBalancedAllocation,
  checkEvolutionEligibility,
  spendGrowthPointsForMuscles,
  migrateToTenMuscleGroups,
  checkTitleUnlocks,
} from '@/lib/game/currency';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  TrendingUp,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Compass,
  Trophy,
  Award,
} from 'lucide-react';

export default function MuscleGrowthStudioPage() {
  const router = useRouter();

  // Saved persistent state
  const [customization, setCustomization] = useState<AvatarCustomization>(
    DEFAULT_AVATAR_CUSTOMIZATION
  );
  const [savedProgression, setSavedProgression] = useState<AvatarProgression>(
    DEFAULT_AVATAR_PROGRESSION
  );
  const [wallet, setWallet] = useState<WalletState>(DEFAULT_WALLET_STATE);

  // Preview interactive working copy
  const [previewAllocation, setPreviewAllocation] = useState<MuscleAllocation>({
    ...DEFAULT_HUMAN_MUSCLE_ALLOCATION,
  });

  const [activeRegion, setActiveRegion] = useState<string>('chest');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const isAwakened = savedProgression.evolutionStage === 'awakened';
  const activeRegionsList = isAwakened ? FANTASY_MUSCLE_REGIONS : HUMAN_MUSCLE_REGIONS;
  const maxLevelForStage = isAwakened
    ? GAME_ECONOMY.FANTASY_MAX_LEVEL
    : GAME_ECONOMY.HUMAN_MAX_LEVEL;
  const costPerLevel = isAwakened
    ? GAME_ECONOMY.FANTASY_GP_PER_LEVEL
    : GAME_ECONOMY.HUMAN_GP_PER_LEVEL;

  // Load from persistent local storage & perform deterministic migration if needed
  useEffect(() => {
    Promise.all([
      defaultStorage.getAvatar(),
      defaultStorage.getWallet(),
    ]).then(async ([avatarData, walletData]) => {
      let curCustomization = avatarData?.customization || DEFAULT_AVATAR_CUSTOMIZATION;
      let curProgression = avatarData?.progression || DEFAULT_AVATAR_PROGRESSION;
      let curWallet = walletData || DEFAULT_WALLET_STATE;

      // Deterministic migration to 10 human groups if not yet migrated
      if (curWallet.migrationMarker !== GAME_ECONOMY.MIGRATION_MARKER_V2) {
        const mig = migrateToTenMuscleGroups(curWallet, curProgression);
        if (mig.migrated) {
          curWallet = mig.wallet;
          curProgression = mig.avatar;
          await defaultStorage.saveWallet(curWallet);
          await defaultStorage.saveAvatar({ customization: curCustomization, progression: curProgression });
          if (mig.transactions.length > 0) {
            const txs = await defaultStorage.getTransactions();
            await defaultStorage.saveTransactions([...mig.transactions, ...txs]);
          }
        }
      }

      setCustomization(curCustomization);
      setSavedProgression(curProgression);
      setPreviewAllocation({ ...curProgression.muscleAllocation });
      setWallet(curWallet);
    });
  }, []);

  // Compute total pending cost between saved and preview allocation
  let totalPendingCost = 0;
  for (const r of activeRegionsList) {
    const savedLvl = savedProgression.muscleAllocation[r.id] || 0;
    const previewLvl = previewAllocation[r.id] || 0;
    if (previewLvl > savedLvl) {
      totalPendingCost += (previewLvl - savedLvl) * costPerLevel;
    }
  }

  const hasPendingChanges = totalPendingCost > 0;
  const canAfford = wallet.growthPoints >= totalPendingCost;

  // PRIORITY 3: STRICT SEPARATION OF SAVED READINESS VS PREVIEW READINESS
  // Evolution eligibility must strictly use committed saved data only!
  const savedEvolutionCheck = checkEvolutionEligibility(
    savedProgression.muscleAllocation,
    savedProgression.evolutionStage
  );
  // Projected readiness is only shown as a preview calculation
  const previewEvolutionCheck = checkEvolutionEligibility(
    previewAllocation,
    savedProgression.evolutionStage
  );

  // Combination titles check
  const currentEarnedTitles = checkTitleUnlocks(savedProgression.muscleAllocation, isAwakened);
  const prospectiveTitles = checkTitleUnlocks(previewAllocation, isAwakened);
  const newlyQualifyingTitles = prospectiveTitles.filter((t) => !currentEarnedTitles.includes(t));

  // Region adjustment handlers
  const handleLevelChange = (regionId: string, newLevel: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const savedLvl = savedProgression.muscleAllocation[regionId] || 0;
    // Bounded between saved level and maximum for the active stage
    const clamped = Math.max(savedLvl, Math.min(maxLevelForStage, newLevel));
    setPreviewAllocation((prev) => ({
      ...prev,
      [regionId]: clamped,
    }));
  };

  // Balanced allocation helper
  const handleApplyBalancedUpgrade = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const currentMin = Math.min(...activeRegionsList.map((r) => previewAllocation[r.id] || 0));
    const targetUniform = Math.min(maxLevelForStage, currentMin + 1);

    const { newAllocation } = calculateBalancedAllocation(
      previewAllocation,
      targetUniform,
      isAwakened
    );
    setPreviewAllocation(newAllocation);
  };

  // Cancel preview and discard unconfirmed changes
  const handleCancelPreview = () => {
    setPreviewAllocation({ ...savedProgression.muscleAllocation });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Confirm and spend GP atomically
  const handleConfirmPurchase = async () => {
    if (isProcessing || !hasPendingChanges) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const ledger = await defaultStorage.getTransactions();
      const purchaseId = `purchase_${Date.now()}`;

      const res = spendGrowthPointsForMuscles(
        wallet,
        savedProgression,
        ledger,
        purchaseId,
        previewAllocation,
        `${isAwakened ? 'Fantasy' : 'Human'} Muscle Growth Upgrade`
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to process purchase.');
        setIsProcessing(false);
        return;
      }

      // Persist atomic updates
      await defaultStorage.saveWallet(res.newWallet);
      await defaultStorage.saveAvatar({
        customization,
        progression: res.newAvatar,
      });
      await defaultStorage.saveTransactions(res.newLedger);

      setWallet(res.newWallet);
      setSavedProgression(res.newAvatar);
      setPreviewAllocation({ ...res.newAvatar.muscleAllocation });
      setSuccessMessage(
        `Upgrades committed! Spent ${totalPendingCost} GP. Your character's physical development has increased.`
      );
    } catch (err: any) {
      setErrorMessage(`Transaction error: ${err?.message || 'Storage write failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview progression object passed into the 3D viewer
  const livePreviewProgression: AvatarProgression = {
    ...savedProgression,
    muscleAllocation: previewAllocation,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Header & Balances */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Link
          href="/avatar"
          className="touch-target inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-bold uppercase hover:bg-[var(--paper)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Character</span>
        </Link>

        {/* Growth Points Wallet Bar */}
        <div className="flex items-center gap-3">
          <div className="manga-panel px-4 py-2 bg-[var(--paper)] border-2 border-[var(--border-color)] flex items-center gap-2 shadow-[2px_2px_0px_var(--border-color)]">
            <Zap className="w-4 h-4 text-[var(--cyan-dim)]" />
            <span className="text-xs font-black uppercase text-[var(--text-secondary)]">Available GP:</span>
            <span className="text-lg font-black text-[var(--cyan-dim)]">{wallet.growthPoints} GP</span>
          </div>

          <div className="hidden sm:flex manga-panel px-4 py-2 bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)]">
            Lifetime XP: {wallet.lifetimeXp} (Permanent)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Live Muscle Deformation Viewer */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <MangaCard
            title={isAwakened ? 'Fantasy Morphing Stage' : 'Human Morphing Stage'}
            badge={isAwakened ? '15 FANTASY GROUPS' : '10 HUMAN GROUPS'}
          >
            <AvatarViewer
              customization={customization}
              progression={livePreviewProgression}
              className="w-full h-[440px]"
            />

            {/* Growth Disclaimer */}
            <div className="p-3 bg-[var(--surface-panel)] border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] mt-3">
              <span className="font-extrabold text-[var(--text-primary)]">Fantasy Progression Note: </span>
              Muscle development represents stylized fantasy RPG avatar aesthetics and posture mastery,
              not the user’s real-world body composition, weight loss, or medical fitness.
            </div>
          </MangaCard>

          {/* PRIORITY 3: Evolution Readiness Card (Saved vs Preview clearly separated) */}
          {!isAwakened && (
            <div className="manga-panel p-4 bg-[var(--surface-panel)] border-2 border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--violet-dim)]" />
                  <h4 className="font-black text-xs uppercase tracking-wide">
                    Primal Awakening Threshold
                  </h4>
                </div>
                {/* SAVED EARNED READINESS: Committed data only! */}
                <span className="text-xs font-black text-[var(--violet-dim)]">
                  {savedEvolutionCheck.totalGpInvestedInThreshold} / {GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP} GP (Saved)
                </span>
              </div>

              {/* Saved Progress Bar */}
              <div className="w-full h-3 bg-[var(--surface-inset)] border border-[var(--border-color)] overflow-hidden relative">
                <div
                  className="h-full bg-[var(--violet)] transition-all duration-300"
                  style={{
                    width: `${(savedEvolutionCheck.totalGpInvestedInThreshold / GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP) * 100}%`,
                  }}
                />
                {/* Secondary dashed indicator for uncommitted preview projection */}
                {hasPendingChanges && previewEvolutionCheck.totalGpInvestedInThreshold > savedEvolutionCheck.totalGpInvestedInThreshold && (
                  <div
                    className="absolute top-0 bottom-0 bg-[var(--cyan)]/40 border-r-2 border-r-[var(--cyan)] transition-all duration-300"
                    style={{
                      left: `${(savedEvolutionCheck.totalGpInvestedInThreshold / GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP) * 100}%`,
                      width: `${((previewEvolutionCheck.totalGpInvestedInThreshold - savedEvolutionCheck.totalGpInvestedInThreshold) / GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP) * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Explanatory notes */}
              <div className="flex justify-between items-center text-[11px] text-[var(--text-secondary)] mt-2">
                <span>Requires all 10 human muscle regions to reach Level 3 (240 GP).</span>
                {hasPendingChanges && (
                  <span className="font-bold text-[var(--cyan-dim)]">
                    Projected Preview: {previewEvolutionCheck.totalGpInvestedInThreshold} GP
                  </span>
                )}
              </div>

              {/* Evolution gate link ONLY enabled if SAVED progress meets threshold */}
              {savedEvolutionCheck.eligible ? (
                <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
                  <span>⚡ Primal Evolution Gate Unlocked! (Committed)</span>
                  <Link
                    href="/avatar/evolution"
                    className="px-2.5 py-1 bg-emerald-600 text-white font-black uppercase text-[10px] hover:bg-emerald-700"
                  >
                    Awaken Lineage
                  </Link>
                </div>
              ) : hasPendingChanges && previewEvolutionCheck.eligible ? (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-amber-800 dark:text-amber-200 text-xs font-bold">
                  <span>Preview reaches threshold. Confirm and save upgrade to unlock Awakening.</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Combination Titles Preview */}
          {newlyQualifyingTitles.length > 0 && (
            <div className="manga-panel p-3 bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-400 text-xs">
              <div className="font-black text-purple-900 dark:text-purple-200 uppercase flex items-center gap-1.5 mb-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>Title Unlock in Preview:</span>
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300">
                Confirming these upgrades will permanently unlock title: <strong>{newlyQualifyingTitles.join(', ').toUpperCase()}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Muscle Regions Allocator & Ledger */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <MangaCard
            title={isAwakened ? 'Fantasy Growth Allocator' : 'Human Growth Allocator'}
            badge={`${activeRegionsList.length} REGIONS`}
          >
            {/* Quick Action: Balanced Allocation */}
            <div className="flex items-center justify-between gap-3 mb-4 p-3 bg-[var(--surface-inset)] border border-[var(--border-color)]">
              <div>
                <div className="text-xs font-black uppercase text-[var(--text-primary)]">
                  Balanced Development
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Distribute upgrades uniformly across all {activeRegionsList.length} active regions ({costPerLevel} GP/level).
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyBalancedUpgrade}
                className="touch-target px-3 py-1.5 bg-[var(--paper)] text-[var(--ink)] border-2 border-[var(--border-color)] text-xs font-black uppercase shadow-[2px_2px_0px_var(--border-color)] hover:bg-[var(--cyan)]"
              >
                +1 Balanced
              </button>
            </div>

            {/* Region Sliders List */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {activeRegionsList.map((region) => {
                const savedLvl = savedProgression.muscleAllocation[region.id] || 0;
                const previewLvl = previewAllocation[region.id] || 0;
                const regionPendingCost = (previewLvl - savedLvl) * costPerLevel;
                const isActive = activeRegion === region.id;
                const reqThreshold = isAwakened ? 5 : GAME_ECONOMY.EVOLUTION_REQUIRED_HUMAN_LEVEL;

                return (
                  <div
                    key={region.id}
                    onClick={() => setActiveRegion(region.id)}
                    className={`p-3 border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-[var(--cyan)] bg-[var(--surface-inset)] shadow-[2px_2px_0px_var(--cyan)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-panel)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase tracking-wide">
                          {region.id.replace(/_/g, ' ')}
                        </span>
                        {savedLvl >= reqThreshold ? (
                          <span className="px-1.5 py-0.2 text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Threshold Met (Lv.{reqThreshold}+)
                          </span>
                        ) : previewLvl >= reqThreshold ? (
                          <span className="px-1.5 py-0.2 text-[8px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
                            Preview Lv.{reqThreshold}+
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold">
                          {previewLvl !== savedLvl && (
                            <span className="text-[var(--text-secondary)] line-through mr-1">
                              Lv.{savedLvl}
                            </span>
                          )}
                          Lv.{previewLvl} / {maxLevelForStage}
                        </span>
                        {regionPendingCost > 0 && (
                          <span className="text-xs font-black text-[var(--cyan-dim)]">
                            (+{regionPendingCost} GP)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper + Range slider */}
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        aria-label={`Decrease ${region.id} level`}
                        disabled={previewLvl <= savedLvl}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLevelChange(region.id, previewLvl - 1);
                        }}
                        className="touch-target w-7 h-7 border-2 border-[var(--border-color)] bg-[var(--paper)] font-black text-sm flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-inset)]"
                      >
                        -
                      </button>

                      <input
                        type="range"
                        min={savedLvl}
                        max={maxLevelForStage}
                        value={previewLvl}
                        onChange={(e) =>
                          handleLevelChange(region.id, parseInt(e.target.value, 10))
                        }
                        className="flex-1 accent-[var(--cyan)] cursor-pointer"
                        aria-label={`${region.id} muscle slider`}
                      />

                      <button
                        type="button"
                        aria-label={`Increase ${region.id} level`}
                        disabled={previewLvl >= maxLevelForStage}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLevelChange(region.id, previewLvl + 1);
                        }}
                        className="touch-target w-7 h-7 border-2 border-[var(--border-color)] bg-[var(--paper)] font-black text-sm flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-inset)]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error or Success Feedback */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-400 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Purchase Confirmation Bar */}
            <div className="mt-5 pt-4 border-t-2 border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold uppercase text-[var(--text-secondary)]">
                  Pending Upgrade Cost
                </div>
                <div className="text-xl font-black">
                  {totalPendingCost > 0 ? (
                    <span className={canAfford ? 'text-[var(--cyan-dim)]' : 'text-rose-600'}>
                      {totalPendingCost} GP
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)]">0 GP</span>
                  )}
                  {totalPendingCost > 0 && !canAfford && (
                    <span className="text-xs text-rose-600 ml-2 font-bold">
                      (Insufficient GP balance)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasPendingChanges && (
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-bold uppercase hover:bg-[var(--paper)]"
                  >
                    Cancel Preview
                  </button>
                )}

                <button
                  type="button"
                  disabled={!hasPendingChanges || !canAfford || isProcessing}
                  onClick={handleConfirmPurchase}
                  className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{isProcessing ? 'Applying...' : 'Confirm Upgrade'}</span>
                </button>
              </div>
            </div>

            {/* Need More GP Prompt */}
            {!canAfford && totalPendingCost > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between">
                <span>Practice daily movement or rest reflection to earn up to 60 GP/day.</span>
                <Link
                  href="/workout"
                  className="px-2.5 py-1 bg-amber-500 text-black font-black uppercase text-[10px] hover:bg-amber-600"
                >
                  Start Practice
                </Link>
              </div>
            )}
          </MangaCard>
        </div>
      </div>
    </div>
  );
}
