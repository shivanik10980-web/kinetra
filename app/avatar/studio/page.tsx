'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MangaCard } from '@/components/system/MangaCard';
import { AvatarViewer } from '@/components/avatar/AvatarViewer';
import { defaultStorage } from '@/lib/storage/indexeddb';
import {
  MUSCLE_REGIONS,
  GAME_ECONOMY,
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
} from '@/lib/avatar/types';
import {
  calculateRegionCost,
  calculateBalancedAllocation,
  checkEvolutionEligibility,
  spendGrowthPointsForMuscles,
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
} from 'lucide-react';

export default function MuscleGrowthStudioPage() {
  const router = useRouter();

  // Saved state
  const [customization, setCustomization] = useState<AvatarCustomization>(
    DEFAULT_AVATAR_CUSTOMIZATION
  );
  const [savedProgression, setSavedProgression] = useState<AvatarProgression>(
    DEFAULT_AVATAR_PROGRESSION
  );
  const [wallet, setWallet] = useState<WalletState>(DEFAULT_WALLET_STATE);

  // Preview state (interactive working copy)
  const [previewAllocation, setPreviewAllocation] = useState<MuscleAllocation>({
    chest: 0,
    back: 0,
    arms: 0,
    shoulders: 0,
    core: 0,
    legs: 0,
  });

  const [activeRegion, setActiveRegion] = useState<MuscleRegionId>('chest');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load from persistent local storage
  useEffect(() => {
    Promise.all([
      defaultStorage.getAvatar(),
      defaultStorage.getWallet(),
    ]).then(([avatarData, walletData]) => {
      if (avatarData?.customization) setCustomization(avatarData.customization);
      if (avatarData?.progression) {
        setSavedProgression(avatarData.progression);
        setPreviewAllocation({ ...avatarData.progression.muscleAllocation });
      }
      if (walletData) setWallet(walletData);
    });
  }, []);

  // Compute total cost between saved and preview allocation
  let totalPendingCost = 0;
  for (const r of MUSCLE_REGIONS) {
    const savedLvl = savedProgression.muscleAllocation[r.id] || 0;
    const previewLvl = previewAllocation[r.id] || 0;
    if (previewLvl > savedLvl) {
      totalPendingCost += (previewLvl - savedLvl) * GAME_ECONOMY.MUSCLE_COST_PER_LEVEL_HUMAN;
    }
  }

  const hasPendingChanges = totalPendingCost > 0;
  const canAfford = wallet.growthPoints >= totalPendingCost;

  // Evolution eligibility analysis
  const evolutionCheck = checkEvolutionEligibility(previewAllocation);
  const savedEvolutionCheck = checkEvolutionEligibility(savedProgression.muscleAllocation);

  // Region adjustment handlers
  const handleLevelChange = (regionId: MuscleRegionId, newLevel: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const savedLvl = savedProgression.muscleAllocation[regionId] || 0;
    // Bounded between saved level and maximum 10
    const clamped = Math.max(savedLvl, Math.min(GAME_ECONOMY.MAX_MUSCLE_LEVEL, newLevel));
    setPreviewAllocation((prev) => ({
      ...prev,
      [regionId]: clamped,
    }));
  };

  // Balanced allocation helper
  const handleApplyBalancedUpgrade = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Find the next balanced uniform target level across all regions
    const currentMin = Math.min(...MUSCLE_REGIONS.map((r) => previewAllocation[r.id] || 0));
    const targetUniform = Math.min(GAME_ECONOMY.MAX_MUSCLE_LEVEL, currentMin + 1);

    const { newAllocation } = calculateBalancedAllocation(previewAllocation, targetUniform);
    setPreviewAllocation(newAllocation);
  };

  // Cancel preview and revert to saved state
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
        'Muscle Growth Studio Upgrade'
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to process purchase.');
        setIsProcessing(false);
        return;
      }

      // Persist atomic updates to IndexedDB
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
        `Upgrades applied! Spent ${totalPendingCost} GP. Your avatar's physical development has increased.`
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
          <MangaCard title="Muscle Morphing Simulation" badge="LIVE 3D PREVIEW">
            <AvatarViewer
              customization={customization}
              progression={livePreviewProgression}
              className="w-full h-[440px]"
            />

            {/* Growth Disclaimer */}
            <div className="p-3 bg-[var(--surface-panel)] border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] mt-3">
              <span className="font-extrabold text-[var(--text-primary)]">Fantasy Progression Note: </span>
              Muscle growth represents stylized fantasy character development and posture mastery,
              not the user’s real-world physique, body fat, or medical fitness.
            </div>
          </MangaCard>

          {/* Evolution Threshold Progress Card */}
          <div className="manga-panel p-4 bg-[var(--surface-panel)] border-2 border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--violet-dim)]" />
                <h4 className="font-black text-xs uppercase tracking-wide">
                  Primal Awakening Threshold
                </h4>
              </div>
              <span className="text-xs font-black text-[var(--violet-dim)]">
                {evolutionCheck.totalGpInvestedInThreshold} / {GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP} GP
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-[var(--surface-inset)] border border-[var(--border-color)] overflow-hidden">
              <div
                className="h-full bg-[var(--violet)] transition-all duration-300"
                style={{
                  width: `${(evolutionCheck.totalGpInvestedInThreshold / GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP) * 100}%`,
                }}
              />
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] mt-2">
              Requires all 6 muscle regions to reach Level 4. (Total 240 GP = 6 fully rewarded practice days).
            </p>

            {evolutionCheck.eligible && (
              <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
                <span>⚡ Primal Evolution Gate Unlocked!</span>
                <Link
                  href="/avatar/evolution"
                  className="px-2.5 py-1 bg-emerald-600 text-white font-black uppercase text-[10px] hover:bg-emerald-700"
                >
                  Awaken Lineage
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 6 Muscle Regions Controls & Shopping Ledger */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <MangaCard title="Growth Studio Allocator" badge="6 REGIONS">
            {/* Quick Action: Balanced Allocation */}
            <div className="flex items-center justify-between gap-3 mb-6 p-3 bg-[var(--surface-inset)] border border-[var(--border-color)]">
              <div>
                <div className="text-xs font-black uppercase text-[var(--text-primary)]">
                  Balanced Development
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Distribute upgrades uniformly across all 6 regions.
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

            {/* Region Sliders */}
            <div className="space-y-4">
              {MUSCLE_REGIONS.map((region) => {
                const savedLvl = savedProgression.muscleAllocation[region.id] || 0;
                const previewLvl = previewAllocation[region.id] || 0;
                const regionPendingCost = (previewLvl - savedLvl) * GAME_ECONOMY.MUSCLE_COST_PER_LEVEL_HUMAN;
                const isActive = activeRegion === region.id;

                return (
                  <div
                    key={region.id}
                    onClick={() => setActiveRegion(region.id)}
                    className={`p-3.5 border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-[var(--cyan)] bg-[var(--surface-inset)] shadow-[2px_2px_0px_var(--cyan)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-panel)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm uppercase tracking-wide">
                          {region.id}
                        </span>
                        {previewLvl >= GAME_ECONOMY.EVOLUTION_REQUIRED_REGION_LEVEL && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Threshold Met (Lv.4+)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold">
                          Lv.{previewLvl} / {GAME_ECONOMY.MAX_MUSCLE_LEVEL}
                        </span>
                        {regionPendingCost > 0 && (
                          <span className="text-xs font-black text-[var(--cyan-dim)]">
                            (+{regionPendingCost} GP)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper + Range slider */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Decrease ${region.id} muscle level`}
                        disabled={previewLvl <= savedLvl}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLevelChange(region.id, previewLvl - 1);
                        }}
                        className="touch-target w-8 h-8 border-2 border-[var(--border-color)] bg-[var(--paper)] font-black text-sm flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-inset)]"
                      >
                        -
                      </button>

                      <input
                        type="range"
                        min={savedLvl}
                        max={GAME_ECONOMY.MAX_MUSCLE_LEVEL}
                        value={previewLvl}
                        onChange={(e) =>
                          handleLevelChange(region.id, parseInt(e.target.value, 10))
                        }
                        className="flex-1 accent-[var(--cyan)] cursor-pointer"
                        aria-label={`${region.id} muscle level slider`}
                      />

                      <button
                        type="button"
                        aria-label={`Increase ${region.id} muscle level`}
                        disabled={previewLvl >= GAME_ECONOMY.MAX_MUSCLE_LEVEL}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLevelChange(region.id, previewLvl + 1);
                        }}
                        className="touch-target w-8 h-8 border-2 border-[var(--border-color)] bg-[var(--paper)] font-black text-sm flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-inset)]"
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
            <div className="mt-6 pt-4 border-t-2 border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
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
                    Cancel
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
                <span>Practice daily movement or rest reflection to earn up to 40 GP/day.</span>
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
