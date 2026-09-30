/**
 * Sports Drill Demonstration Animation Presets
 * Authoritative athletic reference choreography for basketball and football drills.
 * Completely decoupled from player avatar progression.
 */

export interface DrillKeyframePose {
  durationRatio: number; // Percentage of total cycle time (0.0 to 1.0)
  phaseName: string;
  phaseCaption: string;
  phaseCaptionHi: string;
  // Joint angles in radians or degrees
  torsoPitch: number; // Forward lean
  torsoYaw: number;
  hipHeight: number; // Vertical offset
  // Arms: [shoulderPitch, shoulderRoll, elbowFlexion, wristFlexion]
  leftArm: [number, number, number, number];
  rightArm: [number, number, number, number];
  // Legs: [hipPitch, kneeFlexion, anklePitch]
  leftLeg: [number, number, number];
  rightLeg: [number, number, number];
  // Equipment translation & visibility
  ballOffset?: [number, number, number];
  ballVisible?: boolean;
}

export interface DrillDemonstrationConfig {
  drillId: string;
  sportId: 'football' | 'basketball';
  title: string;
  cycleDurationMs: number;
  equipmentType: 'none' | 'basketball' | 'football';
  recommendedCameraAngle: string;
  recommendedDistance: string;
  cameraViewPresets: {
    front: { position: [number, number, number]; target: [number, number, number] };
    side: { position: [number, number, number]; target: [number, number, number] };
  };
  phases: DrillKeyframePose[];
  staticIllustrations: {
    step: number;
    title: string;
    caption: string;
    keyPoints: string[];
  }[];
}

export const DRILL_DEMONSTRATIONS: Record<string, DrillDemonstrationConfig> = {
  // 1. Basketball: Shooting-Form Rehearsal
  basketball_shooting_rehearsal: {
    drillId: 'basketball_shooting_rehearsal',
    sportId: 'basketball',
    title: 'Shooting-Form Rehearsal',
    cycleDurationMs: 4000,
    equipmentType: 'basketball',
    recommendedCameraAngle: '45° Semi-Profile Angle (Shooting arm visible)',
    recommendedDistance: '7–8 feet from camera, full body in frame',
    cameraViewPresets: {
      side: { position: [1.8, 1.3, 2.5], target: [0, 1.1, 0] },
      front: { position: [0, 1.3, 3.2], target: [0, 1.1, 0] },
    },
    phases: [
      {
        durationRatio: 0.25,
        phaseName: 'Gather & Dip',
        phaseCaption: '1. Gather & Dip: Drop hips into athletic base, ball rests in shooting pocket with loose wrist.',
        phaseCaptionHi: '१. गैदर और डिप: घुटनों को मोड़ें, गेंद को संतुलित कमर स्तर पर लाएं।',
        torsoPitch: 0.15,
        torsoYaw: -0.1,
        hipHeight: -0.12,
        leftArm: [0.3, 0.4, 1.2, 0.2], // Guide hand supporting
        rightArm: [0.4, 0.2, 1.5, 0.4], // Shooting elbow bent ~90°
        leftLeg: [0.35, 0.65, -0.2],
        rightLeg: [0.3, 0.6, -0.2],
        ballOffset: [0.08, 0.95, 0.28],
        ballVisible: true,
      },
      {
        durationRatio: 0.55,
        phaseName: 'Set Point & Elevation',
        phaseCaption: '2. Set Point: Elevate through legs. Shooting elbow aligns directly under ball at eye level.',
        phaseCaptionHi: '२. सेट पॉइंट: पैरों से ऊपर उठें। कोहनी को गेंद के नीचे आंख के स्तर पर संरेखित करें।',
        torsoPitch: 0.05,
        torsoYaw: -0.05,
        hipHeight: 0.04,
        leftArm: [1.2, 0.35, 1.1, 0.1], // Guide hand near brow
        rightArm: [1.35, 0.1, 1.45, 0.5], // Shooting arm cocked at forehead
        leftLeg: [0.1, 0.15, -0.05],
        rightLeg: [0.1, 0.15, -0.05],
        ballOffset: [0.1, 1.62, 0.22],
        ballVisible: true,
      },
      {
        durationRatio: 0.8,
        phaseName: 'Follow-Through & Snap',
        phaseCaption: '3. Follow-Through: Complete extension toward target. Snap wrist down ("goose neck") and hold.',
        phaseCaptionHi: '३. फॉलो-थ्रू: हाथ को ऊपर पूरा फैलाएं, कलाई को नीचे मोड़ें ("गूज नेक")।',
        torsoPitch: 0.0,
        torsoYaw: 0.0,
        hipHeight: 0.08,
        leftArm: [0.8, 0.4, 0.3, 0.0],
        rightArm: [2.05, 0.05, 0.15, -0.6], // Fully extended upward, wrist flexed down
        leftLeg: [0.02, 0.05, 0.1], // Up on balls of feet
        rightLeg: [0.02, 0.05, 0.1],
        ballOffset: [0.12, 2.05, 0.38],
        ballVisible: true,
      },
      {
        durationRatio: 1.0,
        phaseName: 'Grounded Reset',
        phaseCaption: '4. Grounded Reset: Lower arms smoothly and return feet flat to balance.',
        phaseCaptionHi: '४. ग्राउंडेड रीसेट: हाथों को नीचे लाएं और संतुलन में वापस आएं।',
        torsoPitch: 0.05,
        torsoYaw: 0.0,
        hipHeight: 0.0,
        leftArm: [0.1, 0.15, 0.2, 0.0],
        rightArm: [0.1, 0.15, 0.2, 0.0],
        leftLeg: [0.0, 0.05, 0.0],
        rightLeg: [0.0, 0.05, 0.0],
        ballOffset: [0.05, 0.85, 0.2],
        ballVisible: false,
      },
    ],
    staticIllustrations: [
      {
        step: 1,
        title: 'Phase 1: Gather & Dip',
        caption: 'Lower center of gravity, bend knees to 125°-145°, hold ball at dominant hip.',
        keyPoints: ['Feet shoulder-width apart', 'Eyes on the rim', 'Soft, relaxed grip'],
      },
      {
        step: 2,
        title: 'Phase 2: Set Point Elevation',
        caption: 'Push up through hips and legs, tuck elbow directly under ball at brow level.',
        keyPoints: ['90-degree shooting elbow', 'Guide hand non-interfering', 'Vertical upward path'],
      },
      {
        step: 3,
        title: 'Phase 3: Follow-Through',
        caption: 'Full arm extension at 165°-175°, snap wrist forward and hold for 1 count.',
        keyPoints: ['Fingers relaxed and pointed down', 'Up on toes', 'Balanced landing'],
      },
    ],
  },

  // 2. Basketball: Athletic Defensive Stance
  basketball_athletic_stance: {
    drillId: 'basketball_athletic_stance',
    sportId: 'basketball',
    title: 'Athletic Defensive Stance',
    cycleDurationMs: 3500,
    equipmentType: 'none',
    recommendedCameraAngle: 'Direct Front View',
    recommendedDistance: '7–9 feet away framing full body',
    cameraViewPresets: {
      front: { position: [0, 1.2, 3.2], target: [0, 1.0, 0] },
      side: { position: [2.2, 1.2, 2.2], target: [0, 1.0, 0] },
    },
    phases: [
      {
        durationRatio: 0.3,
        phaseName: 'Sink into Stance',
        phaseCaption: '1. Drop hips, bend knees to 120°-145°, keep chest proud and back flat.',
        phaseCaptionHi: '१. घुटनों को १२०°-१४५° तक मोड़ें, छाती तनी रखें।',
        torsoPitch: 0.2,
        torsoYaw: 0.0,
        hipHeight: -0.16,
        leftArm: [0.2, 0.8, 0.4, 0.0], // Wide arms
        rightArm: [0.2, -0.8, 0.4, 0.0],
        leftLeg: [0.45, 0.8, -0.2],
        rightLeg: [0.45, 0.8, -0.2],
      },
      {
        durationRatio: 0.75,
        phaseName: 'Active Defensive Hold',
        phaseCaption: '2. Active Hold: Weight on balls of feet, active hands, maintain stable center of gravity.',
        phaseCaptionHi: '२. स्थिर रक्षात्मक मुद्रा: पंजों पर संतुलन, हाथ सक्रिय रखें।',
        torsoPitch: 0.22,
        torsoYaw: 0.0,
        hipHeight: -0.18,
        leftArm: [0.3, 0.9, 0.5, 0.1],
        rightArm: [0.3, -0.9, 0.5, 0.1],
        leftLeg: [0.5, 0.85, -0.2],
        rightLeg: [0.5, 0.85, -0.2],
      },
      {
        durationRatio: 1.0,
        phaseName: 'Stand Tall & Recover',
        phaseCaption: '3. Controlled recovery: Stand tall momentarily to avoid fatigue collapse before next hold.',
        phaseCaptionHi: '३. नियंत्रित वापसी: अगले चक्र से पहले आराम से सीधे खड़े हों।',
        torsoPitch: 0.05,
        torsoYaw: 0.0,
        hipHeight: 0.0,
        leftArm: [0.1, 0.2, 0.2, 0.0],
        rightArm: [0.1, -0.2, 0.2, 0.0],
        leftLeg: [0.05, 0.1, 0.0],
        rightLeg: [0.05, 0.1, 0.0],
      },
    ],
    staticIllustrations: [
      {
        step: 1,
        title: 'Wide Footing',
        caption: 'Feet slightly wider than shoulders, weight centered on balls of feet.',
        keyPoints: ['No locked knees', 'Knees tracking over toes', 'Upright spine'],
      },
      {
        step: 2,
        title: 'Active Defensive Arms',
        caption: 'Arms outstretched at 45 degrees ready to contest passing lanes.',
        keyPoints: ['Palms up or forward', 'Relaxed neck and shoulders', 'Hold for 3-5 seconds'],
      },
    ],
  },

  // 3. Football: Lateral Footwork & Stance
  football_lateral_footwork: {
    drillId: 'football_lateral_footwork',
    sportId: 'football',
    title: 'Lateral Footwork & Stance',
    cycleDurationMs: 4500,
    equipmentType: 'none',
    recommendedCameraAngle: 'Direct Front View (Full 8ft width in view)',
    recommendedDistance: '8–10 feet back to capture lateral bounds',
    cameraViewPresets: {
      front: { position: [0, 1.2, 3.4], target: [0, 1.0, 0] },
      side: { position: [2.0, 1.2, 2.2], target: [0, 1.0, 0] },
    },
    phases: [
      {
        durationRatio: 0.25,
        phaseName: 'Lateral Push Left',
        phaseCaption: '1. Push off right instep: Step laterally to the left while keeping knee bend cushioned.',
        phaseCaptionHi: '१. बाईं ओर कदम: घुटनों को मोड़कर बाईं ओर संतुलित कदम बढ़ाएं।',
        torsoPitch: 0.15,
        torsoYaw: 0.05,
        hipHeight: -0.1,
        leftArm: [0.2, 0.3, 0.8, 0.0],
        rightArm: [0.2, -0.3, 0.8, 0.0],
        leftLeg: [0.3, 0.6, -0.1],
        rightLeg: [0.2, 0.4, 0.1],
      },
      {
        durationRatio: 0.5,
        phaseName: 'Deceleration Dwell',
        phaseCaption: '2. Stick and absorb: Plant outside foot, absorb force with bent knee without knee cave.',
        phaseCaptionHi: '२. गति अवशोषण: बाहर के पैर को मजबूती से टिकाएं और गति रोकें।',
        torsoPitch: 0.18,
        torsoYaw: 0.0,
        hipHeight: -0.14,
        leftArm: [0.3, 0.4, 0.9, 0.0],
        rightArm: [0.3, -0.4, 0.9, 0.0],
        leftLeg: [0.45, 0.8, -0.2],
        rightLeg: [0.35, 0.65, -0.15],
      },
      {
        durationRatio: 0.75,
        phaseName: 'Lateral Push Right',
        phaseCaption: '3. Explode right: Drive off left foot and step laterally back to opposite side.',
        phaseCaptionHi: '३. दाईं ओर वापसी: बाएं पैर से धक्का देकर दाईं ओर लौटें।',
        torsoPitch: 0.15,
        torsoYaw: -0.05,
        hipHeight: -0.1,
        leftArm: [0.2, 0.3, 0.8, 0.0],
        rightArm: [0.2, -0.3, 0.8, 0.0],
        leftLeg: [0.2, 0.4, 0.1],
        rightLeg: [0.3, 0.6, -0.1],
      },
      {
        durationRatio: 1.0,
        phaseName: 'Center Reset',
        phaseCaption: '4. Center Alignment: Return to middle stance with upright balanced posture.',
        phaseCaptionHi: '४. मध्य संतुलन: केंद्र में सीधे और स्थिर खड़े हों।',
        torsoPitch: 0.1,
        torsoYaw: 0.0,
        hipHeight: -0.05,
        leftArm: [0.1, 0.2, 0.4, 0.0],
        rightArm: [0.1, -0.2, 0.4, 0.0],
        leftLeg: [0.2, 0.3, 0.0],
        rightLeg: [0.2, 0.3, 0.0],
      },
    ],
    staticIllustrations: [
      {
        step: 1,
        title: 'Athletic Athletic Base',
        caption: 'Soft knees, hips dropped, chest facing camera squarely.',
        keyPoints: ['Keep head steady', 'Do not cross feet', 'Light footsteps'],
      },
      {
        step: 2,
        title: 'Side Step & Decelerate',
        caption: 'Step laterally and freeze for 1 count to establish joint control.',
        keyPoints: ['Absorb through quadriceps and glutes', 'Avoid sudden spine jerk'],
      },
    ],
  },

  // 4. Football: Ball-Control Touches
  football_ball_control: {
    drillId: 'football_ball_control',
    sportId: 'football',
    title: 'Ball-Control Touches',
    cycleDurationMs: 3000,
    equipmentType: 'football',
    recommendedCameraAngle: 'Slight High Angle or Front View (Floor visible)',
    recommendedDistance: '6–8 feet away framing feet and ball',
    cameraViewPresets: {
      front: { position: [0, 1.1, 2.8], target: [0, 0.6, 0] },
      side: { position: [1.8, 1.1, 2.0], target: [0, 0.6, 0] },
    },
    phases: [
      {
        durationRatio: 0.33,
        phaseName: 'Right Sole Touch',
        phaseCaption: '1. Lift right foot: Touch ball top lightly with right sole; support weight on left leg.',
        phaseCaptionHi: '१. दायां तलवा स्पर्श: गेंद के ऊपर हल्के से दायां पैर रखें।',
        torsoPitch: 0.15,
        torsoYaw: 0.0,
        hipHeight: -0.04,
        leftArm: [0.2, 0.3, 0.6, 0.0],
        rightArm: [0.2, -0.3, 0.6, 0.0],
        leftLeg: [0.25, 0.4, 0.0],
        rightLeg: [0.55, 0.9, -0.1], // Right foot lifted on ball
        ballOffset: [0.08, 0.12, 0.28],
        ballVisible: true,
      },
      {
        durationRatio: 0.66,
        phaseName: 'Hop Switch Transition',
        phaseCaption: '2. Rhythm hop: Transition weight smoothly from right to left with soft cadence.',
        phaseCaptionHi: '२. लयबद्ध बदलाव: सहज रूप से वजन को दूसरे पैर पर स्थानांतरित करें।',
        torsoPitch: 0.12,
        torsoYaw: 0.0,
        hipHeight: 0.02,
        leftArm: [0.3, 0.35, 0.8, 0.0],
        rightArm: [0.3, -0.35, 0.8, 0.0],
        leftLeg: [0.15, 0.2, 0.1],
        rightLeg: [0.15, 0.2, 0.1],
        ballOffset: [0.0, 0.12, 0.28],
        ballVisible: true,
      },
      {
        durationRatio: 1.0,
        phaseName: 'Left Sole Touch',
        phaseCaption: '3. Alternate left foot: Touch ball top lightly with left sole; steady posture.',
        phaseCaptionHi: '३. बायां तलवा स्पर्श: गेंद के ऊपर बायां पैर रखें, संतुलन बनाए रखें।',
        torsoPitch: 0.15,
        torsoYaw: 0.0,
        hipHeight: -0.04,
        leftArm: [0.2, 0.3, 0.6, 0.0],
        rightArm: [0.2, -0.3, 0.6, 0.0],
        leftLeg: [0.55, 0.9, -0.1], // Left foot lifted on ball
        rightLeg: [0.25, 0.4, 0.0],
        ballOffset: [-0.08, 0.12, 0.28],
        ballVisible: true,
      },
    ],
    staticIllustrations: [
      {
        step: 1,
        title: 'Ball Positioning',
        caption: 'Keep the ball 6-12 inches directly in front of your toes.',
        keyPoints: ['Look up periodically', 'Light touch without squashing ball'],
      },
      {
        step: 2,
        title: 'Alternating Cadence',
        caption: 'Maintain a steady, continuous tempo without rushing.',
        keyPoints: ['Use arms for balance', 'Breathe steadily'],
      },
    ],
  },
};

/**
 * Helper to retrieve demonstration preset for any drill ID.
 * Returns default fallback preset if custom choreography is not yet authored.
 */
export function getDrillDemonstration(drillId: string): DrillDemonstrationConfig {
  if (DRILL_DEMONSTRATIONS[drillId]) {
    return DRILL_DEMONSTRATIONS[drillId];
  }

  // Graceful fallback preset for drills pending specific choreography
  return {
    drillId,
    sportId: drillId.startsWith('football') ? 'football' : 'basketball',
    title: 'Standard Movement Practice',
    cycleDurationMs: 4000,
    equipmentType: 'none',
    recommendedCameraAngle: 'Front or 45° Angle',
    recommendedDistance: '7–8 feet back, full body framed',
    cameraViewPresets: {
      front: { position: [0, 1.2, 3.2], target: [0, 1.0, 0] },
      side: { position: [2.0, 1.2, 2.2], target: [0, 1.0, 0] },
    },
    phases: [
      {
        durationRatio: 0.5,
        phaseName: 'Athletic Stance & Extension',
        phaseCaption: 'Maintain controlled athletic posture with soft joints and steady breathing.',
        phaseCaptionHi: 'संतुलित मुद्रा बनाए रखें, जोड़ों को सहज और सांस को स्थिर रखें।',
        torsoPitch: 0.1,
        torsoYaw: 0.0,
        hipHeight: -0.08,
        leftArm: [0.2, 0.3, 0.5, 0.0],
        rightArm: [0.2, -0.3, 0.5, 0.0],
        leftLeg: [0.3, 0.5, -0.1],
        rightLeg: [0.3, 0.5, -0.1],
      },
      {
        durationRatio: 1.0,
        phaseName: 'Controlled Recovery',
        phaseCaption: 'Return smoothly to initial alignment and prepare for next cycle.',
        phaseCaptionHi: 'प्रारंभिक स्थिति में लौटें और अगले चक्र के लिए तैयार रहें।',
        torsoPitch: 0.05,
        torsoYaw: 0.0,
        hipHeight: 0.0,
        leftArm: [0.1, 0.2, 0.2, 0.0],
        rightArm: [0.1, -0.2, 0.2, 0.0],
        leftLeg: [0.05, 0.1, 0.0],
        rightLeg: [0.05, 0.1, 0.0],
      },
    ],
    staticIllustrations: [
      {
        step: 1,
        title: 'Posture Foundation',
        caption: 'Ensure comfortable balance and unobstructed movement space.',
        keyPoints: ['Comfortable range of motion', 'Consistent natural rhythm'],
      },
    ],
  };
}
