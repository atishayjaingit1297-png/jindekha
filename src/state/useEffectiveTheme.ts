import { useEffect, useState } from 'react';
import type { ThemePref } from '../persistence/repository';

/** The theme actually on screen: the user's choice, or the device setting when set to 'system'. */
export function useEffectiveTheme(pref: ThemePref): 'light' | 'dark' {
  const query = '(prefers-color-scheme: dark)';
  const [systemDark, setSystemDark] = useState(() => !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const on = () => setSystemDark(media.matches);
    media.addEventListener?.('change', on);
    return () => media.removeEventListener?.('change', on);
  }, []);
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}
