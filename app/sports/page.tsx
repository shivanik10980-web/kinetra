'use client';

import React from 'react';
import Link from 'next/link';
import { SPORTS_CATALOGUE } from '@/lib/sports/catalogue';
import { MangaCard } from '@/components/system/MangaCard';
import {
  Target,
  Activity,
  ArrowRight,
  Shield,
  Sparkles,
  Lock,
  Layers,
  CheckCircle,
} from 'lucide-react';

export default function SportsLandingPage() {
  const isEnabled = process.env.NEXT_PUBLIC_SPORTS_LAB_ENABLED === 'true';

  if (!isEnabled) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-8">
        <MangaCard title="SPORTS SKILL LAB — ROADMAP" badge="FUTURE MODULE">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Target className="w-10 h-10 text-[var(--cyan-dim)]" />
              <div>
                <h2 className="text-2xl font-black uppercase">
                  Sports Skill Lab Preview
                </h2>
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Upcoming Module • Football & Basketball Vision Lab
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              The Sports Skill Lab introduces focused mini coaching modules for football footwork and basketball defensive posture. It adheres to Kinetra&apos;s strict local-first ethics: no fabricated ball events, no match tactics claims, and full XP parity with standard practice.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
              <div className="p-4 border-2 border-[var(--border-color)] bg-[var(--surface-inset)]">
                <div className="font-extrabold text-sm uppercase mb-1">Football Mechanics</div>
                <ul className="text-xs text-[var(--text-secondary)] list-disc pl-4 space-y-1">
                  <li>Lateral footwork & stance retention</li>
                  <li>Agility step sequences</li>
                  <li>Cadence touches with manual confirmation</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-[var(--border-color)] bg-[var(--surface-inset)]">
                <div className="font-extrabold text-sm uppercase mb-1">Basketball Mechanics</div>
                <ul className="text-xs text-[var(--text-secondary)] list-disc pl-4 space-y-1">
                  <li>Athletic defensive stance dwell</li>
                  <li>Lateral slide deceleration</li>
                  <li>Shooting-form rehearsal</li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-xs font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                To activate this live module, set <code>NEXT_PUBLIC_SPORTS_LAB_ENABLED=true</code> in your environment.
              </span>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] inline-flex items-center gap-2"
              >
                Back to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </MangaCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--border-color)] pb-4">
        <div>
          <div className="badge-status bg-[var(--cyan)] text-[var(--ink)] mb-2 shadow-[2px_2px_0px_var(--border-color)]">
            BETA MODULE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            Sports Skill Lab
          </h1>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1">
            Sport-specific mechanics • Local vision assistance • Transparent observations
          </p>
        </div>
      </div>

      {/* Sport Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SPORTS_CATALOGUE.map((sport) => (
          <div
            key={sport.id}
            className="manga-panel bracket-frame p-6 bg-[var(--surface-panel)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className="badge-status text-[11px] font-black"
                  style={{ backgroundColor: sport.accentColor, color: '#101318' }}
                >
                  {sport.name.toUpperCase()}
                </span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  {sport.drills.length} Typed Drills
                </span>
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight mb-1">
                {sport.name} Skill Lab
              </h2>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                {sport.tagline}
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                {sport.description}
              </p>

              {/* Drills Preview List */}
              <div className="flex flex-col gap-2 mb-6">
                {sport.drills.map((drill) => (
                  <div
                    key={drill.id}
                    className="p-3 border border-[var(--border-color)] bg-[var(--surface-inset)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-extrabold uppercase">{drill.title}</span>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Mode: {drill.mode} • {drill.defaultDurationSec}s
                      </div>
                    </div>
                    <span className="badge-status bg-[var(--paper)] text-[10px]">
                      {drill.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Link
                href={`/sports/${sport.id}`}
                className="touch-target w-full py-3 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center justify-center gap-2"
              >
                <span>Enter {sport.name} Lab</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
