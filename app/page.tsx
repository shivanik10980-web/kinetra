'use client';

import React, { useState } from 'react';
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
  Camera,
  EyeOff,
  Moon,
  User,
  Map,
  Check,
} from 'lucide-react';

export default function WelcomePage() {
  const { t } = useTranslation();

  // Quick personalization state
  const [prefPosture, setPrefPosture] = useState<'any' | 'standing' | 'seated'>('any');
  const [prefTime, setPrefTime] = useState<'5' | '10' | '15'>('5');
  const [prefEquipment, setPrefEquipment] = useState<'none' | 'chair'>('none');

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Hero Banner with Manga Panel Styling */}
      <section className="manga-panel bracket-frame p-8 sm:p-12 relative overflow-hidden bg-[var(--surface-panel)]">
        <div className="absolute inset-0 halftone-accent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="badge-status bg-[var(--cyan)] text-[var(--ink)] mb-4 shadow-[2px_2px_0px_var(--border-color)]">
            KINETRA MOVEMENT RPG
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-none mb-4">
            Turn five minutes of movement into your next adventure.
          </h1>
          <p className="text-lg sm:text-xl font-medium text-[var(--text-secondary)] leading-relaxed mb-8">
            An accessible movement progression RPG with a persistent 3D avatar, spendable Growth Points (GP),
            and two primal awakenings: Werewolf and Tigerhuman. Equal rewards for movement, seated practice, and rest.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <Link
              href="/avatar"
              className="touch-target px-8 py-3.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-base border-2 border-[var(--border-color)] shadow-[4px_4px_0px_var(--border-color)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform flex items-center gap-2"
            >
              <User className="w-5 h-5" />
              <span>Enter Avatar RPG</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/adventure"
              className="touch-target px-6 py-3.5 bg-[var(--surface-inset)] text-[var(--text-primary)] font-bold text-sm border-2 border-[var(--border-color)] hover:bg-[var(--paper)] flex items-center gap-2"
            >
              <Map className="w-4 h-4" />
              <span>Week 1 Adventure</span>
            </Link>
            <Link
              href="/dashboard"
              className="touch-target px-5 py-3.5 bg-transparent text-[var(--text-secondary)] font-bold text-sm hover:underline flex items-center gap-1.5"
            >
              <span>System Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Core Participation Pathways */}
      <section>
        <div className="mb-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-[var(--cyan-dim)]">
            Choose Your Method
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Three Ways to Practice Daily
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            All paths award identical 30 XP & 30 GP per session, capped at 40 XP/day with reflection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Path 1: Move with camera */}
          <MangaCard title="Move with Camera" badge="VISION TRACKING" interactive>
            <div className="flex flex-col gap-3">
              <Camera className="w-8 h-8 text-[var(--cyan-dim)]" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Deterministic browser-only pose estimation. Real-time form cues with 100% on-device
                optical privacy. Zero video is ever stored or transmitted.
              </p>
              <Link
                href="/workout?mode=live"
                className="mt-2 touch-target px-4 py-2 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] text-center shadow-[2px_2px_0px_var(--border-color)]"
              >
                Start Camera Practice
              </Link>
            </div>
          </MangaCard>

          {/* Path 2: Move without camera */}
          <MangaCard title="Move without Camera" badge="GUIDED CADENCE" interactive>
            <div className="flex flex-col gap-3">
              <EyeOff className="w-8 h-8 text-[var(--violet-dim)]" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Rhythm-paced audio and visual cues with seated and standing adaptations.
                Manual interval tracking with zero camera access required.
              </p>
              <Link
                href="/workout?mode=guided"
                className="mt-2 touch-target px-4 py-2 bg-[var(--paper)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] text-center shadow-[2px_2px_0px_var(--border-color)] hover:bg-[var(--cyan)]"
              >
                Start Guided Mode
              </Link>
            </div>
          </MangaCard>

          {/* Path 3: Rest and reflect */}
          <MangaCard title="Rest and Reflect" badge="EQUAL RECOVERY" interactive>
            <div className="flex flex-col gap-3">
              <Moon className="w-8 h-8 text-[var(--amber)]" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Equal reward parity for restorative recovery. Complete a mindful check-in to log
                your daily practice slot and maintain healthy progression.
              </p>
              <Link
                href="/quests"
                className="mt-2 touch-target px-4 py-2 bg-[var(--paper)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] text-center shadow-[2px_2px_0px_var(--border-color)] hover:bg-[var(--amber)]"
              >
                Log Recovery Reflection
              </Link>
            </div>
          </MangaCard>
        </div>
      </section>

      {/* Quick Personalization Box */}
      <section className="manga-panel p-6 bg-[var(--surface-panel)] border-2 border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--cyan-dim)]" />
          <h3 className="font-black text-sm uppercase tracking-wide">
            Personalise Your Daily Practice
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Posture */}
          <div>
            <label className="font-extrabold uppercase text-[var(--text-secondary)] block mb-1.5">
              Preferred Posture
            </label>
            <div className="flex items-center gap-1.5">
              {(['any', 'standing', 'seated'] as const).map((posture) => (
                <button
                  key={posture}
                  type="button"
                  onClick={() => setPrefPosture(posture)}
                  className={`px-3 py-1.5 border font-bold uppercase ${
                    prefPosture === posture
                      ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  {posture}
                </button>
              ))}
            </div>
          </div>

          {/* Available Time */}
          <div>
            <label className="font-extrabold uppercase text-[var(--text-secondary)] block mb-1.5">
              Available Time
            </label>
            <div className="flex items-center gap-1.5">
              {(['5', '10', '15'] as const).map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setPrefTime(time)}
                  className={`px-3 py-1.5 border font-bold uppercase ${
                    prefTime === time
                      ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  {time} Min
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="font-extrabold uppercase text-[var(--text-secondary)] block mb-1.5">
              Space & Equipment
            </label>
            <div className="flex items-center gap-1.5">
              {(['none', 'chair'] as const).map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setPrefEquipment(eq)}
                  className={`px-3 py-1.5 border font-bold uppercase ${
                    prefEquipment === eq
                      ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  {eq === 'none' ? 'Bodyweight' : 'Chair / Desk'}
                </button>
              ))}
            </div>
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
    </div>
  );
}
