'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { SPORTS_CATALOGUE } from '@/lib/sports/catalogue';
import { MangaCard } from '@/components/system/MangaCard';
import { ArrowLeft, ArrowRight, Activity, Clock, Target, Layers } from 'lucide-react';

export default function SportDetailPage() {
  const params = useParams();
  const sportId = params.sportId as string;

  const sport = SPORTS_CATALOGUE.find((s) => s.id === sportId);
  if (!sport) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back button & Header */}
      <div>
        <Link
          href="/sports"
          className="text-xs font-bold text-[var(--text-secondary)] underline hover:text-[var(--text-primary)] inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sports Lab
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 inline-block border border-[var(--border-color)]"
            style={{ backgroundColor: sport.accentColor }}
          />
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            {sport.name} Skill Drills
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {sport.description}
        </p>
      </div>

      {/* Drills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sport.drills.map((drill) => (
          <MangaCard key={drill.id} title={drill.title} badge={drill.mode.toUpperCase()}>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {drill.shortDesc}
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-bold">
              <div className="p-2 border border-[var(--border-color)] bg-[var(--surface-inset)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>{drill.defaultDurationSec}s Duration</span>
              </div>
              <div className="p-2 border border-[var(--border-color)] bg-[var(--surface-inset)] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[var(--cyan-dim)]" />
                <span>{drill.targetIntervalCount} Target Reps</span>
              </div>
            </div>

            {/* Supported Observations */}
            <div className="mb-6">
              <span className="text-[11px] font-extrabold uppercase text-[var(--text-secondary)] block mb-1.5">
                Supported Sensors & Observations:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {drill.supportedObservations.map((obs) => (
                  <span
                    key={obs}
                    className="px-2 py-0.5 border border-[var(--border-color)] text-[10px] font-bold bg-[var(--paper)]"
                  >
                    {obs}
                  </span>
                ))}
              </div>
            </div>

            {/* Launch CTA */}
            <div>
              <Link
                href={`/sports/${sport.id}/${drill.id}`}
                className="touch-target w-full py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center justify-center gap-2"
              >
                <span>Launch Mini Coach</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </MangaCard>
        ))}
      </div>
    </div>
  );
}
