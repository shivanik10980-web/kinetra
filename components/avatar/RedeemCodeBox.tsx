'use client';

import React, { useState } from 'react';
import { Gift, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { WalletState } from '@/lib/avatar/types';
import { redeemPromoCode } from '@/lib/game/currency';
import { defaultStorage } from '@/lib/storage/indexeddb';

interface RedeemCodeBoxProps {
  wallet: WalletState;
  onRedeemed?: (updatedWallet: WalletState) => void;
  variant?: 'card' | 'compact';
  className?: string;
}

export function RedeemCodeBox({
  wallet,
  onRedeemed,
  variant = 'card',
  className = '',
}: RedeemCodeBoxProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRedeem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || !code.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const ledger = await defaultStorage.getTransactions();
      const result = redeemPromoCode(wallet, code, ledger);

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to redeem code.');
        setIsSubmitting(false);
        return;
      }

      // Persist to local storage
      await defaultStorage.saveWallet(result.newWallet);
      await defaultStorage.saveTransactions(result.newLedger);

      setSuccessMessage(`Success! +${result.rewardGp.toLocaleString()} GP credited to your wallet.`);
      setCode('');

      if (onRedeemed) {
        onRedeemed(result.newWallet);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`p-3 bg-[var(--surface-panel)] border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase">
            <Gift className="w-3.5 h-3.5 text-[var(--cyan-dim)]" />
            <span>Redeem Code</span>
          </div>
          <span className="text-[10px] font-black uppercase text-[var(--amber)] bg-amber-500/10 px-1.5 py-0.5 border border-amber-500/30">
            PROMO: gpzoo
          </span>
        </div>

        <form onSubmit={handleRedeem} className="flex items-center gap-1.5">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="Enter code (e.g. gpzoo)"
            disabled={isSubmitting}
            className="flex-1 px-2.5 py-1 text-xs uppercase font-mono tracking-wider bg-[var(--surface-inset)] border-2 border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--cyan)]"
          />
          <button
            type="submit"
            disabled={isSubmitting || !code.trim()}
            className="px-3 py-1 bg-[var(--cyan)] text-[var(--ink)] font-black text-xs uppercase border-2 border-[var(--border-color)] shadow-[1px_1px_0px_var(--border-color)] hover:bg-[var(--cyan-dim)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Claim</span>}
          </button>
        </form>

        {successMessage && (
          <div className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`manga-panel bracket-frame p-5 bg-[var(--surface-panel)] border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border-color)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[var(--amber)] text-black border-2 border-[var(--border-color)] flex items-center justify-center font-black">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">Redeem Promo Code</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">Unlock instant Growth Points for character development</p>
          </div>
        </div>
        <span className="badge-status bg-amber-400 text-black border border-[var(--border-color)] flex items-center gap-1 font-black">
          <Sparkles className="w-3 h-3" />
          <span>BONUS GP</span>
        </span>
      </div>

      <form onSubmit={handleRedeem} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="ENTER CODE (E.G. GPZOO)"
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 text-sm uppercase font-mono tracking-widest bg-[var(--surface-inset)] border-2 border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--cyan)]"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !code.trim()}
            className="touch-target px-5 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-xs uppercase tracking-wider border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:bg-[var(--cyan-dim)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 transition-transform"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating...</span>
              </>
            ) : (
              <>
                <span>Redeem Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] flex-wrap gap-2">
          <span>Use code <strong className="font-mono text-[var(--cyan-dim)] uppercase">gpzoo</strong> to claim 1,000 GP.</span>
          <span>One-time per account</span>
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border-2 border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
}
