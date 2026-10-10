import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function audit(page: Page, label: string) {
  // Let entry animations finish so colours are measured at full opacity.
  await page.waitForTimeout(1500);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('.floating-words').analyze();
  const summary = violations.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
  expect(summary).toEqual([]);
}

test('core screens have no WCAG A/AA violations', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'जिनदेखा' })).toBeVisible();
  await audit(page, 'home');
  await page.getByRole('button', { name: 'नया खेल' }).click();
  await audit(page, 'setup');
  await page.getByRole('button', { name: 'खेल शुरू करें' }).click();
  await audit(page, 'ready');
  await page.getByRole('button', { name: /शुरू करें ·/ }).click();
  await audit(page, 'play');
  await page.getByRole('button', { name: 'सही' }).click();
  await page.clock.runFor(61_000);
  await audit(page, 'review');
  await page.goto('/#/rules');
  await audit(page, 'rules');
  await page.goto('/#/settings');
  await audit(page, 'settings');
});
