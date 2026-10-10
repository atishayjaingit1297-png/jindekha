import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const decks = JSON.parse(readFileSync(new URL('../../src/content/generated/decks.json', import.meta.url), 'utf8')) as {
  decks: { cards: { target: string; forbidden: string[] }[] }[];
};
const cardByTarget = new Map(decks.decks.flatMap((d) => d.cards).map((c) => [c.target, c]));

const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/screens/${test.info().project.name}-${name}.png` });

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function setupGame(page: Page, opts: { rounds: number }) {
  await page.goto('/');
  await page.getByRole('button', { name: 'नया खेल' }).click();
  await expect(page.getByRole('heading', { name: 'खेल की तैयारी' })).toBeVisible();
  await page.getByLabel('टीम का नाम 1').fill('पद्म');
  await page.getByLabel('टीम का नाम 2').fill('कमल');
  await page.getByRole('button', { name: '30s' }).click();
  const rounds = page.getByRole('group', { name: 'राउंड' });
  for (let i = 3; i > opts.rounds; i--) await rounds.getByRole('button', { name: /घटाएँ/ }).click();
  await noHorizontalScroll(page);
  await shot(page, '02-setup');
  await page.getByRole('button', { name: 'खेल शुरू करें' }).click();
}

/** Asserts the card on screen is real deck data with all its forbidden words, then returns its target. */
async function currentCard(page: Page) {
  const target = (await page.locator('.word-card .target h2').textContent())!.trim();
  const card = cardByTarget.get(target);
  expect(card, `"${target}" should be a card from the PDFs`).toBeTruthy();
  await expect(page.locator('.word-card .forbidden li')).toHaveText(card!.forbidden);
  return target;
}

test('home renders brand in Devanagari with real fonts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'जिनदेखा' })).toBeVisible();
  await expect(page.getByText('जिनदेखा, तिन पाइयाँ')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
  expect(fonts).toContain('Baloo 2');
  expect(fonts).toContain('Mukta');
  await noHorizontalScroll(page);
  await shot(page, '01-home');
});

test('a complete two-team game with correct, skip, violation, review edit and results', async ({ page }) => {
  await page.clock.install();
  await setupGame(page, { rounds: 1 });

  // Turn 1 — पद्म
  await expect(page.getByText('पद्म', { exact: true })).toBeVisible();
  await shot(page, '03-ready');
  await page.getByRole('button', { name: /शुरू करें/ }).click();
  const seen = new Set<string>();
  seen.add(await currentCard(page));
  await shot(page, '04-play');
  await page.getByRole('button', { name: 'सही' }).click();
  seen.add(await currentCard(page));
  await page.getByRole('button', { name: 'सही' }).click();
  seen.add(await currentCard(page));
  await page.getByRole('button', { name: 'छोड़ें' }).click();
  seen.add(await currentCard(page));
  await page.getByRole('button', { name: 'मना शब्द' }).click();
  seen.add(await currentCard(page));
  expect(seen.size).toBe(5); // no card repeats
  await expect(page.locator('.score-pill')).toContainText('+1'); // 2 correct − 1 violation
  await noHorizontalScroll(page);

  await page.clock.runFor(31_000);
  await expect(page.getByRole('heading', { name: 'समय समाप्त!' })).toBeVisible();
  await expect(page.locator('.result-item')).toHaveCount(5);
  await expect(page.locator('.turn-total')).toContainText('+1');
  await shot(page, '05-review');
  // Fix a mis-tap: the skipped card (3rd) was actually guessed.
  const third = page.locator('.result-item').nth(2);
  await expect(third.getByRole('radio', { name: 'छोड़ा' })).toHaveAttribute('aria-checked', 'true');
  await third.getByRole('radio', { name: 'सही' }).click();
  await expect(third.getByRole('radio', { name: 'सही' })).toHaveAttribute('aria-checked', 'true');
  // Only the card on screen at time-up can be marked "time up".
  await expect(third.getByRole('radio', { name: 'समय गया' })).toHaveCount(0);
  await expect(page.locator('.result-item').nth(4).getByRole('radio', { name: 'समय गया' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.turn-total')).toContainText('+2');
  await page.getByRole('button', { name: /अगली बारी/ }).click();

  // Turn 2 — कमल
  await expect(page.locator('.team-hero')).toHaveText('कमल');
  await page.getByRole('button', { name: /शुरू करें/ }).click();
  expect(seen.has(await currentCard(page))).toBe(false);
  await page.getByRole('button', { name: 'सही' }).click();
  await page.clock.runFor(31_000);
  await expect(page.locator('.result-item')).toHaveCount(2);
  await page.getByRole('button', { name: /परिणाम देखें/ }).click();

  // Results
  await expect(page.locator('.winner h1')).toHaveText('पद्म');
  const rows = page.locator('.standing');
  await expect(rows.nth(0)).toContainText('पद्म');
  await expect(rows.nth(0).locator('.pts')).toHaveText('2');
  await expect(rows.nth(1).locator('.pts')).toHaveText('1');
  await noHorizontalScroll(page);
  await shot(page, '06-results');

  // Rematch keeps teams, resets score
  await page.getByRole('button', { name: 'फिर से खेलें' }).click();
  await expect(page.locator('.team-hero')).toHaveText('पद्म');
  await expect(page.locator('.score-pill')).toHaveText('0 अंक');
});

test('timer keeps counting from the deadline and pause freezes it', async ({ page }) => {
  await page.clock.install();
  await setupGame(page, { rounds: 1 });
  await page.getByRole('button', { name: /शुरू करें/ }).click();
  await page.clock.runFor(10_000);
  await expect(page.locator('.timer .digits')).toHaveText('0:20');
  await page.getByRole('button', { name: 'रोकें' }).click();
  await expect(page.getByRole('heading', { name: 'खेल रुका है' })).toBeVisible();
  await expect(page.locator('.word-card')).toHaveCount(0); // card hidden while paused
  await shot(page, '07-paused');
  // Opening and closing the scoreboard with Escape must not resume the turn.
  await page.getByRole('button', { name: 'स्कोरबोर्ड' }).click();
  await expect(page.getByRole('dialog', { name: 'स्कोरबोर्ड' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'स्कोरबोर्ड' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'खेल रुका है' })).toBeVisible();
  await page.clock.runFor(60_000);
  await page.getByRole('button', { name: 'जारी रखें' }).click();
  await expect(page.locator('.timer .digits')).toHaveText('0:20');
  await page.clock.runFor(5_000);
  await expect(page.locator('.timer .digits')).toHaveText('0:15');
});

test('switching away from the app pauses a running turn', async ({ page }) => {
  await page.clock.install();
  await setupGame(page, { rounds: 1 });
  await page.getByRole('button', { name: /शुरू करें/ }).click();
  await page.clock.runFor(5_000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(120_000); // phone locked for two minutes
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading', { name: 'खेल रुका है' })).toBeVisible();
  await expect(page.getByRole('dialog').locator('.digits')).toHaveText('0:25');
});

test('round summary appears between rounds and scoreboard opens', async ({ page }) => {
  await page.clock.install();
  await setupGame(page, { rounds: 2 });
  for (let t = 0; t < 2; t++) {
    await page.getByRole('button', { name: /शुरू करें/ }).click();
    await page.getByRole('button', { name: 'सही' }).click();
    await page.clock.runFor(31_000);
    await page.locator('.sticky-bottom .btn').click();
  }
  await expect(page.getByRole('heading', { name: 'राउंड 1 पूरा' })).toBeVisible();
  await shot(page, '08-round-summary');
  await page.getByRole('button', { name: 'अगला राउंड' }).click();
  await page.getByRole('button', { name: 'स्कोरबोर्ड' }).click();
  await expect(page.getByRole('dialog', { name: 'स्कोरबोर्ड' })).toBeVisible();
  await expect(page.locator('.history-turn')).toHaveCount(2);
  await shot(page, '09-scoreboard');
});

test('an unfinished game survives a reload and resumes paused', async ({ page }) => {
  await setupGame(page, { rounds: 1 });
  await page.getByRole('button', { name: /शुरू करें/ }).click();
  const first = await currentCard(page);
  await page.getByRole('button', { name: 'सही' }).click();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'खेल रुका है' })).toBeVisible();
  await page.getByRole('button', { name: 'जारी रखें' }).click();
  await expect(page.locator('.score-pill')).toContainText('+1');
  expect(await currentCard(page)).not.toBe(first);

  // From home, the saved game is offered.
  await page.goto('/');
  await expect(page.getByRole('button', { name: /खेल जारी रखें/ })).toBeVisible();
});

test('every secondary screen is reachable and returns home', async ({ page }) => {
  await page.goto('/');
  for (const [button, heading] of [
    ['कैसे खेलें', 'कैसे खेलें'],
    ['सेटिंग्स', 'सेटिंग्स'],
    ['कार्ड-संग्रह', 'कार्ड-संग्रह'],
  ] as const) {
    await page.getByRole('button', { name: button }).click();
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await noHorizontalScroll(page);
    await shot(page, `10-${button}`);
    await page.getByRole('button', { name: 'वापस' }).click();
    await expect(page.getByRole('heading', { name: 'जिनदेखा' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'कार्ड-संग्रह' }).click();
  await expect(page.getByText('कुल 94 कार्ड')).toBeVisible();
});

test('settings persist across reloads', async ({ page }) => {
  await page.goto('/#/settings');
  const large = page.getByRole('switch', { name: 'बड़े अक्षर' });
  await large.check();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.getByRole('switch', { name: 'बड़े अक्षर' })).toBeChecked();
});

test('quick game: one team, one turn, straight to the score', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /झटपट खेल/ }).click();
  await expect(page.locator('.team-hero')).toHaveText('मेरी टीम');
  await expect(page.getByText('बारी 1/1')).toBeVisible();
  await page.getByRole('button', { name: /शुरू करें ·/ }).click();
  await currentCard(page);
  await page.getByRole('button', { name: 'सही' }).click();
  await page.getByRole('button', { name: 'सही' }).click();
  await page.clock.runFor(61_000);
  await page.getByRole('button', { name: /परिणाम देखें/ }).click();
  await expect(page.getByText('आपका स्कोर')).toBeVisible();
  await expect(page.locator('.winner h1')).toHaveText('मेरी टीम');
  await expect(page.locator('.winner')).toContainText('2 अंक');
  await expect(page.locator('.standing')).toHaveCount(0);
  await shot(page, '11-quick-result');
});

test('setup allows playing with a single team', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/setup');
  await page.getByRole('button', { name: /टीम हटाएँ/ }).last().click();
  await expect(page.getByLabel('टीम का नाम 1')).toBeVisible();
  await expect(page.getByLabel('टीम का नाम 2')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /टीम हटाएँ/ })).toHaveCount(0);
  await expect(page.getByText('एक ही टीम रखें')).toBeVisible();
  await page.getByRole('button', { name: 'खेल शुरू करें' }).click();
  await expect(page.getByText('बारी 1/1')).toBeVisible();
});
