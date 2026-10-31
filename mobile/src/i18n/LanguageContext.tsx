import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from '../lib/storage';
import { dictionaries, type Lang, type Strings } from './strings';

const LANG_KEY = 'ts.lang';

type LanguageValue = { lang: Lang; t: Strings; setLang: (lang: Lang) => void };

const LanguageContext = createContext<LanguageValue>({ lang: 'uz', t: dictionaries.uz, setLang: () => {} });

// @MOB-103 Language choice, remembered on the device and applied without a restart.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('uz');

  useEffect(() => {
    storage.get(LANG_KEY).then((saved) => {
      if (saved === 'uz' || saved === 'en') setLangState(saved);
    });
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      t: dictionaries[lang],
      setLang: (next) => {
        setLangState(next);
        void storage.set(LANG_KEY, next);
      },
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useT = () => useContext(LanguageContext);
