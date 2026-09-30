import { GAME_BOOSTERS, GAME_ECONOMY, BoosterItem } from '../avatar/config';
import { WalletState, TransactionRecord } from '../avatar/types';

export interface BoosterConsumptionResult {
  success: boolean;
  newWallet: WalletState;
  newLedger: TransactionRecord[];
  bonusXp: number;
  bonusGp: number;
  error?: string;
}

/**
 * Consumes a gameplay booster atomically only when a session reward is saved.
 * Strict rules:
 * - Focus Token: adds up to 5 points to eligible mastery reward, strictly within the 60 daily cap.
 * - No stacking currency multipliers.
 * - Consumed ONLY when reward successfully saves.
 * - Boosters are earned via practice milestones, never sold for money.
 */
export function consumeBoosterOnRewardSave(
  wallet: WalletState,
  ledger: TransactionRecord[],
  boosterId: string,
  sessionReferenceId: string,
  currentDayXpEarned: number
): BoosterConsumptionResult {
  const booster = GAME_BOOSTERS[boosterId];
  if (!booster) {
    return {
      success: false,
      newWallet: wallet,
      newLedger: ledger,
      bonusXp: 0,
      bonusGp: 0,
      error: `Unknown booster ${boosterId}`,
    };
  }

  const inventory = wallet.inventory || {};
  const currentCount = inventory[boosterId] || 0;

  if (currentCount <= 0) {
    return {
      success: false,
      newWallet: wallet,
      newLedger: ledger,
      bonusXp: 0,
      bonusGp: 0,
      error: `No ${booster.name} available in inventory.`,
    };
  }

  // Calculate actual bonus allowable under the shared 60 daily cap
  let bonusAmount = 0;
  if (booster.effectType === 'focus') {
    const remainingUnderCap = Math.max(0, GAME_ECONOMY.MAX_DAILY_XP - currentDayXpEarned);
    bonusAmount = Math.min(booster.maxDailyContribution, remainingUnderCap);
  }

  const updatedInventory = {
    ...inventory,
    [boosterId]: currentCount - 1,
  };

  const newWallet: WalletState = {
    ...wallet,
    growthPoints: wallet.growthPoints + bonusAmount,
    lifetimeXp: wallet.lifetimeXp + bonusAmount,
    lifetimeGpEarned: wallet.lifetimeGpEarned + bonusAmount,
    inventory: updatedInventory,
  };

  const tx: TransactionRecord = {
    id: `tx_booster_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'booster_consumed',
    amount: bonusAmount,
    balanceAfter: newWallet.growthPoints,
    referenceId: sessionReferenceId,
    description: `Consumed 1x ${booster.name}: +${bonusAmount} bonus applied under daily cap.`,
  };

  return {
    success: true,
    newWallet,
    newLedger: [tx, ...ledger],
    bonusXp: bonusAmount,
    bonusGp: bonusAmount,
  };
}
