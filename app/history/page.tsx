'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { SessionSummary, MovementType } from '@/lib/exercises/types';
import { MangaCard } from '@/components/system/MangaCard';
import {
  Calendar,
  Download,
  Trash2,
  Filter,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function HistoryPage() {
  const { t } = useTranslation();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [selectedFilter]);

  const loadSessions = async () => {
    const filter = selectedFilter === 'all' ? undefined : { movement: selectedFilter };
    const list = await defaultStorage.getSessions(filter);
    setSessions(list);
  };

  const handleExportJson = async () => {
    const data = await defaultStorage.exportData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinetra_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    if (window.confirm(t('action.delete_confirm'))) {
      setIsDeleting(true);
      await defaultStorage.clearAllData();
      await loadSessions();
      setIsDeleting(false);
    }
  };

  // Trend data for SVG line chart (last 10 sessions with Q score)
  const scoredPoints = sessions
    .filter((s) => s.medianQScore !== null)
    .slice(0, 10)
    .reverse();

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            Practice History
          </h1>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1">
            Local session logs • Transparent technique indicators • Full data export
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJson}
            className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] font-bold text-xs uppercase flex items-center gap-2 hover:bg-[var(--paper)]"
          >
            <Download className="w-4 h-4" />
            {t('action.export')}
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={isDeleting || sessions.length === 0}
            className="touch-target px-4 py-2 border-2 border-[var(--crimson)] text-[var(--crimson)] font-bold text-xs uppercase flex items-center gap-2 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            {t('action.delete_all')}
          </button>
        </div>
      </div>

      {/* SVG Trend Chart if scored sessions exist */}
      {scoredPoints.length >= 2 && (
        <MangaCard title="Technique Trend (Median Q)" badge="Observable Heuristics">
          <div className="w-full h-44 flex items-end pt-4 pb-2 px-2 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#ccc" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#ccc" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#888" strokeWidth="1" />

              {/* Polyline */}
              {(() => {
                const points = scoredPoints.map((s, idx) => {
                  const x = (idx / (scoredPoints.length - 1)) * 500;
                  const q = s.medianQScore || 50;
                  // Map Q [0, 100] to y [120, 10]
                  const y = 120 - (q / 100) * 110;
                  return `${x},${y}`;
                });
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#57E5D6"
                      strokeWidth="3"
                      points={points.join(' ')}
                    />
                    {scoredPoints.map((s, idx) => {
                      const x = (idx / (scoredPoints.length - 1)) * 500;
                      const q = s.medianQScore || 50;
                      const y = 120 - (q / 100) * 110;
                      return (
                        <circle
                          key={s.id}
                          cx={x}
                          cy={y}
                          r="4.5"
                          fill="#101318"
                          stroke="#57E5D6"
                          strokeWidth="2.5"
                        />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)] px-2 pt-2 border-t border-[var(--border-color)]">
            <span>Older Practice</span>
            <span>Recent Practice</span>
          </div>
        </MangaCard>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-[var(--border-color)] pb-2">
        <span className="text-xs font-bold uppercase text-[var(--text-secondary)] flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {[
          { id: 'all', label: 'All Sessions' },
          { id: 'squat', label: 'Squat' },
          { id: 'elbow_flexion', label: 'Elbow Flexion' },
          { id: 'seated_guided', label: 'Seated Guided' },
          { id: 'recovery_checkin', label: 'Recovery Check-in' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3 py-1 text-xs font-extrabold uppercase border transition-colors ${
              selectedFilter === tab.id
                ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History Table */}
      {sessions.length === 0 ? (
        <div className="manga-panel p-10 text-center bg-[var(--surface-inset)]">
          <Calendar className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-60" />
          <h3 className="font-extrabold text-base uppercase mb-1">No sessions match filter</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Practice sessions and guided reflections will appear here automatically.
          </p>
          <Link
            href="/workout"
            className="touch-target px-6 py-2 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-xs border-2 border-[var(--border-color)] inline-flex items-center gap-1.5"
          >
            Start Practice
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse manga-panel text-sm bg-[var(--surface-panel)]">
            <thead>
              <tr className="border-b-2 border-[var(--border-color)] bg-[var(--surface-inset)] text-[var(--text-secondary)] text-xs uppercase font-extrabold">
                <th className="p-3">Date</th>
                <th className="p-3">Movement</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Reps</th>
                <th className="p-3">Technique (Q)</th>
                <th className="p-3">Coverage</th>
                <th className="p-3">Reflection</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-[var(--border-color)] hover:bg-[var(--surface-inset)]">
                  <td className="p-3 font-mono text-xs whitespace-nowrap">
                    {new Date(s.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="p-3 font-extrabold uppercase">{s.movement.replace('_', ' ')}</td>
                  <td className="p-3">
                    <span className="badge-status text-[11px] bg-[var(--paper)] text-[var(--ink)]">
                      {s.source}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{s.totalActiveTimeSec}s</td>
                  <td className="p-3 font-bold">{s.totalRepsCompleted}</td>
                  <td className="p-3 font-black text-[var(--cyan-dim)]">
                    {s.medianQScore !== null ? s.medianQScore : '—'}
                  </td>
                  <td className="p-3">{s.overallCoveragePercent}%</td>
                  <td className="p-3 text-xs text-[var(--text-secondary)] max-w-xs truncate">
                    {s.userReflection || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
