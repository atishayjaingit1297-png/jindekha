import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { AppProvider } from '../../src/state/AppContext';
import { createIdbStore, createMemoryStore } from '../../src/persistence/store';
import { Repository } from '../../src/persistence/repository';
import { nullPlatform } from '../../src/platform';
import { CARD_BY_ID, KNOWN_CARD_IDS } from '../../src/content';

const click = (el: HTMLElement) => act(() => void fireEvent.click(el));
/** Main buttons are briefly disabled after a screen appears (double-tap guard). */
async function clickWhenEnabled(name: RegExp) {
  const btn = await screen.findByRole('button', { name });
  await waitFor(() => expect(btn).toBeEnabled());
  await click(btn);
}

function currentTarget() {
  return document.querySelector('.word-card .target h2')?.textContent ?? null;
}

describe('UI gameplay flow (jsdom)', () => {
  beforeEach(() => {
    window.location.hash = '';
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  });
  afterEach(() => vi.useRealTimers());

  it('sets up, plays two turns with real cards, and shows correct final scores', async () => {
    const store = createMemoryStore();
    render(
      <AppProvider store={store} platform={nullPlatform}>
        <App />
      </AppProvider>,
    );
    await click(await screen.findByRole('button', { name: /नया खेल/ }));
    await click(await screen.findByRole('button', { name: '30s' }));
    const rounds = screen.getByRole('group', { name: 'राउंड' });
    await click(within(rounds).getByRole('button', { name: /घटाएँ/ }));
    await click(within(rounds).getByRole('button', { name: /घटाएँ/ }));
    await click(screen.getByRole('button', { name: /खेल शुरू करें/ }));

    // Team 1: correct, correct, violation  → 2 − 1 = 1
    await clickWhenEnabled(/शुरू करें ·/);
    const seen: string[] = [];
    for (const action of ['सही', 'सही', 'मना शब्द'] as const) {
      const target = currentTarget()!;
      const card = [...CARD_BY_ID.values()].find((c) => c.target === target);
      expect(card).toBeDefined();
      const shown = [...document.querySelectorAll('.word-card .forbidden li')].map((li) => li.textContent);
      expect(shown).toEqual(card!.forbidden);
      seen.push(target);
      await click(screen.getByRole('button', { name: action }));
    }
    // No card repeats within the game:
    expect(new Set(seen).size).toBe(3);

    await act(async () => void vi.advanceTimersByTime(31_000));
    expect(screen.getByRole('heading', { name: 'समय समाप्त!' })).toBeInTheDocument();
    await clickWhenEnabled(/अगली बारी/);

    // Team 2: one correct → 1
    await clickWhenEnabled(/शुरू करें ·/);
    expect(seen).not.toContain(currentTarget());
    await click(screen.getByRole('button', { name: 'सही' }));
    await act(async () => void vi.advanceTimersByTime(31_000));
    await clickWhenEnabled(/परिणाम देखें/);

    expect(screen.getByText('मुकाबला बराबरी पर!')).toBeInTheDocument();
    const pts = [...document.querySelectorAll('.standing .pts')].map((e) => e.textContent);
    expect(pts).toEqual(['1', '1']);
  });
});

describe('persistence', () => {
  it('stores and restores a game through IndexedDB', async () => {
    const repo = new Repository(createIdbStore(), KNOWN_CARD_IDS);
    const { createGame, DEFAULT_RULES } = await import('../../src/core');
    const { ALL_CARDS } = await import('../../src/content');
    const g = createGame({ teams: [{ name: 'अ', color: '#000' }, { name: 'ब', color: '#111' }], deckIds: ['jt1', 'jt2'], rules: DEFAULT_RULES }, ALL_CARDS, 5, 1000);
    await repo.saveGame(g);
    expect(await repo.loadGame()).toEqual(g);
    await repo.clearGame();
    expect(await repo.loadGame()).toBeNull();
  });

  it('discards corrupted saved data without crashing', async () => {
    const store = createMemoryStore();
    await store.set('game/current', { schemaVersion: 1, garbage: true });
    await store.set('prefs', { sound: 'loud', rules: { turnSeconds: -5 } });
    const repo = new Repository(store, KNOWN_CARD_IDS);
    expect(await repo.loadGame()).toBeNull();
    expect(await store.get('game/current')).toBeUndefined();
    const prefs = await repo.loadPrefs();
    expect(prefs.sound).toBe(true);
    expect(prefs.rules.turnSeconds).toBe(15);
  });
});
