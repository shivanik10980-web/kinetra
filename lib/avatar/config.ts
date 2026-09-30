/**
 * Central Configuration for Avatar RPG, Muscle Growth Studio, and Lineage Evolution
 * All GP costs, thresholds, multipliers and mutation tiers are declared here.
 */

export const GAME_ECONOMY = {
  GP_PER_XP: 1,
  MAX_DAILY_XP: 40,
  SLOT_XP_REWARD: 30,
  REFLECTION_XP_REWARD: 10,

  // Human stage muscle upgrades: 10 GP per level per region
  MUSCLE_COST_PER_LEVEL_HUMAN: 10,
  MAX_MUSCLE_LEVEL: 10,

  // Evolution unlock threshold: all 6 regions must reach level 4
  EVOLUTION_REQUIRED_REGION_LEVEL: 4,
  // 6 regions * 4 levels * 10 GP = 240 GP
  EVOLUTION_UNLOCK_TOTAL_GP: 240,

  // Post-awakening growth multiplier: 1.5x muscle gain per GP
  POST_AWAKENING_MULTIPLIER: 1.5,
  DEVELOPMENT_UNITS_PER_HUMAN_LEVEL: 1.0,
  DEVELOPMENT_UNITS_PER_AWAKENED_LEVEL: 1.5,

  // Migration version marker
  MIGRATION_MARKER_V1: 'gp_migration_v1',
} as const;

export const MUSCLE_REGIONS = [
  { id: 'chest', labelKey: 'studio.regions.chest', defaultLevel: 0 },
  { id: 'back', labelKey: 'studio.regions.back', defaultLevel: 0 },
  { id: 'arms', labelKey: 'studio.regions.arms', defaultLevel: 0 },
  { id: 'shoulders', labelKey: 'studio.regions.shoulders', defaultLevel: 0 },
  { id: 'core', labelKey: 'studio.regions.core', defaultLevel: 0 },
  { id: 'legs', labelKey: 'studio.regions.legs', defaultLevel: 0 },
] as const;

export type MuscleRegionId = typeof MUSCLE_REGIONS[number]['id'];

export interface LineageMutationMilestone {
  tier: number;
  developmentUnitsRequired: number;
  name: string;
  nameHi: string;
  description: string;
  visualTrait: string;
}

export const WEREWOLF_LINEAGE = {
  id: 'werewolf',
  name: 'Werewolf',
  nameHi: 'वेयरवुल्फ़ (भेड़िया-मानव)',
  archetype: 'Iron Resolve & Primal Shield',
  lore: 'Steadfast protector born of lunar resilience. Unlocks dense musculature, broader posture, and untamed endurance.',
  silhouetteDescription: 'Broad shoulders, powerhouse upper back, heavy-grounded stance.',
  movementStyle: 'Heavy, rooted, deliberate athletic cadence.',
  milestones: [
    {
      tier: 1,
      developmentUnitsRequired: 15,
      name: 'Amber Lunar Gaze',
      nameHi: 'अंबर चंद्र दृष्टि',
      description: 'Luminous predatory eyes reflecting deep night resilience.',
      visualTrait: 'eyes_amber',
    },
    {
      tier: 2,
      developmentUnitsRequired: 30,
      name: 'Shadow Claws & Dense Nails',
      nameHi: 'छाया पंजे और सुदृढ़ नाखून',
      description: 'Hardened grip strength and sharpened black keratin nails.',
      visualTrait: 'claws_shadow',
    },
    {
      tier: 3,
      developmentUnitsRequired: 50,
      name: 'Mantle Fur & Wolf Crest',
      nameHi: 'कंधों का रक्षक रोआं',
      description: 'Dense dark fur gathers across the shoulder blades and nape.',
      visualTrait: 'fur_mantle',
    },
    {
      tier: 4,
      developmentUnitsRequired: 75,
      name: 'Lupine Pointed Ears & Senses',
      nameHi: 'नुकीले भेड़िए के कान',
      description: 'Acute sensory perception with pointed lupine ears.',
      visualTrait: 'ears_lupine',
    },
    {
      tier: 5,
      developmentUnitsRequired: 100,
      name: 'Apex Lycan Silhouette',
      nameHi: 'शीर्ष लायकेन स्वरूप',
      description: 'Complete synthesis of primal wolf jawline and colossal upper-frame armor.',
      visualTrait: 'apex_lycan',
    },
  ] as LineageMutationMilestone[],
} as const;

export const TIGERHUMAN_LINEAGE = {
  id: 'tigerhuman',
  name: 'Tigerhuman',
  nameHi: 'टाइगर-ह्यूमन (बाघ-मानव)',
  archetype: 'Fluid Agility & Silent Kinetic Precision',
  lore: 'Graceful apex predator engineered for explosive leaping, balanced core stability, and surgical agility.',
  silhouetteDescription: 'Athletic feline silhouette with powerful leg springs and sleek core.',
  movementStyle: 'Fluid, spring-loaded, dynamic balance posture.',
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
      description: 'Subtle charcoal tiger stripes radiating across deltoids and spine.',
      visualTrait: 'stripes_feline',
    },
    {
      tier: 3,
      developmentUnitsRequired: 50,
      name: 'Retractable Agile Claws',
      nameHi: 'लचीले फुर्तीले पंजे',
      description: 'Sheathed claws for lightning-quick ground traction and grip.',
      visualTrait: 'claws_retractable',
    },
    {
      tier: 4,
      developmentUnitsRequired: 75,
      name: 'Feline Ears & Kinetic Tail',
      nameHi: 'बाघ के कान और संतुलन पूंछ',
      description: 'Rounded feline ears and a dynamic prehensile balance tail.',
      visualTrait: 'tail_ears_feline',
    },
    {
      tier: 5,
      developmentUnitsRequired: 100,
      name: 'Apex Tigris Stature',
      nameHi: 'शीर्ष व्याघ्र कद-काठी',
      description: 'Sleek feline facial morphology, whisker nodes, and unyielding athletic poise.',
      visualTrait: 'apex_tigris',
    },
  ] as LineageMutationMilestone[],
} as const;
