/**
 * Accessible Speech Synthesis Wrapper for Kinetra
 * Respects user opt-in, strict localService filtering, and rate bounds.
 */

export class SpeechManager {
  private static instance: SpeechManager;
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  public static getInstance(): SpeechManager {
    if (!SpeechManager.instance) {
      SpeechManager.instance = new SpeechManager();
    }
    return SpeechManager.instance;
  }

  private loadVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
      this.isLoaded = this.voices.length > 0;
    }
  }

  public getAvailableVoices(locale: 'en' | 'hi', localOnly: boolean = false): SpeechSynthesisVoice[] {
    const langCode = locale === 'hi' ? 'hi' : 'en';
    return this.voices.filter((v) => {
      const matchesLang = v.lang.toLowerCase().startsWith(langCode);
      if (localOnly) {
        return matchesLang && v.localService;
      }
      return matchesLang;
    });
  }

  public speak(
    text: string,
    locale: 'en' | 'hi',
    soundEnabled: boolean,
    localOnly: boolean = false
  ): void {
    if (!soundEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop previous queued utterances immediately

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = locale === 'hi' ? 'hi-IN' : 'en-US';

    const candidateVoices = this.getAvailableVoices(locale, localOnly);
    if (candidateVoices.length > 0) {
      utterance.voice = candidateVoices[0];
    } else if (localOnly) {
      // If user strictly requested localService only and none exist, do not send to cloud TTS
      return;
    }

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechManager = SpeechManager.getInstance();
