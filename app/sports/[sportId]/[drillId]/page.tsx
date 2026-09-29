'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, notFound } from 'next/navigation';
import { SPORTS_CATALOGUE } from '@/lib/sports/catalogue';
import { DrillEngine } from '@/lib/sports/drill-engine';
import { MediaPipePoseProvider } from '@/lib/pose/mediapipe-service';
import { NormalizedLandmark, POSE_LANDMARKS } from '@/lib/pose/types';
import { SportsSessionSummary } from '@/lib/sports/types';
import { DrillReviewModal } from '@/components/sports/DrillReviewModal';
import { MangaCard } from '@/components/system/MangaCard';
import {
  ArrowLeft,
  Camera,
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCw,
  Plus,
  Clock,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export default function LiveDrillPage() {
  const params = useParams();
  const router = useRouter();

  const sportId = params.sportId as string;
  const drillId = params.drillId as string;

  const sport = SPORTS_CATALOGUE.find((s) => s.id === sportId);
  const drill = sport?.drills.find((d) => d.id === drillId);

  if (!sport || !drill) {
    notFound();
  }

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const [provider] = useState(() => new MediaPipePoseProvider());
  const [engine, setEngine] = useState<DrillEngine | null>(null);

  const [setupStep, setSetupStep] = useState<'instructions' | 'practice'>('instructions');
  const [cameraState, setCameraState] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState<boolean>(drill.mode === 'manual' || drill.mode === 'timed');

  const [activeCue, setActiveCue] = useState<string>('Prepare in athletic posture');
  const [intervalsCount, setIntervalsCount] = useState<number>(0);
  const [coveragePercent, setCoveragePercent] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(drill.defaultDurationSec);
  const [reviewSummary, setReviewSummary] = useState<SportsSessionSummary | null>(null);

  // Initialize DrillEngine
  useEffect(() => {
    const drillEngine = new DrillEngine(drill, isManualMode ? 'guided' : 'live', {
      onCue: (cue) => setActiveCue(cue),
      onIntervalCompleted: (count) => setIntervalsCount(count),
    });
    setEngine(drillEngine);

    return () => {
      stopCamera();
      provider.close();
    };
  }, [drill, isManualMode, provider]);

  // Timer countdown
  useEffect(() => {
    let timer: any = null;
    if (setupStep === 'practice' && !isPaused && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [setupStep, isPaused, secondsRemaining]);

  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    setCameraState('initializing');
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera unsupported in this browser context.');
      }

      await provider.initialize({
        wasmPath: '/wasm',
        modelAssetPath: '/models/pose_landmarker_lite.task',
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      activeStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('ready');
      runDetectionLoop();
    } catch (err: any) {
      console.warn('Sports camera failure:', err);
      setCameraState('error');
      setErrorMessage(err.message || 'Camera permission denied or camera busy.');
    }
  };

  const runDetectionLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !engine) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const render = async () => {
      if (!video || video.paused || video.ended || video.readyState < 2) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      const now = performance.now();
      const result = await provider.detectForVideo(video, now);

      if (canvas && ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result && result.landmarks && result.landmarks.length > 0) {
          const lms = result.landmarks[0];
          drawDrillSkeleton(ctx, lms, canvas.width, canvas.height);

          const obs = engine.processPoseFrame(lms, now, canvas.width, canvas.height);
          setCoveragePercent(obs.trackingCoverage);
        } else {
          engine.processPoseFrame([], now, canvas.width, canvas.height);
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);
  }, [provider, engine]);

  const drawDrillSkeleton = (
    ctx: CanvasRenderingContext2D,
    lms: NormalizedLandmark[],
    w: number,
    h: number
  ) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = sport.accentColor;
    ctx.fillStyle = '#101318';

    const connections: [number, number][] = [
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
      [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
      [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
      [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    ];

    for (const [i, j] of connections) {
      const p1 = lms[i];
      const p2 = lms[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.5 && (p2.visibility ?? 1) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    for (const idx of [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE]) {
      const pt = lms[idx];
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 6, 0, 2 * Math.PI);
        ctx.fillStyle = sport.accentColor;
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  const handleStartPractice = () => {
    setSetupStep('practice');
    if (!isManualMode) {
      startCamera();
    }
  };

  const handleManualIncrement = () => {
    engine?.manualIncrement();
  };

  const handleFinish = () => {
    stopCamera();
    if (engine) {
      const summary = engine.createSessionSummary();
      setReviewSummary(summary);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-3">
        <div>
          <Link
            href={`/sports/${sport.id}`}
            className="text-xs font-bold text-[var(--text-secondary)] underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to {sport.name} Drills
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            {drill.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              stopCamera();
              setIsManualMode(!isManualMode);
            }}
            className="text-xs font-bold px-3 py-1.5 border border-[var(--border-color)] bg-[var(--surface-inset)] hover:bg-[var(--paper)]"
          >
            {isManualMode ? 'Enable Vision Mode' : 'Switch to Manual Mode'}
          </button>
        </div>
      </div>

      {/* Screen 1: Instructions & Neutral Silhouette Setup */}
      {setupStep === 'instructions' && (
        <MangaCard title="Drill Setup & Framing" badge="STEP 1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Neutral Silhouette Visual Container */}
            <div className="manga-panel aspect-square bg-[var(--surface-inset)] flex flex-col items-center justify-center p-6 text-center border-2 border-[var(--border-color)] relative overflow-hidden">
              <div className="w-24 h-48 border-2 border-dashed border-[var(--border-color)] rounded-lg flex flex-col items-center justify-between p-3 bg-white/40">
                <div className="w-8 h-8 rounded-full border border-[var(--border-color)] bg-[var(--cyan)]" />
                <div className="w-12 h-16 border border-[var(--border-color)] bg-[var(--paper)]" />
                <div className="w-10 h-14 border border-[var(--border-color)] bg-[var(--violet)]" />
              </div>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase mt-3">
                Neutral Motion Framing Outline
              </span>
            </div>

            {/* Setup Checklist */}
            <div className="flex flex-col gap-4">
              <h3 className="font-black text-base uppercase">Setup Recommendations:</h3>
              <ol className="list-decimal pl-5 text-sm text-[var(--text-secondary)] space-y-2">
                {drill.setupSteps.map((step, idx) => (
                  <li key={idx} className="font-medium leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>

              <div className="p-3 bg-[var(--surface-panel)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                <strong>Mode:</strong> {isManualMode ? 'Manual / Tap Counter' : 'Local Computer Vision'} •{' '}
                <strong>Target:</strong> {drill.targetIntervalCount} intervals in {drill.defaultDurationSec}s.
              </div>

              <button
                onClick={handleStartPractice}
                className="touch-target px-8 py-3 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] mt-2 inline-flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Begin Drill
              </button>
            </div>
          </div>
        </MangaCard>
      )}

      {/* Screen 2: Live Mini Coach */}
      {setupStep === 'practice' && (
        <div className="flex flex-col gap-4">
          {/* Active Cue Banner */}
          <div className="manga-panel p-3 bg-[var(--surface-panel)] border-2 border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--cyan)] animate-pulse border border-[var(--border-color)]" />
              <span className="font-extrabold text-sm sm:text-base tracking-wide">
                {activeCue}
              </span>
            </div>
            <div className="font-mono text-sm font-black tabular-nums">
              {secondsRemaining}s remaining
            </div>
          </div>

          {/* Viewport or Manual Controller */}
          {!isManualMode ? (
            <div className="manga-panel bracket-frame aspect-[4/3] bg-black relative flex items-center justify-center overflow-hidden">
              {cameraState === 'error' && (
                <div className="text-white text-center p-6 max-w-sm z-20">
                  <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <div className="text-sm font-black uppercase mb-1">Camera Unavailable</div>
                  <p className="text-xs text-gray-300 mb-3">{errorMessage}</p>
                  <button
                    onClick={() => setIsManualMode(true)}
                    className="touch-target px-4 py-2 bg-[var(--cyan)] text-[var(--ink)] font-bold text-xs"
                  >
                    Switch to Manual Tap Mode
                  </button>
                </div>
              )}

              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  cameraState === 'ready' ? 'block' : 'hidden'
                }`}
              />

              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-10 ${
                  cameraState === 'ready' ? 'block' : 'hidden'
                }`}
              />

              {/* HUD */}
              <div className="absolute top-4 left-4 z-20 bg-black/80 border-2 border-[var(--cyan)] text-white px-4 py-2 font-black">
                <div className="text-[10px] text-[var(--cyan)] uppercase">INTERVALS</div>
                <div className="text-4xl tabular-nums">{intervalsCount}</div>
              </div>

              <div className="absolute top-4 right-4 z-20 bg-black/80 border border-white/60 text-white px-3 py-1 text-xs font-bold">
                Coverage: {coveragePercent}%
              </div>
            </div>
          ) : (
            <MangaCard title="Manual / Tap Cadence Practice">
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <div className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">
                  Completed Drill Intervals
                </div>
                <div className="text-6xl font-black tabular-nums">{intervalsCount}</div>
                <button
                  onClick={handleManualIncrement}
                  className="touch-target px-10 py-5 bg-[var(--cyan)] text-[var(--ink)] font-black text-lg border-2 border-[var(--border-color)] shadow-[4px_4px_0px_var(--border-color)] hover:translate-x-[-2px] hover:translate-y-[-2px] flex items-center gap-2"
                >
                  <Plus className="w-6 h-6" />
                  Tap to Record Interval
                </button>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-2">
                  Spacebar or screen tap records intervals. Equal participation XP is awarded regardless of input mode.
                </p>
              </div>
            </MangaCard>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between p-3 manga-panel bg-[var(--surface-panel)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isPaused) {
                    setIsPaused(false);
                    engine?.resume();
                  } else {
                    setIsPaused(true);
                    engine?.pause();
                  }
                }}
                className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] font-bold text-xs uppercase flex items-center gap-1.5"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>

              {!isManualMode && (
                <button
                  onClick={handleManualIncrement}
                  className="touch-target px-3 py-2 border border-[var(--border-color)] bg-[var(--paper)] text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Manual Interval
                </button>
              )}
            </div>

            <button
              onClick={handleFinish}
              className="touch-target px-5 py-2 bg-[var(--crimson)] text-white font-black text-xs uppercase border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" />
              Stop & Review
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewSummary && (
        <DrillReviewModal
          summary={reviewSummary}
          onClose={() => router.push(`/sports/${sport.id}`)}
        />
      )}
    </div>
  );
}
