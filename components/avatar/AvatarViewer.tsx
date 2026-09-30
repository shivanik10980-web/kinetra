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
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Eye,
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
  const [cameraZoomLevel, setCameraZoomLevel] = useState<number>(3.2);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // References for Three.js scene graph
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRootRef = useRef<THREE.Group | null>(null);
  const chestMeshRef = useRef<THREE.Mesh | null>(null);
  const armsMeshLeftRef = useRef<THREE.Mesh | null>(null);
  const armsMeshRightRef = useRef<THREE.Mesh | null>(null);
  const shouldersMeshLeftRef = useRef<THREE.Mesh | null>(null);
  const shouldersMeshRightRef = useRef<THREE.Mesh | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const backMeshRef = useRef<THREE.Mesh | null>(null);
  const legsMeshLeftRef = useRef<THREE.Mesh | null>(null);
  const legsMeshRightRef = useRef<THREE.Mesh | null>(null);
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const hairGroupRef = useRef<THREE.Group | null>(null);
  const earsGroupRef = useRef<THREE.Group | null>(null);
  const tailGroupRef = useRef<THREE.Group | null>(null);
  const eyesGroupRef = useRef<THREE.Group | null>(null);
  const clothingGroupRef = useRef<THREE.Group | null>(null);

  // Interaction tracking
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
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

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.1, cameraZoomLevel);

    // 3. WebGL Renderer
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
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e: any) {
      setWebGLError(`WebGL initialization failed: ${e?.message || 'Unknown error'}`);
      setIsLoading(false);
      return;
    }

    // 4. Lighting Rig (Manga Studio Aesthetic)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6); // Cyan fill
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.4); // Violet rim light
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Floor shadow disc
    const floorGeo = new THREE.CircleGeometry(0.85, 32);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x090d16,
      transparent: true,
      opacity: 0.45,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);

    // 5. Build Humanoid Character Rig
    const characterRoot = new THREE.Group();
    characterRootRef.current = characterRoot;
    scene.add(characterRoot);

    // Materials generator
    const skinColor = new THREE.Color(customization.skinTone);
    const hairColor = new THREE.Color(customization.hairColor);
    const eyeColor = new THREE.Color(customization.eyeColor);
    const outfitColor = new THREE.Color(customization.clothingColor);

    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.6,
      metalness: 0.05,
    });

    const outfitMat = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.7,
      metalness: 0.1,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.5,
    });

    // 5a. Torso & Core
    const coreGeo = new THREE.CylinderGeometry(0.2, 0.17, 0.4, 16);
    const coreMesh = new THREE.Mesh(coreGeo, outfitMat);
    coreMesh.position.y = 0.95;
    characterRoot.add(coreMesh);
    coreMeshRef.current = coreMesh;

    // 5b. Chest & Back
    const chestGeo = new THREE.BoxGeometry(0.44, 0.32, 0.26);
    const chestMesh = new THREE.Mesh(chestGeo, outfitMat);
    chestMesh.position.y = 1.25;
    characterRoot.add(chestMesh);
    chestMeshRef.current = chestMesh;

    // Back muscle wings (Lats)
    const backGeo = new THREE.BoxGeometry(0.48, 0.3, 0.1);
    const backMesh = new THREE.Mesh(backGeo, outfitMat);
    backMesh.position.set(0, 1.25, -0.09);
    characterRoot.add(backMesh);
    backMeshRef.current = backMesh;

    // 5c. Shoulders (Deltoids)
    const shoulderGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const leftShoulder = new THREE.Mesh(shoulderGeo, skinMat);
    leftShoulder.position.set(-0.31, 1.34, 0);
    characterRoot.add(leftShoulder);
    shouldersMeshLeftRef.current = leftShoulder;

    const rightShoulder = new THREE.Mesh(shoulderGeo, skinMat);
    rightShoulder.position.set(0.31, 1.34, 0);
    characterRoot.add(rightShoulder);
    shouldersMeshRightRef.current = rightShoulder;

    // 5d. Arms (Biceps & Forearms)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.52, 16);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.33, 1.02, 0);
    characterRoot.add(leftArm);
    armsMeshLeftRef.current = leftArm;

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.33, 1.02, 0);
    characterRoot.add(rightArm);
    armsMeshRightRef.current = rightArm;

    // Hands
    const handGeo = new THREE.BoxGeometry(0.08, 0.11, 0.05);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.33, 0.7, 0);
    characterRoot.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.33, 0.7, 0);
    characterRoot.add(rightHand);

    // 5e. Legs (Quadriceps & Calves)
    const legGeo = new THREE.CylinderGeometry(0.1, 0.075, 0.75, 16);
    const leftLeg = new THREE.Mesh(legGeo, outfitMat);
    leftLeg.position.set(-0.13, 0.42, 0);
    characterRoot.add(leftLeg);
    legsMeshLeftRef.current = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, outfitMat);
    rightLeg.position.set(0.13, 0.42, 0);
    characterRoot.add(rightLeg);
    legsMeshRightRef.current = rightLeg;

    // Boots / Feet
    const footGeo = new THREE.BoxGeometry(0.11, 0.08, 0.22);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const leftFoot = new THREE.Mesh(footGeo, bootMat);
    leftFoot.position.set(-0.13, 0.04, 0.04);
    characterRoot.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, bootMat);
    rightFoot.position.set(0.13, 0.04, 0.04);
    characterRoot.add(rightFoot);

    // 5f. Head, Face & Hair
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 16);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = 1.45;
    characterRoot.add(neckMesh);

    const headGeo = new THREE.SphereGeometry(0.18, 20, 20);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 1.62;
    characterRoot.add(headMesh);
    headMeshRef.current = headMesh;

    // Eyes
    const eyesGroup = new THREE.Group();
    eyesGroupRef.current = eyesGroup;
    headMesh.add(eyesGroup);

    const eyeGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeColor,
      emissive: progression.evolutionStage === 'awakened' ? eyeColor : new THREE.Color(0x000000),
      emissiveIntensity: progression.evolutionStage === 'awakened' ? 0.6 : 0,
      roughness: 0.2,
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.065, 0.02, 0.15);
    eyesGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.065, 0.02, 0.15);
    eyesGroup.add(rightEye);

    // Hair Group
    const hairGroup = new THREE.Group();
    hairGroupRef.current = hairGroup;
    headMesh.add(hairGroup);

    const hairCapGeo = new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.y = 0.02;
    hairGroup.add(hairCap);

    // Hairstyle Spikes / Flow
    if (customization.hairstyle === 'wild' || customization.hairstyle === 'flowing') {
      for (let i = 0; i < 7; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.06, 0.22, 6);
        const spike = new THREE.Mesh(spikeGeo, hairMat);
        const angle = (i / 7) * Math.PI - Math.PI / 2;
        spike.position.set(Math.sin(angle) * 0.14, 0.12, Math.cos(angle) * 0.1);
        spike.rotation.z = -angle * 0.6;
        spike.rotation.x = -0.2;
        hairGroup.add(spike);
      }
    } else if (customization.hairstyle === 'ponytail') {
      const tailGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.35, 8);
      const ponyTail = new THREE.Mesh(tailGeo, hairMat);
      ponyTail.position.set(0, 0.05, -0.22);
      ponyTail.rotation.x = -0.6;
      hairGroup.add(ponyTail);
    }

    // Lineage Mutation Features (Ears, Claws, Tail)
    const earsGroup = new THREE.Group();
    earsGroupRef.current = earsGroup;
    headMesh.add(earsGroup);

    const tailGroup = new THREE.Group();
    tailGroupRef.current = tailGroup;
    characterRoot.add(tailGroup);
    tailGroup.position.set(0, 0.85, -0.15);

    // Lineage Visual Traits Setup
    if (progression.evolutionStage === 'awakened') {
      if (progression.lineage === 'werewolf') {
        // Pointed Lupine Ears
        const wolfEarGeo = new THREE.ConeGeometry(0.07, 0.22, 6);
        const wolfEarMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.8,
        });
        const leftWolfEar = new THREE.Mesh(wolfEarGeo, wolfEarMat);
        leftWolfEar.position.set(-0.12, 0.18, -0.02);
        leftWolfEar.rotation.z = 0.25;
        leftWolfEar.rotation.x = -0.1;
        earsGroup.add(leftWolfEar);

        const rightWolfEar = new THREE.Mesh(wolfEarGeo, wolfEarMat);
        rightWolfEar.position.set(0.12, 0.18, -0.02);
        rightWolfEar.rotation.z = -0.25;
        rightWolfEar.rotation.x = -0.1;
        earsGroup.add(rightWolfEar);

        // Werewolf Muzzle
        const muzzleGeo = new THREE.ConeGeometry(0.08, 0.16, 8);
        const muzzle = new THREE.Mesh(muzzleGeo, skinMat);
        muzzle.position.set(0, -0.06, 0.18);
        muzzle.rotation.x = Math.PI / 2;
        headMesh.add(muzzle);
      } else if (progression.lineage === 'tigerhuman') {
        // Rounded Feline Ears
        const catEarGeo = new THREE.ConeGeometry(0.08, 0.15, 8);
        const catEarMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.7,
        });
        const leftCatEar = new THREE.Mesh(catEarGeo, catEarMat);
        leftCatEar.position.set(-0.12, 0.16, 0);
        leftCatEar.rotation.z = 0.3;
        earsGroup.add(leftCatEar);

        const rightCatEar = new THREE.Mesh(catEarGeo, catEarMat);
        rightCatEar.position.set(0.12, 0.16, 0);
        rightCatEar.rotation.z = -0.3;
        earsGroup.add(rightCatEar);

        // Agile Balance Tail
        const tailGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.65, 8);
        const tailMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.6,
        });
        const tailMesh = new THREE.Mesh(tailGeo, tailMat);
        tailMesh.position.set(0, -0.2, -0.25);
        tailMesh.rotation.x = -0.9;
        tailGroup.add(tailMesh);
      }
    }

    // Apply Base Proportions & Muscle Morphing
    const applyMorphs = () => {
      if (!characterRootRef.current) return;

      // Base proportions
      const hScale = customization.heightScale || 1.0;
      const sScale = customization.shoulderWidthScale || 1.0;
      characterRoot.scale.set(sScale, hScale, 1.0);

      // Muscle allocation (0 - 10 per region)
      const muscles = progression.muscleAllocation;
      const cLvl = muscles.chest || 0;
      const bLvl = muscles.back || 0;
      const aLvl = muscles.arms || 0;
      const sLvl = muscles.shoulders || 0;
      const coreLvl = muscles.core || 0;
      const lLvl = muscles.legs || 0;

      // Chest morphing (depth & width scale: 1.0 to 1.45)
      if (chestMeshRef.current) {
        chestMeshRef.current.scale.set(1 + cLvl * 0.038, 1 + cLvl * 0.02, 1 + cLvl * 0.045);
      }
      // Back lats morphing (width: 1.0 to 1.5)
      if (backMeshRef.current) {
        backMeshRef.current.scale.set(1 + bLvl * 0.05, 1 + bLvl * 0.025, 1 + bLvl * 0.03);
      }
      // Shoulders deltoids morphing (radial volume: 1.0 to 1.6)
      if (shouldersMeshLeftRef.current && shouldersMeshRightRef.current) {
        const sVolume = 1 + sLvl * 0.055;
        shouldersMeshLeftRef.current.scale.set(sVolume, sVolume, sVolume);
        shouldersMeshRightRef.current.scale.set(sVolume, sVolume, sVolume);
      }
      // Arms biceps & triceps morphing (thickness: 1.0 to 1.5)
      if (armsMeshLeftRef.current && armsMeshRightRef.current) {
        const aThickness = 1 + aLvl * 0.045;
        armsMeshLeftRef.current.scale.set(aThickness, 1.0, aThickness);
        armsMeshRightRef.current.scale.set(aThickness, 1.0, aThickness);
      }
      // Core abdomen morphing (width & definition: 1.0 to 1.35)
      if (coreMeshRef.current) {
        coreMeshRef.current.scale.set(1 + coreLvl * 0.03, 1.0, 1 + coreLvl * 0.028);
      }
      // Legs quadriceps morphing (thickness: 1.0 to 1.5)
      if (legsMeshLeftRef.current && legsMeshRightRef.current) {
        const lThickness = 1 + lLvl * 0.048;
        legsMeshLeftRef.current.scale.set(lThickness, 1.0, lThickness);
        legsMeshRightRef.current.scale.set(lThickness, 1.0, lThickness);
      }
    };

    applyMorphs();
    setIsLoading(false);

    // 6. Animation Loop (Idle Breathing & Natural Sway)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Idle breathing expansion on chest
      if (chestMeshRef.current) {
        const breath = Math.sin(elapsedTime * 2.2) * 0.02;
        chestMeshRef.current.position.y = 1.25 + breath * 0.5;
      }

      // Subtle torso sway
      if (characterRootRef.current) {
        if (autoRotate) {
          characterRootRef.current.rotation.y += 0.008;
        } else {
          characterRootRef.current.rotation.y = rotationAngle;
        }
      }

      // Tail swish animation for Tigerhuman
      if (tailGroupRef.current && progression.lineage === 'tigerhuman') {
        tailGroupRef.current.rotation.y = Math.sin(elapsedTime * 3) * 0.25;
        tailGroupRef.current.rotation.z = Math.cos(elapsedTime * 2) * 0.15;
      }

      camera.position.z = cameraZoomLevel;
      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const newW = container.clientWidth || 400;
      const newH = container.clientHeight || 450;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 8. Cleanup & GPU Resource Disposal
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      // Dispose geometries and materials
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
  }, [customization, progression, cameraZoomLevel, rotationAngle, autoRotate]);

  // Touch and Mouse Orbit Controls Handlers
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
  const zoomOut = () => setCameraZoomLevel((prev) => Math.min(5.0, prev + 0.35));
  const resetView = () => {
    setRotationAngle(0);
    setCameraZoomLevel(3.2);
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
              Rendering Character Model...
            </span>
          </div>
        )}

        {/* WebGL Error / Fallback Card */}
        {webGLError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--surface-panel)] z-20">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <h4 className="font-black text-sm uppercase text-[var(--text-primary)] mb-1">
              3D Rendering Unavailable
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-3">{webGLError}</p>
            <div className="p-3 bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs font-mono text-[var(--cyan-dim)]">
              Lineage: {progression.lineage.toUpperCase()} | Form:{' '}
              {progression.evolutionStage.toUpperCase()}
            </div>
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
