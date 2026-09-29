'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { UserProfile, DEFAULT_USER_PROFILE } from '@/lib/storage/types';
import { MangaCard } from '@/components/system/MangaCard';
import {
  ShieldCheck,
  Languages,
  Moon,
  Volume2,
  Sliders,
  Trash2,
  CheckCircle,
  Eye,
  User,
} from 'lucide-react';

export default function ProfilePage() {
  const { t, locale, setLocale } = useTranslation();

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    defaultStorage.getProfile().then(setProfile);
  }, []);

  const handleUpdate = async (patch: Partial<UserProfile>) => {
    const updated = { ...profile, ...patch };
    setProfile(updated);
    await defaultStorage.saveProfile(updated);

    if (patch.locale && patch.locale !== locale) {
      setLocale(patch.locale);
    }

    if (patch.theme) {
      document.documentElement.setAttribute('data-theme', patch.theme);
    }

    if (typeof patch.reducedMotion === 'boolean') {
      if (patch.reducedMotion) {
        document.body.classList.add('reduced-motion-active');
      } else {
        document.body.classList.remove('reduced-motion-active');
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleResetData = async () => {
    if (window.confirm(t('action.delete_confirm'))) {
      await defaultStorage.clearAllData();
      const fresh = await defaultStorage.getProfile();
      setProfile(fresh);
      alert('Local storage cleared successfully.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="border-b-2 border-[var(--border-color)] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            {t('profile.title')}
          </h1>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1">
            Local preferences • Accessibility controls • Zero invasive metrics
          </p>
        </div>
        {saveSuccess && (
          <span className="badge-status bg-emerald-500 text-white animate-pulse">
            Settings Saved
          </span>
        )}
      </div>

      {/* Identity & Display Name */}
      <MangaCard title="Practitioner Identity">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="display-name" className="text-xs uppercase font-extrabold text-[var(--text-secondary)] block mb-1">
              {t('profile.display_name')}
            </label>
            <input
              id="display-name"
              type="text"
              value={profile.displayName}
              onChange={(e) => handleUpdate({ displayName: e.target.value })}
              className="w-full p-2.5 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] font-bold text-sm"
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Kinetra never collects height, weight, BMI, body fat percentage, or target body shape.
          </p>
        </div>
      </MangaCard>

      {/* Language & Theme Controls */}
      <MangaCard title="Display & Language">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase font-extrabold text-[var(--text-secondary)] block mb-2">
              {t('profile.language')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdate({ locale: 'en' })}
                className={`p-2.5 text-xs font-black uppercase border-2 ${
                  profile.locale === 'en'
                    ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-inset)]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleUpdate({ locale: 'hi' })}
                className={`p-2.5 text-xs font-black uppercase border-2 ${
                  profile.locale === 'hi'
                    ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-inset)]'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-extrabold text-[var(--text-secondary)] block mb-2">
              {t('profile.theme')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as const).map((thm) => (
                <button
                  key={thm}
                  type="button"
                  onClick={() => handleUpdate({ theme: thm })}
                  className={`p-2.5 text-xs font-black uppercase border-2 ${
                    profile.theme === thm
                      ? 'bg-[var(--cyan)] border-[var(--border-color)] text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-inset)]'
                  }`}
                >
                  {thm}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MangaCard>

      {/* Accessibility & Audio Controls */}
      <MangaCard title="Accessibility & Feedback">
        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between p-3 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] cursor-pointer">
            <div>
              <div className="font-extrabold text-sm">{t('profile.sound')}</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Speaks concise movement cues aloud using local browser speech.
              </div>
            </div>
            <input
              type="checkbox"
              checked={profile.soundEnabled}
              onChange={(e) => handleUpdate({ soundEnabled: e.target.checked })}
              className="w-5 h-5 accent-[var(--cyan-dim)]"
            />
          </label>

          <label className="flex items-center justify-between p-3 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] cursor-pointer">
            <div>
              <div className="font-extrabold text-sm">{t('profile.reduced_motion')}</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Disables animated speedlines, screen shakes, and intense rank-up visuals.
              </div>
            </div>
            <input
              type="checkbox"
              checked={profile.reducedMotion}
              onChange={(e) => handleUpdate({ reducedMotion: e.target.checked })}
              className="w-5 h-5 accent-[var(--cyan-dim)]"
            />
          </label>

          <label className="flex items-center justify-between p-3 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] cursor-pointer">
            <div>
              <div className="font-extrabold text-sm">{t('profile.captions')}</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Displays prominent high-contrast text banners for all cues.
              </div>
            </div>
            <input
              type="checkbox"
              checked={profile.captionsEnabled}
              onChange={(e) => handleUpdate({ captionsEnabled: e.target.checked })}
              className="w-5 h-5 accent-[var(--cyan-dim)]"
            />
          </label>
        </div>
      </MangaCard>

      {/* Privacy Manifesto */}
      <MangaCard title={t('profile.privacy_title')} badge="Zero Data Leakage">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0 mt-1" />
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
            <p className="mb-2">{t('profile.privacy_body')}</p>
            <p>
              Guest sessions use local IndexedDB storage. Cloud sync and coach explanations are strictly opt-in and use sanitized minimal summaries only.
            </p>
          </div>
        </div>
      </MangaCard>

      {/* Danger Zone */}
      <div className="manga-panel p-4 bg-red-50/20 border-2 border-red-500/50 flex items-center justify-between">
        <div>
          <div className="font-black text-sm uppercase text-[var(--crimson)]">
            Reset All Local Data
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Deletes all local IndexedDB sessions, quest logs, and profile records.
          </div>
        </div>
        <button
          onClick={handleResetData}
          className="touch-target px-4 py-2 bg-[var(--crimson)] text-white font-black text-xs uppercase border border-[var(--border-color)]"
        >
          Reset Data
        </button>
      </div>
    </div>
  );
}
