/**
 * Central Configuration for Avatar RPG, Muscle Growth Studio, Lineages, and Titles
 * Implements 10 Human groups, 15 Fantasy groups, exact integer accounting,
 * combination titles, and updated economy rules.
 */

export const GAME_ECONOMY = {
  // Updated Daily Economy Cap Rules
  GP_PER_XP: 1,
  MAX_DAILY_XP: 60,
  MAX_DAILY_GP: 60,

  // Reward Allocations
  DAILY_PARTICIPATION_REWARD: 30, // +30 XP & +30 GP
  REFLECTION_REWARD: 10,          // +10 XP & +10 GP
  PLANNED_PRACTICE_BONUS: 10,     // +10 XP & +10 GP
  MASTERY_BONUS: 5,               // +5 XP & +5 GP
  BOOSTER_CONTRIBUTION_MAX: 5,    // +5 XP & +5 GP maximum contribution
  
  // Legacy backward-compatible keys
  SLOT_XP_REWARD: 30,
  REFLECTION_XP_REWARD: 10,

  // Human Stage Growth Tuning:
  // 5 levels per group, 8 units/level, 1 unit/GP => 8 GP per level.
  HUMAN_MAX_LEVEL: 5,
  HUMAN_UNITS_PER_LEVEL: 8,
  HUMAN_GP_PER_LEVEL: 8,
  HUMAN_UNITS_PER_GP: 1,

  // First Awakening: All 10 groups to Level 3.
  // 10 groups * 3 levels * 8 GP = 240 GP.
  EVOLUTION_REQUIRED_HUMAN_LEVEL: 3,
  EVOLUTION_UNLOCK_TOTAL_GP: 240,

  // Fantasy Stage Growth Tuning:
  // 10 levels per group, 12 units/level, 1.5 units/GP => 8 GP per level.
  FANTASY_MAX_LEVEL: 10,
  FANTASY_UNITS_PER_LEVEL: 12,
  FANTASY_GP_PER_LEVEL: 8,
  FANTASY_UNITS_PER_GP: 1.5, // 3 half-units per GP for integer accounting
  POST_AWAKENING_MULTIPLIER: 1.5,

  // Legacy key for backwards compatibility
  MAX_MUSCLE_LEVEL: 10,
  MUSCLE_COST_PER_LEVEL_HUMAN: 8,
  EVOLUTION_REQUIRED_REGION_LEVEL: 3,

  // Migration Markers
  MIGRATION_MARKER_V1: 'gp_migration_v1',
  MIGRATION_MARKER_V2: 'gp_migration_v2_ten_groups',
} as const;

export const HUMAN_MUSCLE_REGIONS = [
  { id: 'neck', labelKey: 'studio.regions.neck', defaultLevel: 0 },
  { id: 'upper_back', labelKey: 'studio.regions.upper_back', defaultLevel: 0 },
  { id: 'lower_back', labelKey: 'studio.regions.lower_back', defaultLevel: 0 },
  { id: 'forearms', labelKey: 'studio.regions.forearms', defaultLevel: 0 },
  { id: 'shoulders', labelKey: 'studio.regions.shoulders', defaultLevel: 0 },
  { id: 'upper_arms', labelKey: 'studio.regions.upper_arms', defaultLevel: 0 },
  { id: 'chest', labelKey: 'studio.regions.chest', defaultLevel: 0 },
  { id: 'abs_core', labelKey: 'studio.regions.abs_core', defaultLevel: 0 },
  { id: 'thighs', labelKey: 'studio.regions.thighs', defaultLevel: 0 },
  { id: 'calves', labelKey: 'studio.regions.calves', defaultLevel: 0 },
] as const;

export const FANTASY_MUSCLE_REGIONS = [
  { id: 'neck', labelKey: 'studio.regions.neck', defaultLevel: 0 },
  { id: 'lats', labelKey: 'studio.regions.lats', defaultLevel: 0 },
  { id: 'traps', labelKey: 'studio.regions.traps', defaultLevel: 0 },
  { id: 'lower_back', labelKey: 'studio.regions.lower_back', defaultLevel: 0 },
  { id: 'forearms', labelKey: 'studio.regions.forearms', defaultLevel: 0 },
  { id: 'front_side_shoulders', labelKey: 'studio.regions.front_side_shoulders', defaultLevel: 0 },
  { id: 'rear_delts', labelKey: 'studio.regions.rear_delts', defaultLevel: 0 },
  { id: 'biceps', labelKey: 'studio.regions.biceps', defaultLevel: 0 },
  { id: 'triceps', labelKey: 'studio.regions.triceps', defaultLevel: 0 },
  { id: 'chest', labelKey: 'studio.regions.chest', defaultLevel: 0 },
  { id: 'abs_core', labelKey: 'studio.regions.abs_core', defaultLevel: 0 },
  { id: 'thighs', labelKey: 'studio.regions.thighs', defaultLevel: 0 },
  { id: 'hips_glutes', labelKey: 'studio.regions.hips_glutes', defaultLevel: 0 },
  { id: 'calves', labelKey: 'studio.regions.calves', defaultLevel: 0 },
  { id: 'jaw', labelKey: 'studio.regions.jaw', defaultLevel: 0 },
] as const;

// Default alias
export const MUSCLE_REGIONS = HUMAN_MUSCLE_REGIONS;

export type HumanMuscleRegionId = typeof HUMAN_MUSCLE_REGIONS[number]['id'];
export type FantasyMuscleRegionId = typeof FANTASY_MUSCLE_REGIONS[number]['id'];
export type MuscleRegionId = HumanMuscleRegionId | FantasyMuscleRegionId | 'chest' | 'back' | 'arms' | 'shoulders' | 'core' | 'legs';

export interface LineageMutationMilestone {
  tier: number;
  developmentUnitsRequired: number;
  name: string;
  nameHi: string;
  description: string;
  visualTrait: string;
}

/**
 * WEREWOLF LINEAGE
 * Requirement: Tall, elongated, slender and sinewy. Long limbs, intentional forward-hunched creature stance.
 * Recognizable wolf anatomy, muzzle, ears, claws and fur. Remains taller and leaner than Tigerhuman even at maximum development.
 */
export const WEREWOLF_LINEAGE = {
  id: 'werewolf',
  name: 'Werewolf',
  nameHi: 'वेयरवुल्फ़ (भेड़िया-मानव)',
  archetype: 'Lunar Predator & Sinewy Endurance',
  lore: 'Elongated, sinewy apex predator built for relentless pacing, high stamina, and lupine senses. Features an arched feral posture, razor claws, and lunar fur mantle.',
  silhouetteDescription: 'Tall, elongated, slender and sinewy frame with long limbs, an intentional forward-hunched creature stance, and lupine anatomy. Remains visibly taller and leaner than Tigerhuman even at maximum development.',
  movementStyle: 'Forward-stalking predatory cadence with elongated strides and sinewy poise.',
  heightMultiplier: 1.15,
  widthMultiplier: 0.85,
  isHunched: true,
  milestones: [
    {
      tier: 1,
      developmentUnitsRequired: 15,
      name: 'Amber Lunar Gaze',
      nameHi: 'अंबर चंद्र दृष्टि',
      description: 'Luminous predatory amber eyes reflecting deep night resilience.',
      visualTrait: 'eyes_amber',
    },
    {
      tier: 2,
      developmentUnitsRequired: 30,
      name: 'Sinewy Wolf Claws & Tendons',
      nameHi: 'लंबे पंजे और लचीले स्नायु',
      description: 'Elongated dark keratin claws and taut forearm tendon definition.',
      visualTrait: 'claws_shadow',
    },
    {
      tier: 3,
      developmentUnitsRequired: 50,
      name: 'Lupine Spine Mantle & Fur',
      nameHi: 'कंधों और रीढ़ का रक्षक रोआं',
      description: 'Dense dark fur gathers across the shoulder blades, nape, and spine.',
      visualTrait: 'fur_mantle',
    },
    {
      tier: 4,
      developmentUnitsRequired: 75,
      name: 'Pointed Lupine Ears & Muzzle Ridge',
      nameHi: 'नुकीले भेड़िए के कान और थूथन',
      description: 'Acute pointed wolf ears and pronounced predatory lupine snout.',
      visualTrait: 'ears_lupine',
    },
    {
      tier: 5,
      developmentUnitsRequired: 100,
      name: 'Apex Lycan Silhouette',
      nameHi: 'शीर्ष लायकेन स्वरूप',
      description: 'Complete synthesis of tall sinewy creature stance, razor claws, and predatory wolf morphology.',
      visualTrait: 'apex_lycan',
    },
  ] as LineageMutationMilestone[],
} as const;

/**
 * TIGERHUMAN LINEAGE
 * Requirement: Stocky, wide, thick and bulky. Dense torso, substantial limbs and grounded posture.
 * Recognizable feline face, tiger markings, ears and tail. Remains visibly different from Werewolf at every stage.
 */
export const TIGERHUMAN_LINEAGE = {
  id: 'tigerhuman',
  name: 'Tigerhuman',
  nameHi: 'टाइगर-ह्यूमन (बाघ-मानव)',
  archetype: 'Rooted Colossus & Kinetic Power',
  lore: 'Dense, stocky powerhouse with colossal torso mass, heavy limbs, and grounded posture. Engineered for explosive torque, grounded strikes, and prehensile tail balance.',
  silhouetteDescription: 'Stocky, wide, thick and bulky frame with a dense torso, substantial limbs, and low grounded posture. Distinct feline face, tiger markings, and dynamic tail. Remains visibly broader, thicker, and heavier than Werewolf at every stage.',
  movementStyle: 'Grounded, spring-loaded kinetic poise with rooted stability.',
  heightMultiplier: 0.95,
  widthMultiplier: 1.25,
  isHunched: false,
  milestones: [
    {
      tier: 1,
      developmentUnitsRequired: 15,
      name: 'Jade Feline Slit Pupils',
      nameHi: 'पन्ना जैसी बिल्ली की आँखें',
      description: 'Hyper-focused vertical slit eyes glowing emerald in shadow.',
      visualTrait: 'eyes_emerald',
    },
    {
      tier: 2,
      developmentUnitsRequired: 30,
      name: 'Primal Kinetic Tiger Stripes',
      nameHi: 'आदिम गतिशील धारियाँ',
      description: 'Distinct charcoal tiger stripes wrapping across deltoids, back, and thighs.',
      visualTrait: 'stripes_feline',
    },
    {
      tier: 3,
      developmentUnitsRequired: 50,
      name: 'Dense Padded Claws & Forearms',
      nameHi: 'भारी पंजे और चौड़ी भुजाएँ',
      description: 'Massive feline wrist density and heavy retractable claws.',
      visualTrait: 'claws_retractable',
    },
    {
      tier: 4,
      developmentUnitsRequired: 75,
      name: 'Rounded Feline Ears & Dynamic Tail',
      nameHi: 'बाघ के कान और संतुलन पूंछ',
      description: 'Rounded feline ears and a thick articulated balance tail.',
      visualTrait: 'tail_ears_feline',
    },
    {
      tier: 5,
      developmentUnitsRequired: 100,
      name: 'Apex Tigris Stature',
      nameHi: 'शीर्ष व्याघ्र कद-काठी',
      description: 'Colossal broad feline jawline, whisker pads, deep chest depth, and grounded stance.',
      visualTrait: 'apex_tigris',
    },
  ] as LineageMutationMilestone[],
} as const;

/**
 * FUTURE LINEAGES (Hawk & Bullman)
 * Prepared for subsequent milestones. Both accessible from either mature initial lineage.
 * Explicitly labeled as development placeholders so users know they are upcoming.
 */
export const HAWK_LINEAGE = {
  id: 'hawk',
  name: 'Hawk',
  nameHi: 'हॉक (बाज़-मानव)',
  archetype: 'Aerial Precision & Razor Vision',
  lore: 'Ascendant raptor form balancing feather-light frame with blinding kinetic reflexes and razor talon grasp.',
  silhouetteDescription: 'Sleek, aerodynamic frame with feather-tipped crests and avian raptor features.',
  isPlayable: false,
  status: 'Upcoming Advanced Lineage (In Development)',
} as const;

export const BULLMAN_LINEAGE = {
  id: 'bullman',
  name: 'Bullman',
  nameHi: 'बुलमैन (वृषभ-मानव)',
  archetype: 'Monolithic Juggernaut',
  lore: 'Unyielding bovine juggernaut with titan neck thickness, armored horned skull, and unstoppable momentum.',
  silhouetteDescription: 'Colossal monolithic silhouette with towering shoulder bulk and horns.',
  isPlayable: false,
  status: 'Upcoming Advanced Lineage (In Development)',
} as const;

/**
 * COMBINATION TITLES
 * Permanent achievements unlocked when specific muscle groups meet development criteria.
 * Once earned, titles remain permanently in the user's collection even if build changes.
 */
export interface CombinationTitle {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  requiredGroups: string[];
  requiredLevel: number;
}

export const COMBINATION_TITLES: CombinationTitle[] = [
  {
    id: 'hunk',
    name: 'Hunk',
    nameHi: 'हंक',
    description: 'Arm development mastery across biceps, triceps, and forearms.',
    requiredGroups: ['biceps', 'triceps', 'forearms'],
    requiredLevel: 4,
  },
  {
    id: 'athlete',
    name: 'Athlete',
    nameHi: 'एथलीट',
    description: 'Dynamic athletic synergy: front/side shoulders, core, thighs, and calves.',
    requiredGroups: ['front_side_shoulders', 'abs_core', 'thighs', 'calves'],
    requiredLevel: 4,
  },
  {
    id: 'powerlifter',
    name: 'Powerlifter',
    nameHi: 'पावरलिफ्टर',
    description: 'Posterior chain powerhouse: chest, lower back, hips/glutes, and thighs.',
    requiredGroups: ['chest', 'lower_back', 'hips_glutes', 'thighs'],
    requiredLevel: 4,
  },
  {
    id: 'the_tree',
    name: 'The Tree',
    nameHi: 'द ट्री (अविचल)',
    description: 'Rooted lower-body foundation: hips/glutes, thighs, calves, core, and lower back.',
    requiredGroups: ['hips_glutes', 'thighs', 'calves', 'abs_core', 'lower_back'],
    requiredLevel: 4,
  },
  {
    id: 'the_shredder',
    name: 'The Shredder',
    nameHi: 'द श्रेडर',
    description: 'V-taper razor definition: lats, rear delts, biceps, triceps, and core.',
    requiredGroups: ['lats', 'rear_delts', 'biceps', 'triceps', 'abs_core'],
    requiredLevel: 4,
  },
  {
    id: 'the_bolt',
    name: 'The Bolt',
    nameHi: 'द बोल्ट',
    description: 'Explosive sprint engine: hips/glutes, thighs, and calves.',
    requiredGroups: ['hips_glutes', 'thighs', 'calves'],
    requiredLevel: 5,
  },
  {
    id: 'ironjaw',
    name: 'Ironjaw',
    nameHi: 'आयरनजॉ',
    description: 'Primal armor: jaw, neck, and traps.',
    requiredGroups: ['jaw', 'neck', 'traps'],
    requiredLevel: 4,
  },
  {
    id: 'the_titan',
    name: 'The Titan',
    nameHi: 'द टाइटन',
    description: 'Complete synthesis across all fantasy muscle groups.',
    requiredGroups: [
      'neck', 'lats', 'traps', 'lower_back', 'forearms', 'front_side_shoulders',
      'rear_delts', 'biceps', 'triceps', 'chest', 'abs_core', 'thighs',
      'hips_glutes', 'calves', 'jaw'
    ],
    requiredLevel: 5,
  },
];

/**
 * GAMEPLAY BOOSTERS (Non-stacking, non-purchasable with real currency)
 */
export interface BoosterItem {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  effectType: 'focus' | 'insight' | 'style';
  maxDailyContribution: number;
}

export const GAME_BOOSTERS: Record<string, BoosterItem> = {
  focus_token: {
    id: 'focus_token',
    name: 'Focus Token',
    nameHi: 'फ़ोकस टोकन',
    description: 'Adds +5 points to an eligible mastery reward, strictly within the 60 daily cap. Consumed only upon save.',
    effectType: 'focus',
    maxDailyContribution: 5,
  },
  training_insight: {
    id: 'training_insight',
    name: 'Training Insight',
    nameHi: 'प्रशिक्षण अंतर्दृष्टि',
    description: 'Unlocks deeper analytical feedback note and biomechanical commentary.',
    effectType: 'insight',
    maxDailyContribution: 0,
  },
  style_boost: {
    id: 'style_boost',
    name: 'Style Boost',
    nameHi: 'स्टाइल बूस्ट',
    description: 'Applies an energized kinetic aura highlight to the 3D character viewport.',
    effectType: 'style',
    maxDailyContribution: 0,
  },
};
