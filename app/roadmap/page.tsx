'use client';

import React from 'react';
import { MangaCard } from '@/components/system/MangaCard';
import { Users, Shield, Trophy, Sparkles, CheckCircle } from 'lucide-react';

export default function RoadmapPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="border-b-2 border-[var(--border-color)] pb-4">
        <div className="badge-status bg-[var(--violet-subtle)] text-[var(--violet-dim)] mb-2">
          ROADMAP & ARCHITECTURE
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
          System Roadmap
        </h1>
        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1">
          Future design specs • No simulated live activity • Ethical multiplayer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MangaCard title="Stretch Party Challenges" badge="ROADMAP">
          <div className="flex flex-col gap-3">
            <Users className="w-8 h-8 text-[var(--cyan-dim)]" />
            <h3 className="font-extrabold text-base">Opt-in Private Groups with Capped Contributions</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Allows private circles of practitioners to complete collaborative weekly quests. Each member can contribute at most 1 slot per day (active movement or recovery), strictly preventing burnout competition.
            </p>
          </div>
        </MangaCard>

        <MangaCard title="Ethical Group Boards" badge="ROADMAP">
          <div className="flex flex-col gap-3">
            <Shield className="w-8 h-8 text-[var(--violet-dim)]" />
            <h3 className="font-extrabold text-base">Tied Completion Ratios & Pseudonymous Aliases</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Replaces toxic public leaderboards with collective completion ratios. Never exposes raw repetitions, speed, body fat, or duration rankings.
            </p>
          </div>
        </MangaCard>

        <MangaCard title="Local Model Caching & ServiceWorker" badge="IMPLEMENTED">
          <div className="flex flex-col gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <h3 className="font-extrabold text-base">Self-Hosted Vision & WASM Assets</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              MediaPipe vision WASM binaries and model weights are pinned and self-hosted locally in <code>public/wasm</code> and <code>public/models</code>. Works seamlessly offline.
            </p>
          </div>
        </MangaCard>

        <MangaCard title="Supabase Outbox Sync" badge="OPTIONAL CLOUD">
          <div className="flex flex-col gap-3">
            <Sparkles className="w-8 h-8 text-[var(--amber)]" />
            <h3 className="font-extrabold text-base">Owner-Only Row Level Security</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Client connects with anon key only. Every Supabase table is locked with strict RLS policies: <code>auth.uid() = owner_id</code>. Local camera summaries are stored only when user authorizes sync.
            </p>
          </div>
        </MangaCard>
      </div>
    </div>
  );
}
