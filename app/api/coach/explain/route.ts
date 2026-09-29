import { NextRequest, NextResponse } from 'next/server';

interface CoachRequest {
  exerciseId: string;
  locale?: 'en' | 'hi';
  repsCompleted: number;
  scoredReps: number;
  coveragePercent: number;
  medianQScore: number | null;
  observedCueIds: string[];
  userReflection?: string;
}

// Simple in-memory IP rate limiter: 10 requests per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local_user';
    const now = Date.now();
    const rateData = rateLimitMap.get(ip);

    if (rateData && now < rateData.resetAt) {
      if (rateData.count >= 10) {
        return NextResponse.json(
          {
            error: 'Rate limit reached',
            localFallback: 'Practice recorded. Consistent steady pace develops sustainable bodily awareness.',
          },
          { status: 429 }
        );
      }
      rateData.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    }

    const body: CoachRequest = await req.json();

    // Input sanitization and bounds check
    if (!body.exerciseId || typeof body.repsCompleted !== 'number') {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isHindi = body.locale === 'hi';

    const localFallback = isHindi
      ? 'सत्र पूर्ण हुआ। अपनी सहज सीमा में निरंतर अभ्यास आपके संतुलन और गतिशीलता को मजबूत करता है।'
      : 'Session complete. Mindful practice within your comfortable range strengthens joint balance and movement awareness.';

    if (!apiKey) {
      return NextResponse.json({
        explanation: localFallback,
        source: 'local_deterministic',
      });
    }

    // Call Gemini API
    const systemInstruction = `You are a supportive, concise movement coach for Kinetra.
Explain observed movement cues in <= 75 words.
Strict requirements:
- NEVER prescribe medical treatments, therapy, diet, weight loss, or fat targets.
- NEVER offer unearned praise or guarantee injury prevention.
- Focus strictly on posture, breathing, and comfortable range.
${isHindi ? '- Respond strictly in clear Hindi.' : '- Respond strictly in English.'}`;

    const promptText = `Movement: ${body.exerciseId}
Completed cycles: ${body.repsCompleted}, Scored cycles: ${body.scoredReps}
Camera coverage: ${body.coveragePercent}%
Median technique score: ${body.medianQScore !== null ? body.medianQScore : 'Not applicable'}
Observed cues: ${body.observedCueIds.join(', ') || 'Smooth consistent flow'}
User reflection: ${body.userReflection || 'None'}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${promptText}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 120,
          temperature: 0.3,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      return NextResponse.json({ explanation: localFallback, source: 'fallback_error' });
    }

    const data = await geminiRes.json();
    const explanation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || localFallback;

    return NextResponse.json({
      explanation,
      source: 'gemini_coach',
    });
  } catch (error) {
    console.warn('Coach route error or timeout:', error);
    return NextResponse.json({
      explanation:
        'Practice recorded. Mindful attention to your comfortable range develops steady rhythm.',
      source: 'fallback_exception',
    });
  }
}
