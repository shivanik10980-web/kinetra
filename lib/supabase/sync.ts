import { getSupabaseClient, isSupabaseConfigured } from './client';
import { SessionSummary } from '../exercises/types';
import { ProgressionState } from '../game/types';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedSessionsCount: number;
}

/**
 * Idempotent outbox synchronizer to push completed session summaries
 * and user progression to Supabase when user has authenticated and opted in.
 */
export async function syncToSupabase(
  sessions: SessionSummary[],
  progression: ProgressionState
): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase cloud configuration not found. Sessions remain safely stored in local IndexedDB.',
      syncedSessionsCount: 0,
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Failed to initialize Supabase client.',
      syncedSessionsCount: 0,
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return {
        success: false,
        message: 'No active authenticated user. Local data remains local.',
        syncedSessionsCount: 0,
      };
    }

    const userId = authData.user.id;

    // 1. Sync Sessions with owner_id
    let syncedCount = 0;
    if (sessions.length > 0) {
      const rows = sessions.map((s) => ({
        id: s.id,
        owner_id: userId,
        movement: s.movement,
        variant_id: s.variantId,
        source: s.source,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        total_active_sec: s.totalActiveTimeSec,
        total_reps: s.totalRepsCompleted,
        scored_reps: s.scoredRepsCount,
        median_q: s.medianQScore,
        coverage_percent: s.overallCoveragePercent,
        cues_observed: s.observedCueIds,
        user_reflection: s.userReflection,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from('session_summaries')
        .upsert(rows, { onConflict: 'id' });

      if (upsertErr) {
        throw upsertErr;
      }
      syncedCount = rows.length;
    }

    // 2. Sync Progression Ledger
    const progressionRow = {
      owner_id: userId,
      total_xp: progression.totalXp,
      level: progression.level,
      rank: progression.rank,
      unlocked_badges: progression.unlockedBadges,
      daily_ledgers: progression.dailyLedgers,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('user_progressions')
      .upsert(progressionRow, { onConflict: 'owner_id' });

    return {
      success: true,
      message: `Successfully synchronized ${syncedCount} sessions to cloud ledger.`,
      syncedSessionsCount: syncedCount,
    };
  } catch (err: any) {
    console.error('Supabase sync error:', err);
    return {
      success: false,
      message: `Sync failed: ${err.message || 'Unknown network error'}. Local data intact.`,
      syncedSessionsCount: 0,
    };
  }
}
