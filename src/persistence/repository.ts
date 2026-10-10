import { restoreGame, sanitizeRules, DEFAULT_RULES, LIMITS } from '../core';
import type { GameState, Rules } from '../core';
import type { KeyValueStore } from './store';

export interface TeamDraft {
  name: string;
  color: string;
  players: string[];
}

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'hi' | 'en';

export interface Prefs {
  version: 1;
  theme: ThemePref;
  language: LanguagePref;
  sound: boolean;
  haptics: boolean;
  keepAwake: boolean;
  largeText: boolean;
  rules: Rules;
  teams: TeamDraft[];
  deckIds: string[] | null; // null = all decks
}

export const TEAM_COLORS = ['#AD540A', '#2F6B4F', '#3D4E9C', '#B03A4E', '#0F7C86', '#8A5A12'];

export const DEFAULT_PREFS: Prefs = {
  version: 1,
  theme: 'system',
  language: 'hi',
  sound: true,
  haptics: true,
  keepAwake: true,
  largeText: false,
  rules: DEFAULT_RULES,
  teams: [
    { name: 'केसरिया', color: TEAM_COLORS[0], players: [] },
    { name: 'हरियाली', color: TEAM_COLORS[1], players: [] },
  ],
  deckIds: null,
};

const KEYS = { game: 'game/current', prefs: 'prefs' } as const;

function sanitizeTeams(v: unknown): TeamDraft[] {
  if (!Array.isArray(v)) return DEFAULT_PREFS.teams;
  const teams = v
    .filter((t): t is TeamDraft => !!t && typeof t.name === 'string' && typeof t.color === 'string')
    .slice(0, LIMITS.teams.max)
    .map((t) => ({ name: t.name, color: t.color, players: Array.isArray(t.players) ? t.players.filter((p) => typeof p === 'string') : [] }));
  return teams.length >= LIMITS.teams.min ? teams : DEFAULT_PREFS.teams;
}

export function sanitizePrefs(raw: unknown): Prefs {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFS;
  const p = raw as Partial<Prefs>;
  return {
    version: 1,
    theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system',
    language: p.language === 'en' ? 'en' : 'hi',
    sound: typeof p.sound === 'boolean' ? p.sound : DEFAULT_PREFS.sound,
    haptics: typeof p.haptics === 'boolean' ? p.haptics : DEFAULT_PREFS.haptics,
    keepAwake: typeof p.keepAwake === 'boolean' ? p.keepAwake : DEFAULT_PREFS.keepAwake,
    largeText: typeof p.largeText === 'boolean' ? p.largeText : DEFAULT_PREFS.largeText,
    rules: sanitizeRules(p.rules),
    teams: sanitizeTeams(p.teams),
    deckIds: Array.isArray(p.deckIds) ? p.deckIds.filter((d) => typeof d === 'string') : null,
  };
}

export class Repository {
  constructor(private readonly store: KeyValueStore, private readonly knownCards: ReadonlySet<string>) {}

  async loadGame(): Promise<GameState | null> {
    try {
      const raw = await this.store.get<unknown>(KEYS.game);
      if (raw === undefined) return null;
      const game = restoreGame(raw, new Set(this.knownCards));
      if (!game) await this.store.remove(KEYS.game); // corrupted or from an incompatible version
      return game;
    } catch {
      return null;
    }
  }

  saveGame(game: GameState): Promise<void> {
    return this.store.set(KEYS.game, game).catch(() => undefined);
  }

  clearGame(): Promise<void> {
    return this.store.remove(KEYS.game).catch(() => undefined);
  }

  async loadPrefs(): Promise<Prefs> {
    try {
      return sanitizePrefs(await this.store.get<unknown>(KEYS.prefs));
    } catch {
      return DEFAULT_PREFS;
    }
  }

  savePrefs(prefs: Prefs): Promise<void> {
    return this.store.set(KEYS.prefs, prefs).catch(() => undefined);
  }
}
