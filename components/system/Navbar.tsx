'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { defaultStorage } from '@/lib/storage/indexeddb';
import { UserProfile, DEFAULT_USER_PROFILE } from '@/lib/storage/types';
import { ProgressionState } from '@/lib/game/types';
import { INITIAL_PROGRESSION_STATE } from '@/lib/game/progression';
import {
  Activity,
  Award,
  Calendar,
  Compass,
  Volume2,
  VolumeX,
  Languages,
  Moon,
  Sun,
  ShieldCheck,
  PlaySquare,
  Trophy,
  Target,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { t, locale, setLocale } = useTranslation();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [progression, setProgression] = useState<ProgressionState>(INITIAL_PROGRESSION_STATE);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const sportsLabEnabled = process.env.NEXT_PUBLIC_SPORTS_LAB_ENABLED === 'true';

  useEffect(() => {
    defaultStorage.getProfile().then(setProfile);
    defaultStorage.getProgression().then(setProgression);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [pathname]);

  const toggleSound = async () => {
    const updated = !profile.soundEnabled;
    const newProfile = { ...profile, soundEnabled: updated };
    setProfile(newProfile);
    await defaultStorage.saveProfile(newProfile);
  };

  const toggleTheme = async () => {
    const nextTheme: 'light' | 'dark' | 'system' =
      profile.theme === 'light' ? 'dark' : profile.theme === 'dark' ? 'system' : 'light';
    const newProfile = { ...profile, theme: nextTheme };
    setProfile(newProfile);
    await defaultStorage.saveProfile(newProfile);

    // Apply data-theme to root
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
  };

  const navLinks = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: Activity },
    { href: '/quests', label: t('nav.quests'), icon: Award },
    { href: '/workout', label: t('nav.workout'), icon: Compass },
    ...(sportsLabEnabled ? [{ href: '/sports', label: 'Sports Lab', icon: Target }] : []),
    { href: '/history', label: t('nav.history'), icon: Calendar },
    { href: '/demo', label: t('nav.demo'), icon: PlaySquare },
    { href: '/profile', label: t('nav.profile'), icon: ShieldCheck },
  ];

  return (
    <header className="border-b-2 border-[var(--border-color)] bg-[var(--surface-panel)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 touch-target focus-visible:ring">
          <div className="w-8 h-8 bg-[var(--cyan)] border-2 border-[var(--border-color)] flex items-center justify-center font-black text-sm text-[var(--ink)] shadow-[2px_2px_0px_var(--border-color)]">
            K
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-wider leading-none">
              {t('nav.brand')}
            </div>
            <div className="text-[11px] font-bold text-[var(--text-secondary)] tracking-widest uppercase">
              {t('nav.subtitle')}
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation" className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`touch-target px-2.5 sm:px-3 py-1 text-sm font-bold border transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--cyan)] text-[var(--ink)] border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status Pills & Quick Controls */}
        <div className="flex items-center gap-2">
          {/* Level / Rank Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 border-2 border-[var(--border-color)] bg-[var(--surface-inset)] text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-[var(--amber)]" />
            <span>Lv.{progression.level}</span>
            <span className="text-[var(--text-secondary)]">|</span>
            <span className="text-[var(--violet-dim)]">{progression.rank}</span>
          </div>

          {/* Offline / Local Status */}
          <div
            title="Local-first offline architecture. No video is ever sent over network."
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold border border-[var(--border-color)] bg-[var(--paper)] text-[var(--ink)]"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden lg:inline">{isOnline ? t('nav.online') : t('nav.offline')}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={profile.soundEnabled ? 'Disable speech cues' : 'Enable speech cues'}
            className="touch-target p-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)] text-[var(--text-primary)]"
          >
            {profile.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[var(--cyan-dim)]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[var(--text-secondary)]" />
            )}
          </button>

          {/* Locale Toggle */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
            aria-label="Switch Language (English / Hindi)"
            className="touch-target px-2 py-1 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] text-xs font-bold hover:bg-[var(--paper)] flex items-center gap-1"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'HI' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Current theme: ${profile.theme}. Click to switch.`}
            className="touch-target p-2 border-2 border-[var(--border-color)] bg-[var(--surface-panel)] hover:bg-[var(--paper)]"
          >
            {profile.theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[var(--violet)]" />
            ) : (
              <Sun className="w-4 h-4 text-[var(--amber)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
