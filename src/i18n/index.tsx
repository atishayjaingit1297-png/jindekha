import { Fragment } from 'react';
import { hi } from './hi';
import { en } from './en';
import type { Strings } from './hi';
import { useApp } from '../state/AppContext';

export type Language = 'hi' | 'en';
export const LANGUAGES: Record<Language, Strings> = { hi, en };
export type { Strings };

export function useT(): Strings {
  return LANGUAGES[useApp().prefs.language];
}

/** Renders `**bold**` segments inside a translated paragraph. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}
