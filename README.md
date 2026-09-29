# Kinetra — The Movement System

> **SIH26196 Prototype | Fitness & Sports / Software**  
> An original manga-inspired movement practice progression game rewarding participation, practice and recovery.

---

## 1. Product Intent & Ethical Guardrails

Kinetra turns a short, self-selected movement session into an original progression game.
- **Participation & Recovery First:** 1 daily movement slot awards 30 XP, 1 mindful reflection awards 10 XP. Daily XP is strictly capped at **40 XP/day**.
- **No Weight or Body Scoring:** Kinetra never scores weight loss, calorie burn, body fat, attractiveness, pain tolerance, or exhaustion.
- **Equal Rest Parity:** Planned mindful rest days and accessible seated guided flows earn the exact same 30 XP as camera practice.
- **Local-First Privacy:** All camera video streams and pose landmarks are processed frame-by-frame in browser memory and immediately discarded. No video, images, or raw coordinates are ever transmitted over the network.
- **Medical Disclaimer:** General fitness practice feedback only; not medical diagnosis, rehabilitation, clinical clearance, or injury prevention guarantees.

---

## 2. Feature Status (Implemented vs. Deferred)

| Component | Status | Details |
| :--- | :--- | :--- |
| **Squat Practice** | **Implemented** | Side-view tracking (hip-knee-ankle), 160°/110° thresholds, 150ms dwell, 300ms stable readiness, 80% coverage gate. |
| **Elbow Flexion Practice** | **Implemented** | Single-arm tracking (shoulder-elbow-wrist), 150°/70° thresholds with 10° hysteresis. |
| **Accessible Guided Mode** | **Implemented** | Seated mobility flow & recovery check-in with manual interval counting and equal 30 XP parity. |
| **Simulated Landmark Replay** | **Implemented** | Obvious persistent banner, 3 synthetic scenarios, isolated demo storage preventing real XP/ledger contamination. |
| **Progression & Ranks** | **Implemented** | Initiate (0), Explorer (120), Navigator (360), Pathfinder (720), Guide (1200). Level = 1 + floor(XP/100). |
| **Quest Board & Boss** | **Implemented** | Flexible daily mission, rest alternative claim, 5 practice badges, "The Static Gate" boss stages. |
| **Sports Skill Lab** | **Implemented** | Typed catalogue for Football & Basketball behind `NEXT_PUBLIC_SPORTS_LAB_ENABLED`, pure `DrillEngine`. |
| **Localization (EN/HI)** | **Implemented** | Full English & Hindi UI dictionaries for navigation, exercises, cues, errors, and privacy manifesto. |
| **Web Speech Audio Cues** | **Implemented** | Local speech synthesis with rate bounds, voice detection, and strict opt-in sound toggle. |
| **Offline PWA** | **Implemented** | Manifest, ServiceWorker caching, self-hosted WASM & models in `public/wasm` and `public/models`. |
| **Supabase Cloud Sync** | **Implemented** | Optional outbox sync with strict Row-Level Security (`auth.uid() = owner_id`). |
| **Gemini Coach Route** | **Implemented** | Optional `/api/coach/explain` with rate limiting, prompt bounding (<= 75 words), and local fallback. |
| **Live Multiplayer Party** | *Deferred (Roadmap)* | Clearly documented on `/roadmap` with private circle designs and capped group contributions. |
| **Public Leaderboards** | *Deferred (Roadmap)* | Excluded by design; collective completion ratios specified on `/roadmap`. |

---

## 3. Quick Start & Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Run Locally
```bash
# Clone the repository
git clone https://github.com/your-username/kinetra.git
cd kinetra

# Install dependencies
npm install

# Run unit test suite (pure engine, metrics, progression, sports drills)
npm test

# Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Verification & Testing

Kinetra includes automated pure-engine tests with synthetic landmark fixtures:
```bash
npm test
```
Tests cover:
1. **Deterministic Rep Engine:** 3-rep squat completion, partial cycle rejection (stopping at 135° before 110° flexion threshold), tracking gap (>500ms) state reset, zero-length vector safety, low confidence gating, pause/resume state preservation.
2. **Scoring Metrics:** Coverage clamping, Range excursion (R), Tempo band (T), Smoothness reversal filter (S), Rep Q score (45% R + 35% T + 20% S), session median calculation, and null state handling.
3. **Game Progression & Rewards:** Daily XP cap `min(40, 30*slot + 10*reflection)`, idempotent event IDs across retries, guided parity, and demo storage isolation.
4. **Sports Skill Lab:** Stance dwell interval completion, tracking loss reset without false completion, confidence gate below 0.60 returning `unknown`, and safe participation XP.

---

## 5. Sports Skill Lab Configuration

The Sports Skill Lab is controlled via the environment flag:
```env
NEXT_PUBLIC_SPORTS_LAB_ENABLED=true
```
When enabled, the `/sports` route is exposed with Football and Basketball drills:
- **Football:** Lateral Footwork, Agility Step Sequence, Ball-Control Touches, Passing Target Accuracy.
- **Basketball:** Athletic Defensive Stance, Defensive Lateral Slides, Dribble Rhythm Cadence, Shooting-Form Rehearsal.

---

## 6. Supabase Setup (Optional Cloud Sync)

To enable cloud backup with Row Level Security:
1. Create a project on [Supabase](https://supabase.com).
2. Open the SQL Editor in Supabase and run `supabase/schema.sql`.
3. Add your keys to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. User sessions and progression will sync when authenticated, with strict RLS enforcement (`auth.uid() = owner_id`).

---

## 7. Deployment to Vercel

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy
vercel
```
In your Vercel Project Settings, add the environment variables:
- `NEXT_PUBLIC_SPORTS_LAB_ENABLED=true`
- `NEXT_PUBLIC_SUPABASE_URL=...` (optional)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` (optional)
- `GEMINI_API_KEY=...` (optional)

---

## 8. License & MediaPipe Asset Notes

- `@mediapipe/tasks-vision` pose landmarker is licensed under the Apache 2.0 license.
- WASM assets and `pose_landmarker_lite.task` are self-hosted in `public/wasm` and `public/models` for offline reliability.
