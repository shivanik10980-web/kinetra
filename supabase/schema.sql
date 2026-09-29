-- Kinetra Supabase Database Schema with Strict Row-Level Security (RLS)

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Practitioner',
  locale TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'system',
  preferred_mode TEXT NOT NULL DEFAULT 'camera',
  reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
  sound_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit own profile"
  ON public.user_profiles
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 2. Movement Session Summaries
CREATE TABLE IF NOT EXISTS public.session_summaries (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  total_active_sec INTEGER NOT NULL DEFAULT 0,
  total_reps INTEGER NOT NULL DEFAULT 0,
  scored_reps INTEGER NOT NULL DEFAULT 0,
  median_q INTEGER,
  coverage_percent NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  cues_observed TEXT[] DEFAULT '{}',
  user_reflection TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session summaries"
  ON public.session_summaries
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 3. User Progression State
CREATE TABLE IF NOT EXISTS public.user_progressions (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  rank TEXT NOT NULL DEFAULT 'Initiate',
  unlocked_badges TEXT[] DEFAULT '{}',
  daily_ledgers JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_progressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progression ledger"
  ON public.user_progressions
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. Sports Skill Lab Sessions
CREATE TABLE IF NOT EXISTS public.sports_sessions (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id TEXT NOT NULL,
  drill_id TEXT NOT NULL,
  drill_title TEXT NOT NULL,
  mode TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  completed_intervals INTEGER NOT NULL,
  tracking_coverage NUMERIC(5,2) NOT NULL,
  mean_confidence NUMERIC(4,2),
  cues_count JSONB DEFAULT '{}'::jsonb,
  unknown_items TEXT[] DEFAULT '{}',
  reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sports_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sports sessions"
  ON public.sports_sessions
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
