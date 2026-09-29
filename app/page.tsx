'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { MangaCard } from '@/components/system/MangaCard';
import {
  Compass,
  Award,
  PlaySquare,
  Shield,
  HeartHandshake,
  Activity,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function WelcomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Hero Banner with Manga Panel Styling */}
      <section className="manga-panel bracket-frame p-8 sm:p-12 relative overflow-hidden bg-[var(--surface-panel)]">
        <div className="absolute inset-0 halftone-accent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="badge-status bg-[var(--cyan)] text-[var(--ink)] mb-4 shadow-[2px_2px_0px_var(--border-color)]">
            SIH26196 • HACKATHON PROTOTYPE
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-none mb-4">
            {t('welcome.hero_title')}
          </h1>
          <p className="text-lg sm:text-xl font-medium text-[var(--text-secondary)] leading-relaxed mb-8">
            {t('welcome.hero_subtitle')}
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <Link
              href="/dashboard"
              className="touch-target px-8 py-3.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-base border-2 border-[var(--border-color)] shadow-[4px_4px_0px_var(--border-color)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform flex items-center gap-2"
            >
              <span>{t('welcome.guest_cta')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/workout?mode=guided"
              className="touch-target px-6 py-3.5 bg-[var(--surface-inset)] text-[var(--text-primary)] font-bold text-sm border-2 border-[var(--border-color)] hover:bg-[var(--paper)] flex items-center gap-2"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>{t('welcome.guided_cta')}</span>
            </Link>
            <Link
              href="/demo"
              className="touch-target px-5 py-3.5 bg-transparent text-[var(--text-secondary)] font-bold text-sm hover:underline flex items-center gap-1.5"
            >
              <PlaySquare className="w-4 h-4" />
              <span>{t('welcome.replay_cta')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Ethical System Manifesto Card */}
      <section className="manga-panel p-6 bg-[var(--surface-inset)] border-l-4 border-l-[var(--violet)]">
        <div className="flex items-start gap-4">
          <Shield className="w-8 h-8 text-[var(--violet-dim)] shrink-0 mt-1" />
          <div>
            <h2 className="font-extrabold text-lg uppercase tracking-wide mb-1">
              Ethical Movement Design System
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {t('welcome.ethics_notice')}
            </p>
          </div>
        </div>
      </section>

      {/* Three Pillars Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MangaCard title="Deterministic Vision" badge="01" interactive>
          <div className="flex flex-col gap-3">
            <Activity className="w-8 h-8 text-[var(--cyan-dim)]" />
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Runs MediaPipe Pose entirely in your browser memory. Frames and joint landmarks are never transmitted over the network or saved to remote databases.
            </p>
          </div>
        </MangaCard>

        <MangaCard title="Capped Progression" badge="02" interactive>
          <div className="flex flex-col gap-3">
            <Award className="w-8 h-8 text-[var(--violet-dim)]" />
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Earns a maximum of 40 XP per day (30 XP for 1 session + 10 XP for reflection). More reps, higher speed, or exhausting yourself never grants extra XP.
            </p>
          </div>
        </MangaCard>

        <MangaCard title="Equal Recovery Parity" badge="03" interactive>
          <div className="flex flex-col gap-3">
            <HeartHandshake className="w-8 h-8 text-[var(--amber)]" />
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Accessible seated guided flow and planned rest check-ins earn the exact same 30 XP as high-movement camera practice. Rest is rewarded.
            </p>
          </div>
        </MangaCard>
      </section>
    </div>
  );
}
