/// <reference types="astro/client" />

/** Comfort & access settings, as saved in localStorage "pholoso-comfort". */
interface ComfortPrefs {
  v: 1;
  theme?: 'standard' | 'calm' | 'contrast' | 'dim';
  text?: 100 | 115 | 130 | 150;
  spacing?: boolean;
  guide?: boolean;
  motion?: 'reduced' | 'full';
  simple?: boolean;
  images?: boolean;
  focus?: 'strong' | 'normal';
  identityFirst?: boolean;
  rate?: 0.75 | 1 | 1.25 | 1.5;
}

/** Settings after device preferences are applied. */
interface ComfortEffective {
  theme: 'standard' | 'calm' | 'contrast' | 'dim';
  text: 100 | 115 | 130 | 150;
  motion: 'reduced' | 'full';
  spacing: boolean;
  guide: boolean;
  simple: boolean;
  images: boolean;
  focus: 'strong' | 'normal';
  identityFirst: boolean;
  rate: 0.75 | 1 | 1.25 | 1.5;
}

interface Window {
  /** Defined by public/prefs.js, which runs before the page draws. */
  pholosoComfort?: {
    read(): ComfortPrefs;
    write(prefs: ComfortPrefs): void;
    clear(): void;
    apply(prefs: ComfortPrefs): ComfortEffective;
    effective(prefs: ComfortPrefs): ComfortEffective;
  };
}
