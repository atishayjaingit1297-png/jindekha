# Architecture

## Stack

- **React 19 + TypeScript (strict) + Vite 7.** Mature, fast to build, and the same TypeScript core can be reused by React Native or Capacitor.
- **vite-plugin-pwa (Workbox `generateSW`).** Generates the manifest and a service worker that precaches the app shell, the deck data and the fonts.
- **IndexedDB** for saved games and preferences, behind a tiny `KeyValueStore` interface. It falls back to memory if IndexedDB is unavailable.
- **Fonts:** Baloo 2 (display) and Mukta (body). Both have full Devanagari coverage, are self-hosted via `@fontsource` and work offline.
- **Tests:** Vitest + Testing Library (unit and integration), Playwright (E2E, PWA/offline, axe accessibility).
- **No backend, accounts, analytics or ads.**

## Layers

```
src/
  core/          ← portable game logic (no React, no DOM, no browser APIs)
    types.ts       data model: Card, Deck, Rules, GameState, GameAction
    rules.ts       DEFAULT_RULES, sanitizeRules, pointsFor  (the ONLY place points are defined)
    engine.ts      createGame + pure reducer (state machine), getScores/getStandings/getLeaders
    restore.ts     validate + migrate persisted state (running turn → paused)
    content.ts     runtime validation of deck JSON
    random.ts      seeded shuffle (reproducible tests)
  content/       generated deck JSON + lookup maps
  persistence/   KeyValueStore (IndexedDB/memory) + Repository (versioned game + prefs)
  platform/      haptics, sound, wake lock, share — behind the `Platform` interface
  state/         AppContext (glue: engine ⇄ persistence ⇄ platform), hash router, countdown hook
  pwa/           service-worker registration, update prompt, install prompt, online status
  i18n/          all UI strings: hi.ts (source of keys) and en.ts (typed against it); useT() picks one from prefs
  ui/            design-system components (buttons, steppers, sheets, standings, icons, logo)
  screens/       Home, Setup, HowToPlay, Settings, Decks, game/* (Ready, Play, Review, RoundSummary, Results, Scoreboard)
```

Theming: every colour is a CSS custom property on `:root`. Dark values are redefined under `prefers-color-scheme: dark` (unless `data-theme="light"`) and under `[data-theme="dark"]`, so System, Light and Dark all work.

Rules for contributors:

- `src/core` must not import anything outside itself.
- Screens never calculate points. They call `pointsFor`, `getScores` or `scoreResults`.
- Screens never mutate game state. They send `GameAction`s through `useApp().dispatch`.

## State machine

```
            START_TURN            time up / deck empty            CONFIRM_TURN
  ready ───────────────► active ─────────────────────► review ─────────────────► ready (next team)
                          │  ▲                            │                      └► round_summary ─NEXT_ROUND─► ready
                    PAUSE │  │ RESUME                     │ EDIT_RESULT          └► completed
                          ▼  │                            ▼
                         paused                         review
  END_GAME: any non-completed state → completed
```

- The reducer returns the **same object** for an invalid or duplicate action. `dispatch` uses this to ignore it, with no sound, no save and no re-render.
- Card actions carry the `cardId` they were shown for. A stale or double tap on an already-scored card is rejected.
- `dispatch` updates a ref synchronously before React re-renders. Two taps in the same frame therefore can't both be applied.
- Each accepted action is saved immediately. Saved state carries `schemaVersion`, and `restoreGame` rejects anything corrupted or incompatible instead of crashing.

## Timer

`endsAt` (epoch ms) is part of the game state. The UI computes `remaining = endsAt − now` every 100 ms. There is exactly one interval per running turn, and it is cleared on pause, end or unmount. When `now ≥ endsAt` the UI sends `TICK`. The engine moves to `review` once, and later `TICK`s do nothing. `visibilitychange` (hidden) and `pagehide` send `PAUSE`.

## Path to iOS and Android

1. **Capacitor (recommended first step).** Wrap the existing build without rewriting anything.
   - Install `@capacitor/core` and `@capacitor/cli`, run `npx cap init`, and set `webDir: 'dist'`.
   - Implement `Platform` using `@capacitor/haptics`, `@capacitor-community/keep-awake` and `@capacitor/share`. Swap it in via `<AppProvider platform={...}>`.
   - Optionally implement `KeyValueStore` with `@capacitor/preferences`.
   - Map `App.addListener('appStateChange')` to `PAUSE`. Today's `visibilitychange` handler already covers most WebView cases.
   - Disable the service worker inside the native shell. Assets are bundled there, so it isn't needed.
2. **React Native (if a fully native UI is wanted later).** Reuse `src/core`, `src/content/generated/decks.json` and `src/i18n` unchanged. Re-implement only `screens/`, `ui/`, `platform/` and `persistence/` (AsyncStorage/MMKV adapter for `KeyValueStore`).

Browser capability notes, each with a graceful fallback:

| Capability | Notes |
|---|---|
| Vibration | Not available on iOS Safari. The call is a no-op there. |
| Screen Wake Lock | Supported in modern Chrome/Edge and Safari 16.4+. Silently skipped elsewhere. |
| Install prompt | `beforeinstallprompt` exists on Chromium only. On iOS, use Share → Add to Home Screen. |
| `navigator.share` | Falls back to the clipboard. |
