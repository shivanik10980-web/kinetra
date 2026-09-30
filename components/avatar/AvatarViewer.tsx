'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AvatarCustomization,
  AvatarProgression,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_AVATAR_PROGRESSION,
} from '@/lib/avatar/types';
import {
  buildStylizedCharacterRig,
  updateMuscleMorphs,
  animateCharacterRig,
  CharacterRig,
} from './character-builder';
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface AvatarViewerProps {
  customization?: AvatarCustomization;
  progression?: AvatarProgression;
  className?: string;
  showControls?: boolean;
  interactive?: boolean;
  autoRotate?: boolean;
}

export const AvatarViewer: React.FC<AvatarViewerProps> = ({
  customization = DEFAULT_AVATAR_CUSTOMIZATION,
  progression = DEFAULT_AVATAR_PROGRESSION,
  className = 'w-full h-96',
  showControls = true,
  interactive = true,
  autoRotate = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cameraZoomLevel, setCameraZoomLevel] = useState<number>(3.3);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // References for Three.js scene graph
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rigRef = useRef<CharacterRig | null>(null);

  // Interaction tracking
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const initViewer = () => {
    const container = mountRef.current;
    if (!container) return;

    setIsLoading(true);
    setWebGLError(null);

    // 1. Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLError('WebGL is unsupported or disabled in this browser context.');
        setIsLoading(false);
        return;
      }
    } catch {
      setWebGLError('Could not initialize 3D canvas.');
      setIsLoading(false);
      return;
    }

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;

    // 2. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 3. Camera setup: Framed appropriately for tall Werewolf and broad Tigerhuman extremes
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.15, cameraZoomLevel);

    // 4. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e: any) {
      setWebGLError(`WebGL initialization failed: ${e?.message || 'Unknown error'}`);
      setIsLoading(false);
      return;
    }

    // 5. Lighting Rig (Manga Studio Aesthetic)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(2.5, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.7); // Cyan fill
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.5); // Violet rim light
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Ground shadow disc
    const floorGeo = new THREE.CircleGeometry(0.95, 32);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x090d16,
      transparent: true,
      opacity: 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);

    // 6. Build Anatomical Character Rig
    const isAwakened = progression.evolutionStage === 'awakened';
    const species = isAwakened ? progression.lineage : 'human';
    const rig = buildStylizedCharacterRig(scene, customization, progression);
    rigRef.current = rig;

    // Apply muscle development morphs
    updateMuscleMorphs(rig, progression.muscleAllocation, isAwakened, species);
    setIsLoading(false);

    // 7. Animation Loop using performance.now() to avoid THREE.Clock deprecation warnings
    let animationFrameId: number;
    let startTime = performance.now();
    let isHidden = false;

    const handleVisibilityChange = () => {
      isHidden = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // Pause rendering when document is hidden (energy & performance optimization)
      if (isHidden) return;

      const elapsedTime = (currentTime - startTime) * 0.001;

      if (rigRef.current) {
        animateCharacterRig(
          rigRef.current,
          elapsedTime,
          species,
          autoRotate,
          rotationAngle,
          reducedMotion
        );
      }

      camera.position.z = cameraZoomLevel;
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const newW = container.clientWidth || 400;
      const newH = container.clientHeight || 450;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 9. Cleanup & GPU Disposal
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });

      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentElement) {
          rendererRef.current.domElement.parentElement.removeChild(
            rendererRef.current.domElement
          );
        }
      }
    };
  };

  useEffect(() => {
    const cleanup = initViewer();
    return () => {
      if (cleanup) cleanup();
    };
  }, [customization, progression, cameraZoomLevel, rotationAngle, autoRotate, reducedMotion]);

  // Touch and Mouse Orbit Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactive || !isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    setRotationAngle((prev) => prev + deltaX * 0.015);
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Accessible Camera Controls
  const rotateLeft = () => setRotationAngle((prev) => prev - Math.PI / 8);
  const rotateRight = () => setRotationAngle((prev) => prev + Math.PI / 8);
  const zoomIn = () => setCameraZoomLevel((prev) => Math.max(1.8, prev - 0.35));
  const zoomOut = () => setCameraZoomLevel((prev) => Math.min(5.2, prev + 0.35));
  const resetView = () => {
    setRotationAngle(0);
    setCameraZoomLevel(3.3);
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Canvas Viewport */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing rounded-lg overflow-hidden bg-radial from-[var(--surface-inset)] to-[var(--surface-panel)] border-2 border-[var(--border-color)] relative"
        aria-label="3D Avatar Viewer. Use mouse drag to rotate, or accessible buttons below."
        role="region"
      >
        {/* Loading Spinner */}
        {isLoading && !webGLError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface-panel)]/80 backdrop-blur-xs z-10">
            <Sparkles className="w-8 h-8 text-[var(--cyan)] animate-spin mb-2" />
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
              Rendering Anatomical Model...
            </span>
          </div>
        )}

        {/* WebGL Error / Fallback Card with Retry */}
        {webGLError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--surface-panel)] z-20">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <h4 className="font-black text-sm uppercase text-[var(--text-primary)] mb-1">
              3D Rendering Unavailable
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-3">{webGLError}</p>
            <div className="p-3 bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs font-mono text-[var(--cyan-dim)] mb-4">
              Lineage: {progression.lineage.toUpperCase()} | Form:{' '}
              {progression.evolutionStage.toUpperCase()}
            </div>
            <button
              type="button"
              onClick={initViewer}
              className="touch-target px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--paper)] text-xs font-black uppercase hover:bg-[var(--cyan)] flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry WebGL</span>
            </button>
          </div>
        )}

        {/* Lineage & Form Badge */}
        <div className="absolute top-3 left-3 pointer-events-none z-10 flex flex-col gap-1">
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border-2 border-[var(--border-color)] bg-[var(--paper)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]">
            {customization.characterName}
          </span>
          <span
            className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border border-[var(--border-color)] ${
              progression.evolutionStage === 'awakened'
                ? progression.lineage === 'werewolf'
                  ? 'bg-purple-900 text-purple-200'
                  : 'bg-amber-900 text-amber-200'
                : 'bg-[var(--surface-panel)] text-[var(--cyan-dim)]'
            }`}
          >
            {progression.evolutionStage === 'awakened'
              ? `⚡ Awakened ${progression.lineage}`
              : 'Human Form'}
          </span>
        </div>
      </div>

      {/* Accessible Camera & View Controls */}
      {showControls && (
        <div
          role="toolbar"
          aria-label="3D Avatar Viewport Controls"
          className="flex items-center justify-center gap-1.5 mt-3 flex-wrap"
        >
          <button
            type="button"
            onClick={rotateLeft}
            aria-label="Rotate Avatar Counter-Clockwise"
            title="Rotate Left"
            className="touch-target p-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--border-color)] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={rotateRight}
            aria-label="Rotate Avatar Clockwise"
            title="Rotate Right"
            className="touch-target p-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--border-color)] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={zoomIn}
            aria-label="Zoom In Avatar"
            title="Zoom In"
            className="touch-target p-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--border-color)] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={zoomOut}
            aria-label="Zoom Out Avatar"
            title="Zoom Out"
            className="touch-target p-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--border-color)] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={resetView}
            aria-label="Reset Camera View"
            title="Reset View"
            className="touch-target px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] text-xs font-black uppercase text-[var(--text-primary)] flex items-center gap-1.5 shadow-[2px_2px_0px_var(--border-color)] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      )}
    </div>
  );
};
