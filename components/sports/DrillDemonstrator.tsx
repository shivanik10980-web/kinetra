'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  DrillDemonstrationConfig,
  DrillKeyframePose,
  getDrillDemonstration,
} from '@/lib/sports/demonstration-presets';
import { useTranslation } from '@/lib/i18n/context';
import {
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Camera,
  Layers,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';

interface DrillDemonstratorProps {
  drillId: string;
  className?: string;
}

export const DrillDemonstrator: React.FC<DrillDemonstratorProps> = ({
  drillId,
  className = 'w-full',
}) => {
  const { locale } = useTranslation();
  const config = getDrillDemonstration(drillId);

  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 1.0x or 0.5x
  const [cameraView, setCameraView] = useState<'front' | 'side'>('side');
  const [viewMode, setViewMode] = useState<'3d' | 'static'>('3d');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [progressRatio, setProgressRatio] = useState<number>(0);

  // References for Three.js scene graph
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rootRigRef = useRef<THREE.Group | null>(null);

  // Articulated Humanoid Limb Mesh / Joint References
  const hipGroupRef = useRef<THREE.Group | null>(null);
  const torsoGroupRef = useRef<THREE.Group | null>(null);
  const leftUpperArmRef = useRef<THREE.Group | null>(null);
  const leftForearmRef = useRef<THREE.Group | null>(null);
  const rightUpperArmRef = useRef<THREE.Group | null>(null);
  const rightForearmRef = useRef<THREE.Group | null>(null);
  const leftThighRef = useRef<THREE.Group | null>(null);
  const leftShinRef = useRef<THREE.Group | null>(null);
  const rightThighRef = useRef<THREE.Group | null>(null);
  const rightShinRef = useRef<THREE.Group | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);

  const animTimeRef = useRef<number>(0);

  // WebGL & Three.js Setup
  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLError('WebGL is unavailable. Switched to static movement illustration.');
        setViewMode('static');
        return;
      }
    } catch {
      setWebGLError('Could not create 3D context.');
      setViewMode('static');
      return;
    }

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 360;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const initialView = config.cameraViewPresets[cameraView];
    camera.position.set(...initialView.position);
    camera.lookAt(...initialView.target);
    cameraRef.current = camera;

    // 3. Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e: any) {
      setWebGLError(e?.message || 'Renderer init failed');
      setViewMode('static');
      return;
    }

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6); // Cyan sports fill
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const floorRing = new THREE.GridHelper(3.0, 10, 0x38bdf8, 0x1e293b);
    floorRing.position.y = 0.0;
    scene.add(floorRing);

    // 5. Rigged Demonstrator Humanoid Model
    const rootRig = new THREE.Group();
    rootRigRef.current = rootRig;
    scene.add(rootRig);

    // Materials: Athletic Demonstrator Styling
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 });
    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 }); // Cyan-blue sports uniform
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // 5a. Hips & Pelvis
    const hipGroup = new THREE.Group();
    hipGroup.position.y = 0.95;
    rootRig.add(hipGroup);
    hipGroupRef.current = hipGroup;

    const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.16, 12), uniformMat);
    hipGroup.add(pelvisMesh);

    // 5b. Torso & Chest
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.08;
    hipGroup.add(torsoGroup);
    torsoGroupRef.current = torsoGroup;

    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.22), uniformMat);
    chestMesh.position.y = 0.2;
    torsoGroup.add(chestMesh);

    // Head & Neck
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), skinMat);
    neckMesh.position.y = 0.43;
    torsoGroup.add(neckMesh);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    headMesh.position.y = 0.56;
    torsoGroup.add(headMesh);

    // Athletic Visor / Eyes
    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.08), darkMat);
    visorMesh.position.set(0, 0.57, 0.1);
    torsoGroup.add(visorMesh);

    // 5c. Left Arm Hierarchy (Shoulder -> Upper Arm -> Forearm -> Hand)
    const leftUpperArm = new THREE.Group();
    leftUpperArm.position.set(-0.24, 0.35, 0);
    torsoGroup.add(leftUpperArm);
    leftUpperArmRef.current = leftUpperArm;

    const leftBicep = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 10), skinMat);
    leftBicep.position.y = -0.14;
    leftUpperArm.add(leftBicep);

    const leftForearm = new THREE.Group();
    leftForearm.position.y = -0.28;
    leftUpperArm.add(leftForearm);
    leftForearmRef.current = leftForearm;

    const leftForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.26, 10), skinMat);
    leftForearmMesh.position.y = -0.13;
    leftForearm.add(leftForearmMesh);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), skinMat);
    leftHand.position.y = -0.28;
    leftForearm.add(leftHand);

    // 5d. Right Arm Hierarchy
    const rightUpperArm = new THREE.Group();
    rightUpperArm.position.set(0.24, 0.35, 0);
    torsoGroup.add(rightUpperArm);
    rightUpperArmRef.current = rightUpperArm;

    const rightBicep = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 10), skinMat);
    rightBicep.position.y = -0.14;
    rightUpperArm.add(rightBicep);

    const rightForearm = new THREE.Group();
    rightForearm.position.y = -0.28;
    rightUpperArm.add(rightForearm);
    rightForearmRef.current = rightForearm;

    const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.26, 10), skinMat);
    rightForearmMesh.position.y = -0.13;
    rightForearm.add(rightForearmMesh);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), skinMat);
    rightHand.position.y = -0.28;
    rightForearm.add(rightHand);

    // 5e. Left Leg Hierarchy (Hip -> Thigh -> Shin -> Foot)
    const leftThigh = new THREE.Group();
    leftThigh.position.set(-0.11, -0.08, 0);
    hipGroup.add(leftThigh);
    leftThighRef.current = leftThigh;

    const leftThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.42, 10), uniformMat);
    leftThighMesh.position.y = -0.21;
    leftThigh.add(leftThighMesh);

    const leftShin = new THREE.Group();
    leftShin.position.y = -0.42;
    leftThigh.add(leftShin);
    leftShinRef.current = leftShin;

    const leftShinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.42, 10), skinMat);
    leftShinMesh.position.y = -0.21;
    leftShin.add(leftShinMesh);

    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.18), whiteMat);
    leftFoot.position.set(0, -0.43, 0.04);
    leftShin.add(leftFoot);

    // 5f. Right Leg Hierarchy
    const rightThigh = new THREE.Group();
    rightThigh.position.set(0.11, -0.08, 0);
    hipGroup.add(rightThigh);
    rightThighRef.current = rightThigh;

    const rightThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.42, 10), uniformMat);
    rightThighMesh.position.y = -0.21;
    rightThigh.add(rightThighMesh);

    const rightShin = new THREE.Group();
    rightShin.position.y = -0.42;
    rightThigh.add(rightShin);
    rightShinRef.current = rightShin;

    const rightShinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.42, 10), skinMat);
    rightShinMesh.position.y = -0.21;
    rightShin.add(rightShinMesh);

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.18), whiteMat);
    rightFoot.position.set(0, -0.43, 0.04);
    rightShin.add(rightFoot);

    // 6. Optional Sports Equipment Mesh (Basketball or Football)
    if (config.equipmentType === 'basketball') {
      const bBallGeo = new THREE.SphereGeometry(0.13, 16, 16);
      const bBallMat = new THREE.MeshStandardMaterial({
        color: 0xea580c, // Vibrant Basketball Orange
        roughness: 0.6,
      });
      const bBallMesh = new THREE.Mesh(bBallGeo, bBallMat);
      rootRig.add(bBallMesh);
      ballMeshRef.current = bBallMesh;
    } else if (config.equipmentType === 'football') {
      const fBallGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const fBallMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
      });
      const fBallMesh = new THREE.Mesh(fBallGeo, fBallMat);
      rootRig.add(fBallMesh);
      ballMeshRef.current = fBallMesh;
    }

    // 7. Animation Loop with Linear Keyframe Interpolation (LERP)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isPlaying) {
        const delta = clock.getDelta() * playbackSpeed;
        animTimeRef.current += delta;
      } else {
        clock.getDelta(); // keep clock aligned
      }

      const totalDurationSec = config.cycleDurationMs / 1000;
      const normalizedTime = (animTimeRef.current % totalDurationSec) / totalDurationSec;
      setProgressRatio(normalizedTime);

      // Find current and next keyframe phases
      const phases = config.phases;
      let pIdx = 0;
      for (let i = 0; i < phases.length; i++) {
        if (normalizedTime <= phases[i].durationRatio) {
          pIdx = i;
          break;
        }
      }
      setCurrentPhaseIndex(pIdx);

      const prevPhase = pIdx > 0 ? phases[pIdx - 1] : phases[phases.length - 1];
      const curPhase = phases[pIdx];

      const prevRatio = pIdx > 0 ? prevPhase.durationRatio : 0.0;
      const curRatio = curPhase.durationRatio;
      const phaseSpan = Math.max(0.001, curRatio - prevRatio);
      const phaseT = Math.min(1.0, Math.max(0.0, (normalizedTime - prevRatio) / phaseSpan));

      // LERP helper
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      // Apply FK joint rotations
      if (torsoGroupRef.current) {
        torsoGroupRef.current.rotation.x = lerp(prevPhase.torsoPitch, curPhase.torsoPitch, phaseT);
        torsoGroupRef.current.rotation.y = lerp(prevPhase.torsoYaw, curPhase.torsoYaw, phaseT);
      }
      if (hipGroupRef.current) {
        hipGroupRef.current.position.y = 0.95 + lerp(prevPhase.hipHeight, curPhase.hipHeight, phaseT);
      }

      // Left Arm
      if (leftUpperArmRef.current) {
        leftUpperArmRef.current.rotation.x = lerp(prevPhase.leftArm[0], curPhase.leftArm[0], phaseT);
        leftUpperArmRef.current.rotation.z = lerp(prevPhase.leftArm[1], curPhase.leftArm[1], phaseT);
      }
      if (leftForearmRef.current) {
        leftForearmRef.current.rotation.x = lerp(prevPhase.leftArm[2], curPhase.leftArm[2], phaseT);
      }

      // Right Arm (Shooting Arm)
      if (rightUpperArmRef.current) {
        rightUpperArmRef.current.rotation.x = lerp(prevPhase.rightArm[0], curPhase.rightArm[0], phaseT);
        rightUpperArmRef.current.rotation.z = lerp(prevPhase.rightArm[1], curPhase.rightArm[1], phaseT);
      }
      if (rightForearmRef.current) {
        rightForearmRef.current.rotation.x = lerp(prevPhase.rightArm[2], curPhase.rightArm[2], phaseT);
      }

      // Left Leg
      if (leftThighRef.current) {
        leftThighRef.current.rotation.x = lerp(prevPhase.leftLeg[0], curPhase.leftLeg[0], phaseT);
      }
      if (leftShinRef.current) {
        leftShinRef.current.rotation.x = lerp(prevPhase.leftLeg[1], curPhase.leftLeg[1], phaseT);
      }

      // Right Leg
      if (rightThighRef.current) {
        rightThighRef.current.rotation.x = lerp(prevPhase.rightLeg[0], curPhase.rightLeg[0], phaseT);
      }
      if (rightShinRef.current) {
        rightShinRef.current.rotation.x = lerp(prevPhase.rightLeg[1], curPhase.rightLeg[1], phaseT);
      }

      // Ball Translation
      if (ballMeshRef.current) {
        const pOffset = prevPhase.ballOffset || [0, 0.9, 0.3];
        const cOffset = curPhase.ballOffset || [0, 0.9, 0.3];
        ballMeshRef.current.position.set(
          lerp(pOffset[0], cOffset[0], phaseT),
          lerp(pOffset[1], cOffset[1], phaseT),
          lerp(pOffset[2], cOffset[2], phaseT)
        );
        ballMeshRef.current.visible = curPhase.ballVisible ?? true;
      }

      // Update camera viewpoint smoothly
      const targetPreset = config.cameraViewPresets[cameraView];
      camera.position.lerp(new THREE.Vector3(...targetPreset.position), 0.08);
      camera.lookAt(new THREE.Vector3(...targetPreset.target));

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const newW = container.clientWidth || 400;
      const newH = container.clientHeight || 360;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else if (m.material) m.material.dispose();
        }
      });
      if (rendererRef.current?.domElement?.parentElement) {
        rendererRef.current.domElement.parentElement.removeChild(rendererRef.current.domElement);
      }
    };
  }, [drillId, viewMode, cameraView, isPlaying, playbackSpeed]);

  const activePhase = config.phases[currentPhaseIndex] || config.phases[0];

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* 3D Viewport or Static Illustration Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[var(--surface-inset)] border-2 border-[var(--border-color)] overflow-hidden flex flex-col justify-between">
        {/* Top Badges: Reference Disclosure & View Mode Toggle */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--paper)] text-[var(--ink)] text-[10px] font-black uppercase border border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] pointer-events-auto">
            <Info className="w-3.5 h-3.5 text-[var(--cyan-dim)]" />
            <span>Reference Choreography Demonstration</span>
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === '3d' ? 'static' : '3d')}
              className="px-2 py-1 text-[10px] font-extrabold uppercase border border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] flex items-center gap-1"
            >
              <Layers className="w-3 h-3" />
              <span>{viewMode === '3d' ? 'Static Cards' : '3D Model'}</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: Real-Time 3D Demonstrator */}
        {viewMode === '3d' && (
          <div ref={mountRef} className="w-full h-full relative cursor-pointer" onClick={() => setIsPlaying(!isPlaying)}>
            {/* Phase Timeline Indicator Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
              <div
                className="h-full bg-[var(--cyan)] transition-all duration-75"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* View Mode 2: Static Step-by-Step Cards (Accessible / Fallback Mode) */}
        {viewMode === 'static' && (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 bg-[var(--surface-panel)] space-y-3">
            <div className="text-xs font-black uppercase text-[var(--cyan-dim)]">
              Static Movement Cards ({config.title})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.staticIllustrations.map((card) => (
                <div key={card.step} className="p-3 bg-[var(--surface-inset)] border border-[var(--border-color)]">
                  <div className="font-extrabold text-xs text-[var(--text-primary)] mb-1">
                    {card.title}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mb-2 leading-relaxed">
                    {card.caption}
                  </p>
                  <ul className="text-[10px] text-[var(--text-secondary)] space-y-0.5">
                    {card.keyPoints.map((pt, i) => (
                      <li key={i}>• {pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Active Phase Caption Banner */}
        <div className="bg-[var(--surface-panel)]/95 backdrop-blur-xs p-3 border-t-2 border-[var(--border-color)] z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--cyan-dim)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Phase: {activePhase.phaseName}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold">
              {currentPhaseIndex + 1} / {config.phases.length}
            </span>
          </div>
          <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed">
            {locale === 'hi' ? activePhase.phaseCaptionHi : activePhase.phaseCaption}
          </p>
        </div>
      </div>

      {/* Demonstrator Interactive Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--surface-panel)] border-2 border-[var(--border-color)]">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause reference animation' : 'Play reference animation'}
            className="touch-target px-3 py-1.5 border border-[var(--border-color)] bg-[var(--paper)] text-xs font-black uppercase hover:bg-[var(--cyan)] flex items-center gap-1"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              animTimeRef.current = 0;
              setProgressRatio(0);
            }}
            aria-label="Replay animation from beginning"
            title="Replay from start"
            className="touch-target p-1.5 border border-[var(--border-color)] bg-[var(--surface-inset)] hover:bg-[var(--paper)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setPlaybackSpeed(playbackSpeed === 1.0 ? 0.5 : 1.0)}
            className="touch-target px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--surface-inset)] hover:bg-[var(--paper)] text-xs font-bold flex items-center gap-1"
            title="Toggle playback speed"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{playbackSpeed}x</span>
          </button>
        </div>

        {/* Camera Perspective Angle Switcher */}
        {viewMode === '3d' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] mr-1">
              Angle:
            </span>
            <button
              type="button"
              onClick={() => setCameraView('side')}
              className={`px-2.5 py-1 text-xs font-bold border ${
                cameraView === 'side'
                  ? 'bg-[var(--cyan)] text-[var(--ink)] border-[var(--border-color)]'
                  : 'border-[var(--border-color)] bg-[var(--surface-inset)] text-[var(--text-secondary)]'
              }`}
            >
              Side (45°)
            </button>
            <button
              type="button"
              onClick={() => setCameraView('front')}
              className={`px-2.5 py-1 text-xs font-bold border ${
                cameraView === 'front'
                  ? 'bg-[var(--cyan)] text-[var(--ink)] border-[var(--border-color)]'
                  : 'border-[var(--border-color)] bg-[var(--surface-inset)] text-[var(--text-secondary)]'
              }`}
            >
              Front
            </button>
          </div>
        )}
      </div>

      {/* Standalone Camera Placement Recommendation Card (Separated from Movement Demonstration) */}
      <div className="manga-panel p-3 bg-[var(--surface-inset)] border border-[var(--border-color)] flex items-start gap-3">
        <Camera className="w-5 h-5 text-[var(--cyan-dim)] shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-black uppercase text-[var(--text-primary)]">
            Recommended Device Placement
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            <strong>Angle:</strong> {config.recommendedCameraAngle} • <strong>Distance:</strong>{' '}
            {config.recommendedDistance}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1 italic">
            *Demonstration represents athletic form mechanics only. It does not predict made baskets or guarantee tracking accuracy.
          </div>
        </div>
      </div>
    </div>
  );
};
