'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ExerciseDefinition, ExerciseVariant, RepEvent, RepPhase, CueId, SessionSummary } from '@/lib/exercises/types';
import { DeterministicRepEngine } from '@/lib/exercises/engine';
import { MediaPipePoseProvider } from '@/lib/pose/mediapipe-service';
import { NormalizedLandmark, POSE_LANDMARKS } from '@/lib/pose/types';
import { useTranslation } from '@/lib/i18n/context';
import { speechManager } from '@/lib/sound/synth';
import { defaultStorage } from '@/lib/storage/indexeddb';
import {
  Camera,
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCw,
  Sliders,
  CheckCircle,
  EyeOff,
} from 'lucide-react';

interface PoseCameraProps {
  definition: ExerciseDefinition;
  variant: ExerciseVariant;
  onFinishSession: (summary: SessionSummary) => void;
  onSwitchToGuided: () => void;
}

export const PoseCamera: React.FC<PoseCameraProps> = ({
  definition,
  variant,
  onFinishSession,
  onSwitchToGuided,
}) => {
  const { t, locale } = useTranslation();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [provider] = useState(() => new MediaPipePoseProvider());
  const [engine, setEngine] = useState<DeterministicRepEngine | null>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<RepPhase>('IDLE');
  const [repsCount, setRepsCount] = useState<number>(0);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [coveragePercent, setCoveragePercent] = useState<number>(0);
  const [activeCue, setActiveCue] = useState<string>('');
  const [showDevView, setShowDevView] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  const animationFrameId = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Initialize engine
  useEffect(() => {
    defaultStorage.getProfile().then((p) => setSoundEnabled(p.soundEnabled));

    const repEngine = new DeterministicRepEngine(
      {
        definition,
        variant,
        source: 'live',
        preferredSide: 'auto',
      },
      {
        onPhaseChange: (phase) => setCurrentPhase(phase),
        onRepCompleted: () => setRepsCount(repEngine.getRepsCount()),
        onCue: (cueId: CueId) => {
          const cueText = t(`cue.${cueId}` as any);
          setActiveCue(cueText);
          speechManager.speak(cueText, locale, soundEnabled, true);
        },
        onCoverageUpdate: (cov) => setCoveragePercent(cov),
      }
    );

    setEngine(repEngine);

    return () => {
      repEngine.reset();
    };
  }, [definition, variant, locale, soundEnabled, t]);

  // Clean shutdown of camera and provider
  const stopCameraStream = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
      provider.close();
    };
  }, [stopCameraStream, provider]);

  // Request camera and setup stream
  const startCamera = async () => {
    setCameraState('initializing');
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser in this context.');
      }

      // First initialize MediaPipe model
      await provider.initialize({
        wasmPath: '/wasm',
        modelAssetPath: '/models/pose_landmarker_lite.task',
      });

      // Request camera stream
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      activeStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('ready');
      setActiveCue(t('workout.ready_status'));
    } catch (err: any) {
      console.error('Camera startup failure:', err);
      setCameraState('error');
      let msg = t('workout.camera_error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently busy or being used by another application.';
      }
      setErrorMessage(msg);
    }
  };

  // Inference loop
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
          const landmarks = result.landmarks[0];

          // Draw skeleton bones and joints
          drawPoseOverlay(ctx, landmarks, canvas.width, canvas.height);

          // Process frame through deterministic engine
          const frameResult = engine.processFrame(landmarks, now, canvas.width, canvas.height);
          setCurrentAngle(frameResult.currentAngle);
          setCurrentPhase(frameResult.phase);
          setCoveragePercent(frameResult.coveragePercent);
        } else {
          // No landmark found
          engine.processFrame([], now, canvas.width, canvas.height);
          setCurrentAngle(null);
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);
  }, [provider, engine]);

  const handleStartSession = () => {
    setIsStarted(true);
    setIsPaused(false);
    engine?.resume();
    runDetectionLoop();
  };

  const handlePauseSession = () => {
    setIsPaused(true);
    engine?.pause();
    setActiveCue(t('cue.TRACKING_PAUSED'));
  };

  const handleResumeSession = () => {
    setIsPaused(false);
    engine?.resume();
  };

  const handleDiscomfort = () => {
    engine?.reportDiscomfort();
    setIsPaused(true);
    setActiveCue(t('cue.DISCOMFORT_REPORTED'));
  };

  const handleFinish = () => {
    stopCameraStream();
    if (engine) {
      const summary = engine.createSessionSummary();
      onFinishSession(summary);
    }
  };

  const handleFlipCamera = async () => {
    stopCameraStream();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setTimeout(startCamera, 200);
  };

  // Helper to draw skeleton overlay
  const drawPoseOverlay = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    w: number,
    h: number
  ) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#57E5D6'; // Cyan
    ctx.fillStyle = '#B8A2FF';   // Violet

    // Key connections
    const connections: [number, number][] = [
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
      [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
      [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
      [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
      [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
    ];

    for (const [i, j] of connections) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.5 && (p2.visibility ?? 1) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    // Draw active exercise joints with prominent markers
    const activeJoints =
      engine?.getLockedSide() === 'right'
        ? definition.requiredJoints.right
        : definition.requiredJoints.left;

    for (const jointIdx of activeJoints) {
      const pt = landmarks[jointIdx];
      if (pt && (pt.visibility ?? 1) > 0.4) {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#57E5D6';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#101318';
        ctx.stroke();
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner / Active Cue */}
      <div className="manga-panel p-3 flex items-center justify-between bg-[var(--surface-inset)]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--cyan)] border border-[var(--border-color)]"></span>
          <span className="font-extrabold text-sm sm:text-base tracking-wide">
            {activeCue || t('workout.ready_status')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDevView(!showDevView)}
            className="text-xs font-bold px-2 py-1 border border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline">{t('workout.dev_view')}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="manga-panel bracket-frame relative overflow-hidden bg-black aspect-[4/3] max-h-[540px] flex items-center justify-center">
        {/* Unmounted / Idle State */}
        {cameraState === 'idle' && (
          <div className="p-6 text-center max-w-md text-white z-20 flex flex-col items-center gap-4">
            <Camera className="w-12 h-12 text-[var(--cyan)]" />
            <h3 className="font-black text-xl tracking-wider uppercase">
              {t('action.start')} {t(definition.nameKey as any)}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {t(definition.instructionsKey as any)}
            </p>
            <p className="text-xs text-amber-300 font-bold bg-black/60 p-2 border border-amber-400">
              {t(definition.disclaimerKey as any)}
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              <button
                onClick={startCamera}
                className="touch-target px-5 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black uppercase text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_white] hover:translate-x-[-2px] hover:translate-y-[-2px]"
              >
                {t('action.start')} Camera
              </button>
              <button
                onClick={onSwitchToGuided}
                className="touch-target px-4 py-2 bg-transparent text-white font-bold text-sm border-2 border-white hover:bg-white/10"
              >
                {t('action.try_guided')}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {cameraState === 'initializing' && (
          <div className="p-6 text-center text-white z-20 flex flex-col items-center gap-3">
            <RotateCw className="w-8 h-8 text-[var(--cyan)] animate-spin" />
            <div className="font-extrabold text-sm tracking-wide">
              {t('workout.camera_loading')}
            </div>
          </div>
        )}

        {/* Error State */}
        {cameraState === 'error' && (
          <div className="p-6 text-center max-w-md text-white z-20 flex flex-col items-center gap-3">
            <AlertTriangle className="w-10 h-10 text-[var(--crimson)]" />
            <h4 className="font-black text-lg text-[var(--crimson)] uppercase">
              {t('workout.camera_error')}
            </h4>
            <p className="text-sm text-gray-300">{errorMessage}</p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={startCamera}
                className="touch-target px-4 py-2 bg-[var(--paper)] text-[var(--ink)] font-bold text-sm border border-[var(--border-color)]"
              >
                Retry Camera
              </button>
              <button
                onClick={onSwitchToGuided}
                className="touch-target px-4 py-2 bg-[var(--cyan)] text-[var(--ink)] font-black text-sm border border-[var(--border-color)]"
              >
                {t('action.try_guided')}
              </button>
            </div>
          </div>
        )}

        {/* Video Element (Mirrored via transform) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            cameraState === 'ready' ? 'block' : 'hidden'
          }`}
        />

        {/* Canvas Overlay for Pose Skeleton */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-10 ${
            cameraState === 'ready' ? 'block' : 'hidden'
          }`}
        />

        {/* Live In-Camera Heads-Up Display (HUD) */}
        {cameraState === 'ready' && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
            {/* Top HUD bar */}
            <div className="flex justify-between items-start">
              {/* Large Rep Counter */}
              <div className="bg-black/80 border-2 border-[var(--cyan)] text-white px-4 py-2 font-black shadow-[3px_3px_0px_#101318]">
                <div className="text-[11px] text-[var(--cyan)] uppercase tracking-widest font-extrabold">
                  {t('workout.reps')}
                </div>
                <div className="text-4xl sm:text-5xl tabular-nums leading-none">
                  {repsCount}
                </div>
              </div>

              {/* Coverage & Phase Pill */}
              <div className="flex flex-col gap-2 items-end">
                <div className="bg-black/80 border border-white/60 text-white px-3 py-1 text-xs font-bold flex items-center gap-2">
                  <span className="text-gray-400">{t('workout.coverage')}:</span>
                  <span className={coveragePercent >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                    {coveragePercent}%
                  </span>
                </div>
                <div className="bg-[var(--violet-subtle)] bg-black/80 border border-[var(--violet)] text-white px-3 py-1 text-xs font-black uppercase tracking-wider">
                  <span className="text-[var(--violet)]">{currentPhase}</span>
                </div>
              </div>
            </div>

            {/* Bottom HUD: Dev Telemetry if enabled */}
            {showDevView && (
              <div className="bg-black/85 border border-[var(--border-color)] text-white p-2 text-xs font-mono max-w-xs">
                <div>Angle: {currentAngle !== null ? `${currentAngle}°` : 'Unknown'}</div>
                <div>Side: {engine?.getLockedSide() || 'Calibrating...'}</div>
                <div>Flexed Dwell req: 150ms | Min Cycle: 0.8s</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Action Bar */}
      {cameraState === 'ready' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 manga-panel bg-[var(--surface-panel)]">
          <div className="flex items-center gap-2 flex-wrap">
            {!isStarted ? (
              <button
                onClick={handleStartSession}
                className="touch-target px-6 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-sm border-2 border-[var(--border-color)] shadow-[3px_3px_0px_var(--border-color)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {t('action.start')}
              </button>
            ) : isPaused ? (
              <button
                onClick={handleResumeSession}
                className="touch-target px-5 py-2.5 bg-[var(--cyan)] text-[var(--ink)] font-black text-sm border-2 border-[var(--border-color)] flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {t('action.resume')}
              </button>
            ) : (
              <button
                onClick={handlePauseSession}
                className="touch-target px-4 py-2 bg-[var(--paper)] text-[var(--ink)] font-bold text-sm border-2 border-[var(--border-color)] flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                {t('action.pause')}
              </button>
            )}

            {isStarted && (
              <button
                onClick={handleDiscomfort}
                className="touch-target px-3 py-2 bg-amber-100 text-amber-900 border-2 border-amber-600 font-extrabold text-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {t('action.discomfort')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFlipCamera}
              aria-label="Switch camera"
              className="touch-target p-2 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] hover:bg-[var(--paper)]"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleFinish}
              className="touch-target px-5 py-2.5 bg-[var(--crimson)] text-white font-black text-sm border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              {t('action.stop')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
