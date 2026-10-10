import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function axe(page: Page, label: string) {
  await page.waitForTimeout(1400); // let entrance animations settle
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('.floating-words').analyze();
  expect(violations.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
}

test('dark mode follows the device and can be overridden both ways', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'जिनदेखा' })).toBeVisible();
  await expect.poll(() => bg(page)).toBe('rgb(26, 18, 16)');
  await page.getByRole('button', { name: 'लाइट मोड चालू करें' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => bg(page)).toBe('rgb(251, 244, 230)');
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'फ़ोन जैसा' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  await expect.poll(() => bg(page)).toBe('rgb(26, 18, 16)');
  await ctx.close();
});

test('the interface switches to English and back; cards stay as printed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByRole('heading', { name: 'Game setup' })).toBeVisible();
  await expect(page.getByLabel('Team name 1')).toHaveValue('Saffron');
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: /Start · 60 seconds/ }).click();
  await expect(page.getByText('Forbidden words')).toBeVisible();
  await expect(page.locator('.word-card .target h2')).toHaveText(/[ऀ-ॿ]/);
  await page.getByRole('button', { name: 'Correct' }).click();
  await expect(page.locator('.score-pill')).toContainText('Turn +1');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'हिन्दी में देखें' }).click();
  await expect(page.getByRole('button', { name: 'खेल जारी रखें' })).toBeVisible();
});

test('settings switches render as compact pills', async ({ page }) => {
  await page.goto('/#/settings');
  const box = await page.locator('.switch').first().boundingBox();
  expect(box!.width).toBeLessThanOrEqual(56);
  expect(box!.height).toBeLessThanOrEqual(34);
});

test('no WCAG A/AA violations in dark mode and in English', async ({ browser }) => {
  for (const scheme of ['dark', 'light'] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.clock.install();
    await page.goto('/');
    if (scheme === 'light') await page.getByRole('button', { name: 'Switch to English' }).click();
    await axe(page, `${scheme} home`);
    await page.goto('/#/settings');
    await axe(page, `${scheme} settings`);
    await page.goto('/#/setup');
    await axe(page, `${scheme} setup`);
    await page.locator('.sticky-bottom .btn').click();
    await axe(page, `${scheme} ready`);
    await page.locator('.big-start').click();
    await axe(page, `${scheme} play`);
    await page.locator('.action.correct').click();
    await page.clock.runFor(61_000);
    await axe(page, `${scheme} review`);
    await ctx.close();
  }
});
