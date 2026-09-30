/**
 * Structured Exercise Catalogue & Daily Practice Plan
 * Includes instructions, supported modes, equipment, substitutions,
 * tracking limitations, and mastery milestones.
 */

export interface ExerciseMasteryMilestone {
  tier: number;
  name: string;
  nameHi: string;
  requirement: string;
  bonusXp: number; // +5 XP / GP
}

export interface ExerciseCatalogueItem {
  id: string;
  name: string;
  nameHi: string;
  category: 'lower_body' | 'upper_body' | 'mobility' | 'core' | 'recovery';
  targetMuscles: string[];
  instructions: string[];
  supportedModes: ('live_camera' | 'guided_timer' | 'manual_input')[];
  equipment: string[];
  substitutions: string[];
  trackingLimitations: string[];
  masteryMilestones: ExerciseMasteryMilestone[];
  disclaimer: string;
}

export const STRUCTURED_EXERCISE_CATALOGUE: ExerciseCatalogueItem[] = [
  {
    id: 'squat',
    name: 'Mindful Bodyweight Squat',
    nameHi: 'माइंडफुल बॉडीवेट स्क्वैट',
    category: 'lower_body',
    targetMuscles: ['thighs', 'calves', 'abs_core', 'lower_back', 'hips_glutes'],
    instructions: [
      'Stand with feet shoulder-width apart, toes turned slightly outwards (5-15 degrees).',
      'Inhale calmly, sending hips back and bending knees to your natural comfortable depth.',
      'Maintain an upright chest and open collarbones without rounding your lower back.',
      'Dwell briefly at comfortable flexion (150-300ms) with calm, steady breathing.',
      'Press evenly through midfoot and heels to rise smoothly back to full extension.',
      'Pause at the peak and take a complete breath before initiating the next cycle.',
    ],
    supportedModes: ['live_camera', 'guided_timer', 'manual_input'],
    equipment: ['Bodyweight', 'Optional chair for balance / box squat target'],
    substitutions: [
      'Seated Chair Squat / Sit-to-Stand: For knee sensitivity, sit fully onto a firm chair and stand back up.',
      'Supported Wall Squat: Rest hands on a counter or wall to assist balance during descent.',
    ],
    trackingLimitations: [
      'Camera must clearly frame hips, knees, and ankles simultaneously.',
      'Dark clothing against dark backgrounds may reduce joint contrast.',
      'Side or 45-degree angle provides optimal knee angle estimation.',
    ],
    masteryMilestones: [
      { tier: 1, name: 'Depth Awareness', nameHi: 'गहराई बोध', requirement: 'Complete 3 clean repetitions with consistent depth.', bonusXp: 5 },
      { tier: 2, name: 'Controlled Tempo', nameHi: 'नियंत्रित गति', requirement: 'Maintain a 2.0s - 4.5s cadence across 5 consecutive reps.', bonusXp: 5 },
      { tier: 3, name: 'Kinetic Consistency', nameHi: 'गतिशील स्थिरता', requirement: 'Achieve 85%+ camera coverage and consistent turnaround across a full set.', bonusXp: 5 },
    ],
    disclaimer: 'Discontinue if knee or lower back discomfort occurs. Never force depth past natural mobility.',
  },
  {
    id: 'elbow_flexion',
    name: 'Controlled Arm Flexion',
    nameHi: 'नियंत्रित आर्म कर्ल',
    category: 'upper_body',
    targetMuscles: ['upper_arms', 'biceps', 'forearms'],
    instructions: [
      'Stand or sit comfortably with spine tall, shoulders relaxed and neutral.',
      'Hold arms along your sides, palms facing forward or neutral inward.',
      'Keeping upper arm stationary beside ribcage, smoothly bend elbow to draw hand upward.',
      'Pause at peak comfortable flexion (1-2 seconds) without swinging the shoulder forward.',
      'Lower under controlled rhythm back to full comfortable extension.',
      'Avoid hyperextending elbows at the bottom; maintain soft joint alignment.',
    ],
    supportedModes: ['live_camera', 'guided_timer', 'manual_input'],
    equipment: ['Bodyweight (isometric tension) or light water bottles / bands'],
    substitutions: [
      'Supported Table Rest: Rest elbow on a desk surface to eliminate shoulder stabilization fatigue.',
      'Unilateral (Single Arm): Practice one side at a time if bilateral coordination is fatigued.',
    ],
    trackingLimitations: [
      'Shoulder, elbow, and wrist joints must remain unoccluded by torso or loose clothing.',
      'Torso rotation away from the camera can introduce parallax perspective error.',
    ],
    masteryMilestones: [
      { tier: 1, name: 'Strict Isolation', nameHi: 'शुद्ध पृथक्करण', requirement: 'Maintain steady shoulder position through 5 reps.', bonusXp: 5 },
      { tier: 2, name: 'Tension Control', nameHi: 'तनाव नियंत्रण', requirement: 'Smooth 3-second descent without abrupt drop.', bonusXp: 5 },
    ],
    disclaimer: 'Keep wrists straight and neutral. Do not grip aggressively or hyperextend joints.',
  },
  {
    id: 'seated_guided',
    name: 'Seated Spine & Shoulder Mobility',
    nameHi: 'बैठकर रीढ़ और कंधे की गतिशीलता',
    category: 'mobility',
    targetMuscles: ['neck', 'upper_back', 'shoulders', 'abs_core'],
    instructions: [
      'Sit comfortably on a stable chair with feet flat on the floor and knees hip-width apart.',
      'Rest hands on knees, inhale slowly through your nose, expanding your ribcage.',
      'Roll shoulders gently backward in 5 slow circles, releasing upper trapezius tension.',
      'Slowly turn your gaze toward the left shoulder, pause 2 seconds, then return to center.',
      'Repeat gentle turn toward right shoulder within your comfortable natural range.',
      'Place right hand across chest to left shoulder, take 3 mindful breaths, then switch.',
    ],
    supportedModes: ['guided_timer', 'manual_input'],
    equipment: ['Sturdy chair or seated cushion'],
    substitutions: [
      'Floor Seated: Can be performed sitting cross-legged on a mat or against a backrest.',
      'Bed Rested: Suitable for low-energy recovery days in a semi-reclined posture.',
    ],
    trackingLimitations: [
      'Guided mode relies on mindful self-timer pacing. Optical pose engine is disabled.',
    ],
    masteryMilestones: [
      { tier: 1, name: 'Mindful Pacing', nameHi: 'सचेत गति', requirement: 'Complete a full 3-minute guided sequence without rushing.', bonusXp: 5 },
      { tier: 2, name: 'Somatic Recovery', nameHi: 'शारीरिक पुनर्प्राप्ति', requirement: 'Record 3 recovery check-ins across distinct practice days.', bonusXp: 5 },
    ],
    disclaimer: 'Never force neck rotations. Move only within completely painless range.',
  },
  {
    id: 'wall_pushup',
    name: 'Wall-Supported Kinetic Press',
    nameHi: 'दीवार-समर्थित किनेटिक प्रेस',
    category: 'upper_body',
    targetMuscles: ['chest', 'front_side_shoulders', 'shoulders', 'triceps', 'abs_core'],
    instructions: [
      'Stand facing a sturdy wall about an arm’s length away.',
      'Place palms flat on the wall at shoulder height and shoulder-width apart.',
      'Brace your core and glutes so your body forms a straight line from heels to head.',
      'Inhale, slowly bending elbows to lower your chest toward the wall in 2-3 seconds.',
      'Pause briefly with forearms and chest under control, elbows tucked at ~45 degrees.',
      'Exhale and push firmly through your palms to return smoothly to the start.',
    ],
    supportedModes: ['guided_timer', 'manual_input'],
    equipment: ['Sturdy wall or stable counter edge'],
    substitutions: [
      'Countertop Press: Step slightly further back with hands on a stable counter for higher resistance.',
      'Doorframe Press: Narrow grip for targeted triceps emphasis.',
    ],
    trackingLimitations: [
      'Wall proximity can cause occlusion in front-facing cameras; guided timer recommended.',
    ],
    masteryMilestones: [
      { tier: 1, name: 'Plank Alignment', nameHi: 'सीधी रेखा संरेखण', requirement: 'Maintain rigid core without hip sag for 6 reps.', bonusXp: 5 },
      { tier: 2, name: 'Steady Resistance', nameHi: 'स्थिर प्रतिरोध', requirement: 'Execute 10 smooth, unhurried repetitions with full breath cycles.', bonusXp: 5 },
    ],
    disclaimer: 'Ensure hands do not slip. Keep palms flat and wrists comfortable.',
  },
  {
    id: 'standing_calf_balance',
    name: 'Standing Calf Raise & Ankle Stability',
    nameHi: 'खड़े होकर काफ़ रेज़ और टखने की स्थिरता',
    category: 'lower_body',
    targetMuscles: ['calves', 'thighs', 'hips_glutes'],
    instructions: [
      'Stand barefoot or in supportive flat shoes with feet hip-width apart.',
      'Lightly touch a wall or chair back for fingertip balance if needed.',
      'Press through the balls of both feet and big toes, lifting heels smoothly off the floor.',
      'Hold at peak plantarflexion for 1-2 seconds with active calves and engaged core.',
      'Lower slowly under control (2-3 seconds) until heels softly kiss the floor.',
      'Keep ankles aligned without rolling out onto the pinky edges of the feet.',
    ],
    supportedModes: ['guided_timer', 'manual_input'],
    equipment: ['Flat floor, optional wall or chair for fingertip balance'],
    substitutions: [
      'Seated Calf Raise: Sit with knees at 90 degrees and lift heels against bodyweight.',
      'Single-Leg Stance: Practice unilateral balance hold before raising heels.',
    ],
    trackingLimitations: [
      'Requires low-angle framing to detect subtle heel elevation accurately.',
    ],
    masteryMilestones: [
      { tier: 1, name: 'Ankle Stability', nameHi: 'टखने का संतुलन', requirement: '10 smooth raises without ankle wobble.', bonusXp: 5 },
      { tier: 2, name: 'Eccentric Control', nameHi: 'धीमा अवतरण', requirement: 'Sustained 3-second descent across 8 reps.', bonusXp: 5 },
    ],
    disclaimer: 'If Achilles or arch tightness occurs, stretch gently and pause.',
  },
];

/**
 * DAILY MOVEMENT PLAN
 * Structured 1-4 block daily session template.
 * Completing blocks awards the Planned Practice bonus (+10 XP & +10 GP).
 */
export interface DailyPlanBlock {
  blockNumber: 1 | 2 | 3 | 4;
  title: string;
  titleHi: string;
  exerciseId: string;
  recommendedDurationSec: number;
  blockType: 'activation' | 'focus' | 'secondary' | 'recovery';
}

export const DEFAULT_DAILY_PLAN: DailyPlanBlock[] = [
  {
    blockNumber: 1,
    title: 'Block 1: Posture Activation',
    titleHi: 'खंड 1: मुद्रा सक्रियण',
    exerciseId: 'seated_guided',
    recommendedDurationSec: 180,
    blockType: 'activation',
  },
  {
    blockNumber: 2,
    title: 'Block 2: Primary Focus Drill',
    titleHi: 'खंड 2: मुख्य अभ्यास ड्रिल',
    exerciseId: 'squat',
    recommendedDurationSec: 300,
    blockType: 'focus',
  },
  {
    blockNumber: 3,
    title: 'Block 3: Kinetic Press Support',
    titleHi: 'खंड 3: किनेटिक प्रेस समर्थन',
    exerciseId: 'wall_pushup',
    recommendedDurationSec: 240,
    blockType: 'secondary',
  },
  {
    blockNumber: 4,
    title: 'Block 4: Mindful Somatic Recovery',
    titleHi: 'खंड 4: सचेत शारीरिक रिकवरी',
    exerciseId: 'seated_guided',
    recommendedDurationSec: 180,
    blockType: 'recovery',
  },
];
