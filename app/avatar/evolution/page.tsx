'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MangaCard } from '@/components/system/MangaCard';
import { AvatarViewer } from '@/components/avatar/AvatarViewer';
import { defaultStorage } from '@/lib/storage/indexeddb';
import {
  WEREWOLF_LINEAGE,
  TIGERHUMAN_LINEAGE,
  HAWK_LINEAGE,
  BULLMAN_LINEAGE,
  GAME_ECONOMY,
  COMBINATION_TITLES,
} from '@/lib/avatar/config';
import {
  AvatarCustomization,
  AvatarProgression,
  WalletState,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_AVATAR_PROGRESSION,
  DEFAULT_WALLET_STATE,
  DEFAULT_FANTASY_MUSCLE_ALLOCATION,
} from '@/lib/avatar/types';
import {
  checkEvolutionEligibility,
  awakenLineage,
  migrateToTenMuscleGroups,
} from '@/lib/game/currency';
import {
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Lock,
  Flame,
  Wind,
  Trophy,
  Layers,
  Clock,
} from 'lucide-react';

type PreviewStageMode = 'newly_awakened' | 'intermediate' | 'fully_evolved';

export default function EvolutionGatePage() {
  const router = useRouter();

  const [customization, setCustomization] = useState<AvatarCustomization>(
    DEFAULT_AVATAR_CUSTOMIZATION
  );
  const [progression, setProgression] = useState<AvatarProgression>(
    DEFAULT_AVATAR_PROGRESSION
  );
  const [wallet, setWallet] = useState<WalletState>(DEFAULT_WALLET_STATE);

  const [selectedLineage, setSelectedLineage] = useState<'werewolf' | 'tigerhuman'>('werewolf');
  const [previewStage, setPreviewStage] = useState<PreviewStageMode>('newly_awakened');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      defaultStorage.getAvatar(),
      defaultStorage.getWallet(),
    ]).then(async ([avatarData, walletData]) => {
      let curCustomization = avatarData?.customization || DEFAULT_AVATAR_CUSTOMIZATION;
      let curProgression = avatarData?.progression || DEFAULT_AVATAR_PROGRESSION;
      let curWallet = walletData || DEFAULT_WALLET_STATE;

      // Migrate if needed
      if (curWallet.migrationMarker !== GAME_ECONOMY.MIGRATION_MARKER_V2) {
        const mig = migrateToTenMuscleGroups(curWallet, curProgression);
        if (mig.migrated) {
          curWallet = mig.wallet;
          curProgression = mig.avatar;
          await defaultStorage.saveWallet(curWallet);
          await defaultStorage.saveAvatar({ customization: curCustomization, progression: curProgression });
        }
      }

      setCustomization(curCustomization);
      setProgression(curProgression);
      setWallet(curWallet);
    });
  }, []);

  const eligibility = checkEvolutionEligibility(
    progression.muscleAllocation,
    progression.evolutionStage
  );
  const hasAlreadyAwakened = progression.hasAwakened;

  // Build stage-specific preview for the 3D viewer
  const getStageMuscleAllocation = (stage: PreviewStageMode) => {
    const base = { ...DEFAULT_FANTASY_MUSCLE_ALLOCATION };
    if (stage === 'newly_awakened') {
      // Slender baseline: all regions level 0
      return base;
    }
    if (stage === 'intermediate') {
      // Mid-stage development: level 4 in core groups
      return {
        ...base,
        chest: 4,
        lats: 4,
        traps: 4,
        front_side_shoulders: 4,
        biceps: 4,
        abs_core: 4,
        thighs: 4,
        calves: 4,
      };
    }
    // Fully evolved: level 9 across all fantasy groups
    const maxAlloc: Record<string, number> = {};
    Object.keys(base).forEach((k) => {
      maxAlloc[k] = 9;
    });
    return maxAlloc;
  };

  const getStageDevUnits = (stage: PreviewStageMode) => {
    if (stage === 'newly_awakened') return 5;
    if (stage === 'intermediate') return 45;
    return 100; // Tier 5 Apex
  };

  const previewProgression: AvatarProgression = {
    ...progression,
    lineage: selectedLineage,
    evolutionStage: 'awakened',
    muscleAllocation: getStageMuscleAllocation(previewStage),
    developmentUnitsTotal: getStageDevUnits(previewStage),
    unlockedMutationTiers:
      previewStage === 'newly_awakened'
        ? [1]
        : previewStage === 'intermediate'
        ? [1, 2, 3]
        : [1, 2, 3, 4, 5],
  };

  const currentLineageConfig =
    selectedLineage === 'werewolf' ? WEREWOLF_LINEAGE : TIGERHUMAN_LINEAGE;

  const handleConfirmAwakening = async () => {
    if (isProcessing || !eligibility.eligible || hasAlreadyAwakened) return;
    setIsProcessing(true);
    setErrorText(null);

    const res = awakenLineage(progression, selectedLineage);
    if (!res.success) {
      setErrorText(res.error || 'Evolution failed.');
      setIsProcessing(false);
      return;
    }

    try {
      await defaultStorage.saveAvatar({
        customization,
        progression: res.newAvatar,
      });

      const ledger = await defaultStorage.getTransactions();
      const awakenTx = {
        id: `tx_awakening_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'earn_reward' as const,
        amount: 0,
        balanceAfter: wallet.growthPoints,
        referenceId: `lineage_${selectedLineage}`,
        description: `Awakened ${selectedLineage.toUpperCase()} lineage. Archived human form; muscle reset to slender base; 1.5x growth rate unlocked.`,
      };
      await defaultStorage.saveTransactions([awakenTx, ...ledger]);

      setProgression(res.newAvatar);
      setShowConfirmModal(false);
      router.push('/avatar');
    } catch (err: any) {
      setErrorText(err?.message || 'Storage write failed during awakening.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/avatar"
          className="touch-target inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-bold uppercase hover:bg-[var(--paper)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Character</span>
        </Link>
        <div className="text-xs font-bold text-[var(--text-secondary)]">
          Evolution Threshold: All 10 Human regions Lv.3 (240 GP)
        </div>
      </div>

      {/* Awakening Already Completed Banner */}
      {hasAlreadyAwakened && (
        <div className="manga-panel p-4 mb-6 bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-400 text-purple-900 dark:text-purple-200">
          <div className="flex items-center gap-2 font-black text-sm uppercase">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>Primal Awakening Active: {progression.lineage.toUpperCase()}</span>
          </div>
          <p className="text-xs mt-1">
            Your character has already awakened their permanent primal lineage with 15 fantasy muscle groups and a 1.5× muscle development multiplier.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Preview of Selected Lineage + Stage Switcher */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <MangaCard title="Awakened Form Preview" badge={selectedLineage.toUpperCase()}>
            {/* Stage Selector: Newly Awakened / Intermediate / Fully Evolved */}
            <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-inset)] border border-[var(--border-color)] mb-3">
              {(
                [
                  { id: 'newly_awakened', label: '1. Slender Base' },
                  { id: 'intermediate', label: '2. Mid Mutation' },
                  { id: 'fully_evolved', label: '3. Apex Form' },
                ] as const
              ).map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setPreviewStage(stage.id)}
                  className={`flex-1 py-1 px-2 text-[10px] font-black uppercase transition-all ${
                    previewStage === stage.id
                      ? 'bg-[var(--cyan)] text-[var(--ink)] shadow-[1px_1px_0px_var(--border-color)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>

            <AvatarViewer
              customization={customization}
              progression={previewProgression}
              className="w-full h-[400px]"
            />

            <div className="p-3 bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs text-center mt-3">
              <span className="font-black text-[var(--text-primary)]">
                {currentLineageConfig.archetype}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                {currentLineageConfig.silhouetteDescription}
              </p>
            </div>
          </MangaCard>

          {/* Upcoming Lineages Notice (Hawk & Bullman) */}
          <div className="manga-panel p-3.5 bg-[var(--surface-panel)] border-2 border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Future Evolutions (In Development)</span>
            </div>
            <div className="space-y-2">
              <div className="p-2 bg-[var(--surface-inset)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold">{HAWK_LINEAGE.name}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block">
                    {HAWK_LINEAGE.archetype}
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Preview Only
                </span>
              </div>

              <div className="p-2 bg-[var(--surface-inset)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold">{BULLMAN_LINEAGE.name}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block">
                    {BULLMAN_LINEAGE.archetype}
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Preview Only
                </span>
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2">
              Both advanced lineages will be accessible from either mature initial lineage in subsequent updates.
            </p>
          </div>
        </div>

        {/* Right: Path Selector & Milestone Details */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <MangaCard title="Choose Your Awakening Lineage" badge="PRIMAL THRESHOLD">
            {/* Side-by-Side Lineage Selection Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Werewolf Card */}
              <button
                type="button"
                onClick={() => setSelectedLineage('werewolf')}
                className={`p-4 text-left border-3 transition-all ${
                  selectedLineage === 'werewolf'
                    ? 'border-purple-600 bg-purple-500/10 shadow-[3px_3px_0px_purple]'
                    : 'border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <span className="font-black text-base uppercase">Werewolf</span>
                  </div>
                  {selectedLineage === 'werewolf' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  )}
                </div>
                <div className="text-xs font-bold text-purple-400 mb-1">
                  Tall • Sinewy • Predatory Stance
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Tall, elongated, slender and sinewy. Long limbs and an intentional forward-hunched creature stance. Amber eyes, dark fur mantle, and lupine anatomy. Remains taller and leaner than Tigerhuman even at maximum development.
                </p>
              </button>

              {/* Tigerhuman Card */}
              <button
                type="button"
                onClick={() => setSelectedLineage('tigerhuman')}
                className={`p-4 text-left border-3 transition-all ${
                  selectedLineage === 'tigerhuman'
                    ? 'border-amber-500 bg-amber-500/10 shadow-[3px_3px_0px_#f59e0b]'
                    : 'border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-amber-500" />
                    <span className="font-black text-base uppercase">Tigerhuman</span>
                  </div>
                  {selectedLineage === 'tigerhuman' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  )}
                </div>
                <div className="text-xs font-bold text-amber-400 mb-1">
                  Stocky • Bulky • Grounded Posture
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Stocky, wide, thick and bulky. Dense torso, substantial limbs, and low grounded posture. Feline face, kinetic tiger stripes, rounded ears, and prehensile tail. Remains visibly broader and heavier than Werewolf at every stage.
                </p>
              </button>
            </div>

            {/* Lore & Silhouette Description */}
            <div className="manga-panel p-4 mb-6 bg-[var(--surface-inset)] border-l-4 border-l-[var(--cyan)]">
              <h4 className="font-black text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Lineage Philosophy & Lore
              </h4>
              <p className="text-sm font-medium leading-relaxed">{currentLineageConfig.lore}</p>
            </div>

            {/* Mutation Progression Milestones */}
            <div className="mb-6">
              <h4 className="font-black text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Upcoming Mutation Milestones ({currentLineageConfig.name})
              </h4>
              <div className="space-y-2">
                {currentLineageConfig.milestones.map((m) => (
                  <div
                    key={m.tier}
                    className="p-2.5 bg-[var(--surface-panel)] border border-[var(--border-color)] flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-extrabold flex items-center gap-1.5">
                        <span className="text-[var(--cyan-dim)] font-mono">Tier {m.tier}:</span>
                        <span>{m.name}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        {m.description}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[var(--surface-inset)] border border-[var(--border-color)] whitespace-nowrap">
                      {m.developmentUnitsRequired} Dev Units
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Awakening Rules & Confirmation Button */}
            <div className="p-4 bg-[var(--surface-panel)] border-2 border-[var(--border-color)]">
              <div className="text-xs font-black uppercase text-[var(--text-secondary)] mb-2">
                Awakening Protocol
              </div>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1 mb-4">
                <li>• 15 specialized fantasy muscle groups unlock upon awakening.</li>
                <li>• 1.5× muscle development gain per GP in awakened form (12 units/level).</li>
                <li>• Previous human form is archived in your history ledger.</li>
                <li>• Permanent lineage choice for this release.</li>
              </ul>

              {/* Requirement Check */}
              {!eligibility.eligible && (
                <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    Evolution Locked: All ten muscle regions must reach Level 3 in the Growth Studio first.
                    (Missing: {eligibility.missingRegions.join(', ')})
                  </span>
                </div>
              )}

              {eligibility.eligible && !hasAlreadyAwakened && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full touch-target py-3 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Begin Awakening as {selectedLineage.toUpperCase()}</span>
                </button>
              )}
            </div>
          </MangaCard>
        </div>
      </div>

      {/* Awakening Confirmation Modal with Explicit Reset Explanation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <MangaCard title="Confirm Lineage Awakening" badge="PERMANENT CHOICE">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 text-amber-950 dark:text-amber-100 text-xs font-bold mb-4">
                <div className="flex items-center gap-2 mb-2 font-black text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Important Awakening Law</span>
                </div>
                <p className="leading-relaxed">
                  “Your muscular development resets to the new species’ slender baseline (0 across 15 fantasy groups). Your previous human form will be archived. Your lifetime XP, identity, collection, unlocked titles and unspent GP remain completely intact. Your new form develops faster (1.5× muscle development gain per GP).”
                </p>
              </div>

              <div className="text-xs space-y-2 mb-6">
                <div>• Chosen Lineage: <strong>{selectedLineage.toUpperCase()}</strong></div>
                <div>• Unspent GP & Lifetime XP: <strong>100% Preserved ({wallet.growthPoints} GP)</strong></div>
                <div>• Face, Skin, Hair & Name: <strong>Preserved</strong></div>
                <div>• Previous Form: <strong>Archived in ledger</strong></div>
                <div>• Base Muscle Development: <strong>Reset to slender baseline across 15 fantasy groups</strong></div>
                <div>• Growth Multiplier: <strong>1.5× units per GP</strong></div>
              </div>

              {errorText && (
                <div className="p-3 mb-4 bg-rose-50 text-rose-800 text-xs font-bold border border-rose-300">
                  {errorText}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-bold uppercase hover:bg-[var(--paper)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmAwakening}
                  className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessing ? 'Awakening...' : 'Awaken Form'}</span>
                </button>
              </div>
            </MangaCard>
          </div>
        </div>
      )}
    </div>
  );
}
