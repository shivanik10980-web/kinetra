'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { DeterministicRepEngine } from '@/lib/exercises/engine';
import { SQUAT_DEFINITION } from '@/lib/exercises/squat';
import {
  createSyntheticSquatSequence,
  createSyntheticPartialSquatSequence,
  createSyntheticTrackingLossSequence,
} from '@/lib/synthetic/fixtures';
import { NormalizedLandmark, POSE_LANDMARKS } from '@/lib/pose/types';
import { MangaCard } from '@/components/system/MangaCard';
import { PlaySquare, AlertCircle, Play, RotateCcw, ShieldCheck } from 'lucide-react';

export default function DemoPage() {
  const { t } = useTranslation();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<'valid' | 'partial' | 'tracking_loss'>('valid');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repsCount, setRepsCount] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>('IDLE');
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [coveragePercent, setCoveragePercent] = useState<number>(0);
  const [lastCue, setLastCue] = useState<string>('');

  const playbackTimerRef = useRef<any>(null);

  // Initialize isolated demo engine
  const [engine, setEngine] = useState<DeterministicRepEngine | null>(null);

  useEffect(() => {
    const demoEngine = new DeterministicRepEngine(
      {
        definition: SQUAT_DEFINITION,
        variant: SQUAT_DEFINITION.variants[0],
        source: 'demo', // Physically blocked from real ledger
      },
      {
        onPhaseChange: (p) => setCurrentPhase(p),
        onRepCompleted: () => setRepsCount(demoEngine.getRepsCount()),
        onCue: (cueId) => setLastCue(cueId),
        onCoverageUpdate: (cov) => setCoveragePercent(cov),
      }
    );
    setEngine(demoEngine);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  const handleRunScenario = () => {
    if (!engine) return;
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    engine.reset();
    setRepsCount(0);
    setCurrentPhase('IDLE');
    setCurrentAngle(null);
    setLastCue('');
    setIsPlaying(true);

    let sequence: { landmarks: NormalizedLandmark[]; timestampMs: number }[] = [];
    if (selectedScenario === 'valid') {
      sequence = createSyntheticSquatSequence(3, 2400);
    } else if (selectedScenario === 'partial') {
      sequence = createSyntheticPartialSquatSequence();
    } else {
      sequence = createSyntheticTrackingLossSequence();
    }

    let frameIdx = 0;
    const intervalMs = 45; // ~22 FPS playback

    playbackTimerRef.current = setInterval(() => {
      if (frameIdx >= sequence.length) {
        clearInterval(playbackTimerRef.current);
        setIsPlaying(false);
        return;
      }

      const frame = sequence[frameIdx];
      const res = engine.processFrame(frame.landmarks, frame.timestampMs, 640, 480);
      setCurrentAngle(res.currentAngle);
      setCurrentPhase(res.phase);
      setRepsCount(res.repsCount);
      setCoveragePercent(res.coveragePercent);

      // Draw skeleton on canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          drawDemoSkeleton(ctx, frame.landmarks, canvasRef.current.width, canvasRef.current.height);
        }
      }

      frameIdx++;
    }, intervalMs);
  };

  const drawDemoSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    w: number,
    h: number
  ) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#57E5D6';
    ctx.fillStyle = '#B8A2FF';

    const connections: [number, number][] = [
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    ];

    for (const [i, j] of connections) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    // Draw joints
    for (const idx of [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE]) {
      const pt = landmarks[idx];
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#57E5D6';
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Prominent Simulated Replay Banner */}
      <div className="manga-panel p-4 bg-amber-500/15 border-2 border-amber-500 text-[var(--text-primary)]">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
          <div>
            <div className="font-black text-sm uppercase tracking-wider text-amber-500">
              {t('demo.banner')}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">
              {t('demo.banner_sub')}
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Controls */}
      <MangaCard title={t('demo.scenario')}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'valid', label: t('demo.scenario_valid') },
              { id: 'partial', label: t('demo.scenario_partial') },
              { id: 'tracking_loss', label: t('demo.scenario_loss') },
            ].map((scen) => (
              <button
                key={scen.id}
                onClick={() => setSelectedScenario(scen.id as any)}
                className={`touch-target px-3.5 py-1.5 text-xs font-black uppercase border transition-colors ${
                  selectedScenario === scen.id
                    ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-inset)] hover:bg-[var(--paper)]'
                }`}
              >
                {scen.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunScenario}
            disabled={isPlaying}
            className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {t('demo.play')}
          </button>
        </div>
      </MangaCard>

      {/* Live Replay Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Canvas Visualizer */}
        <div className="md:col-span-2 manga-panel bracket-frame aspect-[4/3] bg-black relative flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full h-full object-cover"
          />

          {/* Persistent Overlay Badge */}
          <div className="absolute top-3 left-3 bg-black/80 border border-amber-400 px-3 py-1 text-xs font-black text-amber-400 uppercase tracking-wider">
            SYNTHETIC REPLAY FEED
          </div>

          {/* Rep Count HUD */}
          <div className="absolute bottom-3 left-3 bg-black/85 border-2 border-[var(--cyan)] text-white px-4 py-2 font-black">
            <div className="text-[10px] text-[var(--cyan)] uppercase tracking-widest">
              REPS COUNTED
            </div>
            <div className="text-4xl tabular-nums">{repsCount}</div>
          </div>
        </div>

        {/* Engine Telemetry */}
        <div className="manga-panel p-5 bg-[var(--surface-panel)] flex flex-col justify-between">
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide border-b border-[var(--border-color)] pb-2 mb-4">
              Pure Engine Diagnostics
            </h3>
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <span className="text-[var(--text-secondary)]">Phase State: </span>
                <span className="font-extrabold text-[var(--violet-dim)]">{currentPhase}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Smoothed Angle: </span>
                <span className="font-extrabold">
                  {currentAngle !== null ? `${currentAngle}°` : 'None'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Active Coverage: </span>
                <span className="font-extrabold">{coveragePercent}%</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Last Engine Cue: </span>
                <span className="font-bold text-[var(--cyan-dim)]">{lastCue || '—'}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[var(--surface-inset)] border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] mt-4">
            <ShieldCheck className="w-4 h-4 text-emerald-600 inline mr-1" />
            Verified: All frames route through the identical deterministic pipeline without incrementing real XP or altering local history.
          </div>
        </div>
      </div>
    </div>
  );
}
