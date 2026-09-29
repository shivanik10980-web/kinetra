'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, TranslationKey } from './en';
import { hi } from './hi';
import { defaultStorage } from '../storage/indexeddb';

interface I18nContextType {
  locale: 'en' | 'hi';
  setLocale: (locale: 'en' | 'hi') => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => en[key] || key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    defaultStorage.getProfile().then((p) => {
      if (p.locale) {
        setLocaleState(p.locale);
      }
    });
  }, []);

  const setLocale = (newLocale: 'en' | 'hi') => {
    setLocaleState(newLocale);
    defaultStorage.getProfile().then((p) => {
      defaultStorage.saveProfile({ ...p, locale: newLocale });
    });
  };

  const t = (key: TranslationKey): string => {
    const dict = locale === 'hi' ? hi : en;
    return dict[key] || en[key] || (key as string);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
