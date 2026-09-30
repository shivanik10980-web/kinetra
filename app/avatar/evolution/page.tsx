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
import {
  checkEvolutionEligibility,
  awakenLineage,
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
} from 'lucide-react';

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
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      defaultStorage.getAvatar(),
      defaultStorage.getWallet(),
    ]).then(([avatarData, walletData]) => {
      if (avatarData?.customization) setCustomization(avatarData.customization);
      if (avatarData?.progression) setProgression(avatarData.progression);
      if (walletData) setWallet(walletData);
    });
  }, []);

  const eligibility = checkEvolutionEligibility(progression.muscleAllocation);
  const hasAlreadyAwakened = progression.hasAwakened;

  // Mock preview progression for 3D viewer
  const previewProgression: AvatarProgression = {
    ...progression,
    lineage: selectedLineage,
    evolutionStage: 'awakened',
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

      // Record transaction ledger entry
      const ledger = await defaultStorage.getTransactions();
      const awakenTx = {
        id: `tx_awakening_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'earn_reward' as const,
        amount: 0,
        balanceAfter: wallet.growthPoints,
        referenceId: `lineage_${selectedLineage}`,
        description: `Awakened ${selectedLineage.toUpperCase()} lineage. Muscle reset to slender base; 1.5x growth rate unlocked.`,
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
          Evolution Threshold: All 6 regions Lv.4
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
            Your character has already awakened their permanent primal lineage with a 1.5× muscle development multiplier.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Preview of Selected Lineage */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <MangaCard title="Awakened Form Preview" badge={selectedLineage.toUpperCase()}>
            <AvatarViewer
              customization={customization}
              progression={previewProgression}
              className="w-full h-[420px]"
            />
            <div className="p-3 bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs text-center mt-3">
              <span className="font-black text-[var(--text-primary)]">
                {currentLineageConfig.archetype}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                {currentLineageConfig.movementStyle}
              </p>
            </div>
          </MangaCard>
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
                  Resolve • Loyalty • Protection
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Broad shoulders, strong back, grounded rooted stance, amber lunar eyes, and lupine features.
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
                  Focus • Adaptability • Precision
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Athletic silhouette, developed legs & torso, fluid balance tail, jade slit pupils, and kinetic stripes.
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
                <li>• Identical XP/GP earning rates for both lineages.</li>
                <li>• 1.5× muscle development gain per GP in awakened form.</li>
                <li>• Permanent lineage choice for this character release.</li>
              </ul>

              {/* Requirement Check */}
              {!eligibility.eligible && (
                <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    Evolution Locked: All six regions must reach Level 4 in the Growth Studio first.
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

      {/* Awakening Confirmation Modal */}
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
                  “Your muscular development resets. Your lifetime XP, identity, collection and achievements remain. Your new form develops faster (1.5× muscle development gain per GP).”
                </p>
              </div>

              <div className="text-xs space-y-2 mb-6">
                <div>• Chosen Lineage: <strong>{selectedLineage.toUpperCase()}</strong></div>
                <div>• Unspent GP & Lifetime XP: <strong>Preserved</strong></div>
                <div>• Face, Skin, Hair & Name: <strong>Preserved</strong></div>
                <div>• Base Muscle Development: <strong>Reset to slender base</strong></div>
                <div>• Multiplier: <strong>1.5× muscle gain per GP</strong></div>
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
