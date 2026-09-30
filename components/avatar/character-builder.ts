import * as THREE from 'three';
import {
  AvatarCustomization,
  AvatarProgression,
  MuscleAllocation,
} from '@/lib/avatar/types';
import {
  WEREWOLF_LINEAGE,
  TIGERHUMAN_LINEAGE,
} from '@/lib/avatar/config';

export interface CharacterRig {
  root: THREE.Group;
  spineGroup: THREE.Group;
  headGroup: THREE.Group;
  neckMesh: THREE.Mesh;
  trapsMesh: THREE.Mesh;
  chestLeft: THREE.Mesh;
  chestRight: THREE.Mesh;
  absMesh: THREE.Mesh;
  latsMesh: THREE.Mesh;
  lowerBackMesh: THREE.Mesh;
  shoulderLeft: THREE.Mesh;
  shoulderRight: THREE.Mesh;
  rearDeltLeft: THREE.Mesh;
  rearDeltRight: THREE.Mesh;
  bicepLeft: THREE.Mesh;
  bicepRight: THREE.Mesh;
  tricepLeft: THREE.Mesh;
  tricepRight: THREE.Mesh;
  forearmLeft: THREE.Mesh;
  forearmRight: THREE.Mesh;
  handLeft: THREE.Group;
  handRight: THREE.Group;
  glutesMesh: THREE.Mesh;
  thighLeft: THREE.Mesh;
  thighRight: THREE.Mesh;
  calfLeft: THREE.Mesh;
  calfRight: THREE.Mesh;
  footLeft: THREE.Group;
  footRight: THREE.Group;
  tailGroup?: THREE.Group;
  tailSegments?: THREE.Mesh[];
  earsGroup: THREE.Group;
  jawMesh: THREE.Mesh;
  clothingGroup: THREE.Group;
  furMantle?: THREE.Group;
}

/**
 * Procedural canvas texture generator for stylized tiger markings
 */
export function createTigerStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm golden amber base with subtle gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.5, '#d97706');
  grad.addColorStop(1, '#b45309');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Cream/white ventral highlights
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.ellipse(256, 400, 180, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark tiger stripes
  ctx.fillStyle = '#18181b';
  for (let i = 0; i < 14; i++) {
    const y = 30 + i * 34;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(120, y + 15, 180, y - 10, 240, y + 5);
    ctx.bezierCurveTo(180, y + 20, 100, y + 10, 0, y + 16);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(512, y + 12);
    ctx.bezierCurveTo(400, y - 5, 340, y + 20, 280, y + 10);
    ctx.bezierCurveTo(340, y + 25, 420, y + 15, 512, y + 28);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Procedural canvas texture generator for werewolf dark fur mantle
 */
export function createWolfFurTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Charcoal/slate wolf coat
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Silvery / dark flecks
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 8 + Math.random() * 16;
    ctx.strokeStyle = Math.random() > 0.4 ? '#334155' : '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, y + len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Builds the complete stylized 3D character rig
 */
export function buildStylizedCharacterRig(
  scene: THREE.Scene,
  customization: AvatarCustomization,
  progression: AvatarProgression
): CharacterRig {
  const isAwakened = progression.evolutionStage === 'awakened';
  const species = isAwakened ? progression.lineage : 'human';

  const root = new THREE.Group();
  scene.add(root);

  // Base species proportions
  let speciesScaleY = 1.0;
  let speciesScaleXZ = 1.0;

  if (species === 'werewolf') {
    // Werewolf: TALL, ELONGATED, SLENDER
    speciesScaleY = 1.15;
    speciesScaleXZ = 0.88;
  } else if (species === 'tigerhuman') {
    // Tigerhuman: STOCKY, WIDE, THICK, BULKY
    speciesScaleY = 0.95;
    speciesScaleXZ = 1.22;
  }

  const userHeightScale = customization.heightScale || 1.0;
  const userWidthScale = customization.shoulderWidthScale || 1.0;

  root.scale.set(
    speciesScaleXZ * userWidthScale,
    speciesScaleY * userHeightScale,
    speciesScaleXZ
  );

  // Spine Group (used for intentional forward hunched creature stance in Werewolf)
  const spineGroup = new THREE.Group();
  root.add(spineGroup);

  if (species === 'werewolf') {
    // Intentional forward creature crouch and hunched spine
    spineGroup.rotation.x = 0.16; // Hunch forward
    spineGroup.position.set(0, 0.04, -0.06);
  } else if (species === 'tigerhuman') {
    // Grounded low athletic center of gravity
    spineGroup.position.set(0, -0.03, 0);
  }

  // Common Materials
  const skinColor = new THREE.Color(customization.skinTone);
  const hairColor = new THREE.Color(customization.hairColor);
  const eyeColor = new THREE.Color(customization.eyeColor);
  const outfitColor = new THREE.Color(customization.clothingColor);

  // Species-tailored skin/coat materials
  let bodyMat: THREE.Material;
  if (species === 'tigerhuman') {
    const tigerTex = createTigerStripeTexture();
    bodyMat = new THREE.MeshStandardMaterial({
      map: tigerTex,
      roughness: 0.65,
      metalness: 0.05,
    });
  } else if (species === 'werewolf') {
    const wolfTex = createWolfFurTexture();
    bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#334155'),
      roughness: 0.8,
      metalness: 0.05,
    });
  } else {
    bodyMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.55,
      metalness: 0.05,
    });
  }

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.45,
  });

  const outfitMat = new THREE.MeshStandardMaterial({
    color: outfitColor,
    roughness: 0.7,
    metalness: 0.1,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1e293b),
    roughness: 0.75,
  });

  const clawMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x09090b),
    roughness: 0.2,
    metalness: 0.6,
  });

  // 1. Torso Center / Abdomen
  // Using Capsule & Cylinder for anatomical transitions
  const absGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.35, 20);
  const absMesh = new THREE.Mesh(absGeo, outfitMat);
  absMesh.position.set(0, 0.96, 0);
  spineGroup.add(absMesh);

  // 2. Chest (Pectorals) - Left and Right Anatomical Split
  const chestLeftGeo = new THREE.BoxGeometry(0.18, 0.26, 0.24);
  const chestLeft = new THREE.Mesh(chestLeftGeo, outfitMat);
  chestLeft.position.set(-0.1, 1.25, 0.02);
  spineGroup.add(chestLeft);

  const chestRightGeo = new THREE.BoxGeometry(0.18, 0.26, 0.24);
  const chestRight = new THREE.Mesh(chestRightGeo, outfitMat);
  chestRight.position.set(0.1, 1.25, 0.02);
  spineGroup.add(chestRight);

  // 3. Back Lats & Lower Back
  const latsGeo = new THREE.BoxGeometry(0.44, 0.28, 0.12);
  const latsMesh = new THREE.Mesh(latsGeo, outfitMat);
  latsMesh.position.set(0, 1.24, -0.09);
  spineGroup.add(latsMesh);

  const lowerBackGeo = new THREE.BoxGeometry(0.36, 0.22, 0.1);
  const lowerBackMesh = new THREE.Mesh(lowerBackGeo, outfitMat);
  lowerBackMesh.position.set(0, 1.02, -0.08);
  spineGroup.add(lowerBackMesh);

  // 4. Trapezius Slope & Neck
  const trapsGeo = new THREE.BoxGeometry(0.36, 0.14, 0.16);
  const trapsMesh = new THREE.Mesh(trapsGeo, bodyMat);
  trapsMesh.position.set(0, 1.38, -0.04);
  spineGroup.add(trapsMesh);

  const neckGeo = new THREE.CylinderGeometry(0.085, 0.1, 0.14, 18);
  const neckMesh = new THREE.Mesh(neckGeo, bodyMat);
  neckMesh.position.set(0, 1.46, species === 'werewolf' ? 0.03 : 0);
  spineGroup.add(neckMesh);

  // 5. Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.62, species === 'werewolf' ? 0.06 : 0);
  spineGroup.add(headGroup);

  // Cranium base
  const craniumGeo = new THREE.SphereGeometry(0.17, 24, 24);
  const craniumMesh = new THREE.Mesh(craniumGeo, bodyMat);
  headGroup.add(craniumMesh);

  // Jaw
  const jawGeo = new THREE.BoxGeometry(0.14, 0.1, 0.15);
  const jawMesh = new THREE.Mesh(jawGeo, bodyMat);
  jawMesh.position.set(0, -0.09, 0.04);
  headGroup.add(jawMesh);

  // Eyes
  const eyeLuminosity = species !== 'human' ? 0.9 : 0;
  const eyeEmissiveColor =
    species === 'werewolf'
      ? new THREE.Color(0xf59e0b) // Luminous amber
      : species === 'tigerhuman'
      ? new THREE.Color(0x10b981) // Luminous jade emerald
      : eyeColor;

  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeEmissiveColor,
    emissive: eyeEmissiveColor,
    emissiveIntensity: eyeLuminosity,
    roughness: 0.15,
  });

  const eyeGeo = new THREE.SphereGeometry(0.032, 16, 16);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.06, 0.02, 0.14);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.06, 0.02, 0.14);
  headGroup.add(rightEye);

  // Ears Group
  const earsGroup = new THREE.Group();
  headGroup.add(earsGroup);

  // Species Facial Anatomy
  if (species === 'werewolf') {
    // Elongated wolf snout / muzzle with dark nose pad
    const snoutGeo = new THREE.ConeGeometry(0.08, 0.22, 10);
    const snoutMesh = new THREE.Mesh(snoutGeo, bodyMat);
    snoutMesh.position.set(0, -0.05, 0.22);
    snoutMesh.rotation.x = Math.PI / 2;
    headGroup.add(snoutMesh);

    // Dark canine nose pad
    const noseGeo = new THREE.SphereGeometry(0.03, 10, 10);
    const noseMesh = new THREE.Mesh(noseGeo, clawMat);
    noseMesh.position.set(0, -0.05, 0.32);
    headGroup.add(noseMesh);

    // Pointed Lupine Ears with dark tips
    const wolfEarGeo = new THREE.ConeGeometry(0.065, 0.24, 8);
    const leftEar = new THREE.Mesh(wolfEarGeo, bodyMat);
    leftEar.position.set(-0.12, 0.19, -0.02);
    leftEar.rotation.z = 0.25;
    leftEar.rotation.x = -0.12;
    earsGroup.add(leftEar);

    const rightEar = new THREE.Mesh(wolfEarGeo, bodyMat);
    rightEar.position.set(0.12, 0.19, -0.02);
    rightEar.rotation.z = -0.25;
    rightEar.rotation.x = -0.12;
    earsGroup.add(rightEar);
  } else if (species === 'tigerhuman') {
    // Short, powerful feline muzzle
    const catMuzzleGeo = new THREE.BoxGeometry(0.12, 0.08, 0.14);
    const catMuzzle = new THREE.Mesh(catMuzzleGeo, bodyMat);
    catMuzzle.position.set(0, -0.06, 0.18);
    headGroup.add(catMuzzle);

    // Rounded Feline Ears with dark rims
    const catEarGeo = new THREE.ConeGeometry(0.075, 0.15, 12);
    const leftEar = new THREE.Mesh(catEarGeo, bodyMat);
    leftEar.position.set(-0.13, 0.17, 0);
    leftEar.rotation.z = 0.35;
    earsGroup.add(leftEar);

    const rightEar = new THREE.Mesh(catEarGeo, bodyMat);
    rightEar.position.set(0.13, 0.17, 0);
    rightEar.rotation.z = -0.35;
    earsGroup.add(rightEar);
  } else {
    // Human stylized nose and ears
    const noseGeo = new THREE.ConeGeometry(0.025, 0.07, 6);
    const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
    noseMesh.position.set(0, -0.01, 0.17);
    noseMesh.rotation.x = Math.PI / 2;
    headGroup.add(noseMesh);

    const humanEarGeo = new THREE.BoxGeometry(0.03, 0.07, 0.04);
    const leftEar = new THREE.Mesh(humanEarGeo, bodyMat);
    leftEar.position.set(-0.17, 0.01, 0);
    earsGroup.add(leftEar);

    const rightEar = new THREE.Mesh(humanEarGeo, bodyMat);
    rightEar.position.set(0.17, 0.01, 0);
    earsGroup.add(rightEar);
  }

  // Hair Cap & Styling
  const hairCapGeo = new THREE.SphereGeometry(0.18, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.y = 0.03;
  headGroup.add(hairCap);

  if (customization.hairstyle === 'wild' || customization.hairstyle === 'flowing') {
    for (let i = 0; i < 9; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.05, 0.22, 6);
      const spike = new THREE.Mesh(spikeGeo, hairMat);
      const angle = (i / 9) * Math.PI - Math.PI / 2;
      spike.position.set(Math.sin(angle) * 0.14, 0.13, Math.cos(angle) * 0.1);
      spike.rotation.z = -angle * 0.55;
      spike.rotation.x = -0.15;
      headGroup.add(spike);
    }
  } else if (customization.hairstyle === 'ponytail') {
    const ponyGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.38, 8);
    const pony = new THREE.Mesh(ponyGeo, hairMat);
    pony.position.set(0, 0.04, -0.22);
    pony.rotation.x = -0.55;
    headGroup.add(pony);
  }

  // 6. Shoulders (Deltoids: Front/Side & Rear)
  const shoulderGeo = new THREE.SphereGeometry(0.11, 18, 18);
  const shoulderLeft = new THREE.Mesh(shoulderGeo, bodyMat);
  shoulderLeft.position.set(-0.3, 1.34, 0);
  spineGroup.add(shoulderLeft);

  const shoulderRight = new THREE.Mesh(shoulderGeo, bodyMat);
  shoulderRight.position.set(0.3, 1.34, 0);
  spineGroup.add(shoulderRight);

  const rearDeltGeo = new THREE.SphereGeometry(0.08, 14, 14);
  const rearDeltLeft = new THREE.Mesh(rearDeltGeo, bodyMat);
  rearDeltLeft.position.set(-0.28, 1.31, -0.06);
  spineGroup.add(rearDeltLeft);

  const rearDeltRight = new THREE.Mesh(rearDeltGeo, bodyMat);
  rearDeltRight.position.set(0.28, 1.31, -0.06);
  spineGroup.add(rearDeltRight);

  // 7. Arms: Biceps & Triceps
  const bicepGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.28, 16);
  const bicepLeft = new THREE.Mesh(bicepGeo, bodyMat);
  bicepLeft.position.set(-0.32, 1.15, 0.02);
  spineGroup.add(bicepLeft);

  const bicepRight = new THREE.Mesh(bicepGeo, bodyMat);
  bicepRight.position.set(0.32, 1.15, 0.02);
  spineGroup.add(bicepRight);

  const tricepGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.26, 16);
  const tricepLeft = new THREE.Mesh(tricepGeo, bodyMat);
  tricepLeft.position.set(-0.32, 1.14, -0.03);
  spineGroup.add(tricepLeft);

  const tricepRight = new THREE.Mesh(tricepGeo, bodyMat);
  tricepRight.position.set(0.32, 1.14, -0.03);
  spineGroup.add(tricepRight);

  // 8. Forearms & Hands
  const forearmGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.28, 16);
  const forearmLeft = new THREE.Mesh(forearmGeo, bodyMat);
  forearmLeft.position.set(-0.33, 0.88, 0.01);
  spineGroup.add(forearmLeft);

  const forearmRight = new THREE.Mesh(forearmGeo, bodyMat);
  forearmRight.position.set(0.33, 0.88, 0.01);
  spineGroup.add(forearmRight);

  // Hands & Claws
  const handLeft = new THREE.Group();
  handLeft.position.set(-0.33, 0.71, 0.01);
  spineGroup.add(handLeft);

  const handRight = new THREE.Group();
  handRight.position.set(0.33, 0.71, 0.01);
  spineGroup.add(handRight);

  const palmGeo = new THREE.BoxGeometry(0.07, 0.09, 0.04);
  const palmMeshL = new THREE.Mesh(palmGeo, bodyMat);
  handLeft.add(palmMeshL);
  const palmMeshR = new THREE.Mesh(palmGeo, bodyMat);
  handRight.add(palmMeshR);

  if (species !== 'human') {
    // Add claws on hands
    for (let c = -1; c <= 1; c++) {
      const clawGeo = new THREE.ConeGeometry(0.015, 0.06, 6);
      const clawL = new THREE.Mesh(clawGeo, clawMat);
      clawL.position.set(c * 0.022, -0.06, 0.01);
      clawL.rotation.x = Math.PI;
      handLeft.add(clawL);

      const clawR = new THREE.Mesh(clawGeo, clawMat);
      clawR.position.set(c * 0.022, -0.06, 0.01);
      clawR.rotation.x = Math.PI;
      handRight.add(clawR);
    }
  }

  // 9. Glutes & Pelvis
  const glutesGeo = new THREE.BoxGeometry(0.36, 0.2, 0.22);
  const glutesMesh = new THREE.Mesh(glutesGeo, outfitMat);
  glutesMesh.position.set(0, 0.76, -0.04);
  spineGroup.add(glutesMesh);

  // 10. Legs (Thighs, Knees, Calves)
  const thighGeo = new THREE.CylinderGeometry(0.095, 0.075, 0.42, 18);
  const thighLeft = new THREE.Mesh(thighGeo, outfitMat);
  thighLeft.position.set(-0.13, 0.54, 0);
  spineGroup.add(thighLeft);

  const thighRight = new THREE.Mesh(thighGeo, outfitMat);
  thighRight.position.set(0.13, 0.54, 0);
  spineGroup.add(thighRight);

  const calfGeo = new THREE.CylinderGeometry(0.08, 0.055, 0.38, 18);
  const calfLeft = new THREE.Mesh(calfGeo, outfitMat);
  calfLeft.position.set(-0.13, 0.21, 0);
  spineGroup.add(calfLeft);

  const calfRight = new THREE.Mesh(calfGeo, outfitMat);
  calfRight.position.set(0.13, 0.21, 0);
  spineGroup.add(calfRight);

  // 11. Feet / Boots / Paws
  const footLeft = new THREE.Group();
  footLeft.position.set(-0.13, 0.04, 0.04);
  spineGroup.add(footLeft);

  const footRight = new THREE.Group();
  footRight.position.set(0.13, 0.04, 0.04);
  spineGroup.add(footRight);

  const footGeo = new THREE.BoxGeometry(0.1, 0.07, 0.22);
  const footLMesh = new THREE.Mesh(footGeo, bootMat);
  footLeft.add(footLMesh);
  const footRMesh = new THREE.Mesh(footGeo, bootMat);
  footRight.add(footRMesh);

  // 12. Tail (for Tigerhuman: articulated 5-bone prehensile tail)
  let tailGroup: THREE.Group | undefined;
  let tailSegments: THREE.Mesh[] = [];

  if (species === 'tigerhuman') {
    tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.74, -0.15);
    spineGroup.add(tailGroup);

    let parentGroup: THREE.Group = tailGroup;
    for (let s = 0; s < 5; s++) {
      const segGroup = new THREE.Group();
      segGroup.position.set(0, -0.09, -0.06);
      parentGroup.add(segGroup);

      const rad = 0.038 - s * 0.005;
      const segGeo = new THREE.CylinderGeometry(rad, rad * 0.9, 0.12, 10);
      const segMesh = new THREE.Mesh(segGeo, bodyMat);
      segMesh.rotation.x = -0.55;
      segGroup.add(segMesh);
      tailSegments.push(segMesh);

      parentGroup = segGroup;
    }
  }

  // 13. Fur Mantle (for Werewolf)
  let furMantle: THREE.Group | undefined;
  if (species === 'werewolf') {
    furMantle = new THREE.Group();
    furMantle.position.set(0, 1.34, -0.1);
    spineGroup.add(furMantle);

    for (let i = 0; i < 7; i++) {
      const tuftGeo = new THREE.ConeGeometry(0.05, 0.18, 6);
      const tuft = new THREE.Mesh(tuftGeo, bodyMat);
      tuft.position.set((i - 3) * 0.055, 0.02, 0.02);
      tuft.rotation.x = -0.6;
      furMantle.add(tuft);
    }
  }

  const clothingGroup = new THREE.Group();
  spineGroup.add(clothingGroup);

  return {
    root,
    spineGroup,
    headGroup,
    neckMesh,
    trapsMesh,
    chestLeft,
    chestRight,
    absMesh,
    latsMesh,
    lowerBackMesh,
    shoulderLeft,
    shoulderRight,
    rearDeltLeft,
    rearDeltRight,
    bicepLeft,
    bicepRight,
    tricepLeft,
    tricepRight,
    forearmLeft,
    forearmRight,
    handLeft,
    handRight,
    glutesMesh,
    thighLeft,
    thighRight,
    calfLeft,
    calfRight,
    footLeft,
    footRight,
    tailGroup,
    tailSegments,
    earsGroup,
    jawMesh,
    clothingGroup,
    furMantle,
  };
}

/**
 * Updates 3D mesh scales and volumes from muscle allocation
 * Seamlessly handles all 10 Human groups and all 15 Fantasy groups.
 */
export function updateMuscleMorphs(
  rig: CharacterRig,
  allocation: MuscleAllocation,
  isAwakened: boolean,
  species: string
): void {
  // Helper to extract muscle level safely
  const getLvl = (id: string, legacyFallback?: string) => {
    if (allocation[id] !== undefined) return allocation[id];
    if (legacyFallback && allocation[legacyFallback] !== undefined) {
      return allocation[legacyFallback];
    }
    return 0;
  };

  // 1. Neck & Traps
  const neckLvl = getLvl('neck');
  const trapsLvl = isAwakened ? getLvl('traps') : getLvl('upper_back', 'back');
  const neckScale = 1 + neckLvl * 0.06;
  rig.neckMesh.scale.set(neckScale, 1.0, neckScale);

  const trapsScale = 1 + trapsLvl * 0.07;
  rig.trapsMesh.scale.set(trapsScale, 1 + trapsLvl * 0.05, trapsScale);

  // 2. Chest (Pectorals)
  const chestLvl = getLvl('chest');
  const chestThickness = 1 + chestLvl * 0.06;
  const chestWidth = 1 + chestLvl * 0.04;
  rig.chestLeft.scale.set(chestWidth, 1.0, chestThickness);
  rig.chestRight.scale.set(chestWidth, 1.0, chestThickness);

  // 3. Back Lats & Lower Back
  const latsLvl = isAwakened ? getLvl('lats') : getLvl('upper_back', 'back');
  const lowerBackLvl = getLvl('lower_back', 'back');
  const latsWidth = 1 + latsLvl * 0.08;
  rig.latsMesh.scale.set(latsWidth, 1.0, 1 + latsLvl * 0.04);

  const lowerBackDepth = 1 + lowerBackLvl * 0.06;
  rig.lowerBackMesh.scale.set(1 + lowerBackLvl * 0.04, 1.0, lowerBackDepth);

  // 4. Abs / Core
  const absLvl = getLvl('abs_core', 'core');
  const absScale = 1 + absLvl * 0.045;
  rig.absMesh.scale.set(absScale, 1.0, absScale);

  // 5. Shoulders (Deltoids: Front/Side & Rear)
  const shoulderLvl = isAwakened
    ? getLvl('front_side_shoulders')
    : getLvl('shoulders');
  const rearDeltLvl = isAwakened
    ? getLvl('rear_delts')
    : getLvl('shoulders');

  const shoulderScale = 1 + shoulderLvl * 0.07;
  rig.shoulderLeft.scale.set(shoulderScale, shoulderScale, shoulderScale);
  rig.shoulderRight.scale.set(shoulderScale, shoulderScale, shoulderScale);

  const rearDeltScale = 1 + rearDeltLvl * 0.08;
  rig.rearDeltLeft.scale.set(rearDeltScale, rearDeltScale, rearDeltScale);
  rig.rearDeltRight.scale.set(rearDeltScale, rearDeltScale, rearDeltScale);

  // 6. Arms: Biceps & Triceps
  const bicepLvl = isAwakened ? getLvl('biceps') : getLvl('upper_arms', 'arms');
  const tricepLvl = isAwakened ? getLvl('triceps') : getLvl('upper_arms', 'arms');

  const bicepScale = 1 + bicepLvl * 0.07;
  rig.bicepLeft.scale.set(bicepScale, 1.0, bicepScale);
  rig.bicepRight.scale.set(bicepScale, 1.0, bicepScale);

  const tricepScale = 1 + tricepLvl * 0.07;
  rig.tricepLeft.scale.set(tricepScale, 1.0, tricepScale);
  rig.tricepRight.scale.set(tricepScale, 1.0, tricepScale);

  // 7. Forearms
  const forearmLvl = getLvl('forearms', 'arms');
  const forearmScale = 1 + forearmLvl * 0.06;
  rig.forearmLeft.scale.set(forearmScale, 1.0, forearmScale);
  rig.forearmRight.scale.set(forearmScale, 1.0, forearmScale);

  // 8. Hips & Glutes
  const gluteLvl = isAwakened ? getLvl('hips_glutes') : getLvl('abs_core', 'core');
  const gluteScale = 1 + gluteLvl * 0.06;
  rig.glutesMesh.scale.set(gluteScale, 1.0, gluteScale);

  // 9. Thighs (Quadriceps)
  const thighLvl = getLvl('thighs', 'legs');
  const thighScale = 1 + thighLvl * 0.065;
  rig.thighLeft.scale.set(thighScale, 1.0, thighScale);
  rig.thighRight.scale.set(thighScale, 1.0, thighScale);

  // 10. Calves
  const calfLvl = getLvl('calves', 'legs');
  const calfScale = 1 + calfLvl * 0.065;
  rig.calfLeft.scale.set(calfScale, 1.0, calfScale);
  rig.calfRight.scale.set(calfScale, 1.0, calfScale);

  // 11. Jaw
  const jawLvl = isAwakened ? getLvl('jaw') : getLvl('neck');
  const jawWidth = 1 + jawLvl * 0.07;
  rig.jawMesh.scale.set(jawWidth, 1 + jawLvl * 0.04, jawWidth);

  // Species-specific morph reinforcements:
  // Werewolf remains tall and leaner, Tigerhuman remains stocky and thick
  if (species === 'werewolf') {
    // Lean sinewy taper on torso
    rig.chestLeft.scale.x *= 0.95;
    rig.chestRight.scale.x *= 0.95;
    rig.absMesh.scale.x *= 0.92;
  } else if (species === 'tigerhuman') {
    // Heavy dense chest depth & leg base
    rig.chestLeft.scale.z *= 1.15;
    rig.chestRight.scale.z *= 1.15;
    rig.thighLeft.scale.x *= 1.15;
    rig.thighRight.scale.x *= 1.15;
  }
}

/**
 * Procedural animation loop driving idle breathing, sway, and species-specific traits
 */
export function animateCharacterRig(
  rig: CharacterRig,
  elapsedTime: number,
  species: string,
  autoRotate: boolean,
  rotationAngle: number,
  reducedMotion = false
): void {
  // Respect reduced motion: disable sway and auto-rotation
  if (reducedMotion) {
    rig.root.rotation.y = rotationAngle;
    return;
  }

  // Base rotation
  if (autoRotate) {
    rig.root.rotation.y += 0.008;
  } else {
    rig.root.rotation.y = rotationAngle;
  }

  // Idle breathing cycle
  const breathFreq = species === 'werewolf' ? 2.8 : 2.0; // Predatory faster breath for wolf
  const breathAmp = 0.015;
  const breathVal = Math.sin(elapsedTime * breathFreq) * breathAmp;

  rig.chestLeft.position.y = 1.25 + breathVal;
  rig.chestRight.position.y = 1.25 + breathVal;

  // Species-specific posture animations
  if (species === 'tigerhuman' && rig.tailSegments && rig.tailSegments.length > 0) {
    // Prehensile fluid tail wave
    rig.tailSegments.forEach((seg, i) => {
      seg.rotation.y = Math.sin(elapsedTime * 2.4 + i * 0.45) * 0.18;
      seg.rotation.z = Math.cos(elapsedTime * 1.8 + i * 0.35) * 0.1;
    });
  } else if (species === 'werewolf') {
    // Predatory subtle spine tension and ear twitch
    const earTwitch = Math.sin(elapsedTime * 4.5) > 0.9 ? 0.08 : 0;
    rig.earsGroup.rotation.z = earTwitch;
  }
}
