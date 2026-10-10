import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { configFromGame, createGame, randomSeed, reduce } from '../core';
import type { GameAction, GameConfig, GameState } from '../core';
import { ALL_CARDS, KNOWN_CARD_IDS } from '../content';
import { createDefaultStore } from '../persistence/store';
import type { KeyValueStore } from '../persistence/store';
import { DEFAULT_PREFS, Repository } from '../persistence/repository';
import type { Prefs } from '../persistence/repository';
import { createWebPlatform } from '../platform';
import type { Cue, Platform } from '../platform';

interface AppContextValue {
  loaded: boolean;
  game: GameState | null;
  prefs: Prefs;
  /** Applies a game action. Returns false if the engine rejected it (e.g. a double tap). */
  dispatch: (action: GameAction) => boolean;
  startGame: (config: GameConfig) => GameState;
  rematch: () => void;
  discardGame: () => Promise<void>;
  updatePrefs: (patch: Partial<Prefs>) => void;
  platform: Platform;
  cue: (c: Cue) => void;
}

const Ctx = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

/** Which cue (if any) an accepted action should produce. */
function cueFor(prev: GameState, next: GameState, action: GameAction): Cue | null {
  if (prev.status === 'active' && next.status === 'review' && next.turn?.endedBy === 'time') return 'timeUp';
  if (action.type === 'CORRECT') return 'correct';
  if (action.type === 'SKIP') return 'skip';
  if (action.type === 'VIOLATION') return 'violation';
  if (action.type === 'START_TURN') return 'start';
  if (action.type === 'TICK' && next.status === 'review') return 'timeUp';
  return null;
}

export function AppProvider({ children, store, platform: injected }: { children: ReactNode; store?: KeyValueStore; platform?: Platform }) {
  const platform = useMemo(() => injected ?? createWebPlatform(), [injected]);
  const repoRef = useRef<Repository | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const prefsRef = useRef<Prefs>(DEFAULT_PREFS);
  const [game, setGame] = useState<GameState | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const repo = new Repository(store ?? (await createDefaultStore()), KNOWN_CARD_IDS);
      repoRef.current = repo;
      const [g, p] = await Promise.all([repo.loadGame(), repo.loadPrefs()]);
      if (cancelled) return;
      gameRef.current = g;
      prefsRef.current = p;
      setGame(g);
      setPrefs(p);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const commit = useCallback((next: GameState | null) => {
    gameRef.current = next;
    setGame(next);
    if (next) void repoRef.current?.saveGame(next);
    else void repoRef.current?.clearGame();
  }, []);

  const cue = useCallback(
    (c: Cue) => {
      const p = prefsRef.current;
      if (p.sound) platform.sound(c);
      if (p.haptics) platform.haptic(c);
    },
    [platform],
  );

  const dispatch = useCallback(
    (action: GameAction) => {
      const prev = gameRef.current;
      if (!prev) return false;
      const next = reduce(prev, action);
      if (next === prev) return false;
      commit(next);
      const c = cueFor(prev, next, action);
      if (c) cue(c);
      return true;
    },
    [commit, cue],
  );

  const startGame = useCallback(
    (config: GameConfig) => {
      const g = createGame(config, ALL_CARDS, randomSeed(), Date.now());
      commit(g);
      return g;
    },
    [commit],
  );

  const rematch = useCallback(() => {
    const g = gameRef.current;
    if (g) commit(createGame(configFromGame(g), ALL_CARDS, randomSeed(), Date.now()));
  }, [commit]);

  const discardGame = useCallback(async () => {
    gameRef.current = null;
    setGame(null);
    await repoRef.current?.clearGame();
  }, []);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefs(next);
    void repoRef.current?.savePrefs(next);
  }, []);

  // Leaving the app (switching apps, locking the phone, closing the tab) pauses a running turn,
  // so nobody loses time to an interruption. The state is saved at that moment.
  useEffect(() => {
    const onHide = () => {
      const g = gameRef.current;
      if (g?.status === 'active') dispatch({ type: 'PAUSE', now: Date.now() });
    };
    const onVis = () => document.visibilityState === 'hidden' && onHide();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
    };
  }, [dispatch]);

  // Keep the screen awake only while a turn is running.
  const running = game?.status === 'active';
  useEffect(() => {
    void platform.keepAwake(running && prefs.keepAwake);
  }, [running, prefs.keepAwake, platform]);

  useEffect(() => {
    document.documentElement.dataset.textSize = prefs.largeText ? 'large' : 'normal';
  }, [prefs.largeText]);

  useEffect(() => {
    document.documentElement.lang = prefs.language;
  }, [prefs.language]);

  // 'system' leaves the attribute off so the CSS follows prefers-color-scheme.
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const syncMeta = () => {
      const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && !!media?.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1A1210' : '#7A1F2B');
    };
    syncMeta();
    media?.addEventListener?.('change', syncMeta);
    return () => media?.removeEventListener?.('change', syncMeta);
  }, [prefs.theme]);

  const value = useMemo<AppContextValue>(
    () => ({ loaded, game, prefs, dispatch, startGame, rematch, discardGame, updatePrefs, platform, cue }),
    [loaded, game, prefs, dispatch, startGame, rematch, discardGame, updatePrefs, platform, cue],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
