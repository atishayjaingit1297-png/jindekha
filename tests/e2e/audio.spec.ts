import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Records play/pause calls on <audio> elements so tests can follow the background music.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __music: { el: HTMLMediaElement | null; log: string[] } };
    w.__music = { el: null, log: [] };
    const play = HTMLMediaElement.prototype.play;
    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__music.el = this;
      w.__music.log.push('play');
      return play.call(this);
    };
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      w.__music.log.push('pause');
      return pause.call(this);
    };
  });
});

const music = (page: Page) =>
  page.evaluate(() => {
    const m = (window as unknown as { __music: { el: HTMLMediaElement | null; log: string[] } }).__music;
    return { playing: !!m.el && !m.el.paused, time: m.el?.currentTime ?? 0, src: m.el?.src ?? '', log: m.log.join(',') };
  });

test('background music plays on home, stops during a game and resumes where it left off', async ({ page }) => {
  await page.goto('/');
  await page.locator('body').click({ position: { x: 5, y: 5 } }); // a first gesture, as browsers require
  await expect.poll(async () => (await music(page)).playing, { timeout: 10_000 }).toBe(true);
  expect((await music(page)).src).toContain('/audio/background.mp3');
  await expect.poll(async () => (await music(page)).time, { timeout: 10_000 }).toBeGreaterThan(1);

  await page.getByRole('button', { name: /झटपट खेल/ }).click();
  await expect.poll(async () => (await music(page)).playing, { timeout: 5_000 }).toBe(false);
  const stoppedAt = (await music(page)).time;
  await page.waitForTimeout(1500);
  expect((await music(page)).time).toBeCloseTo(stoppedAt, 1); // really paused, not just muted

  await page.getByRole('button', { name: /शुरू करें ·/ }).click();
  await page.getByRole('button', { name: 'रोकें' }).click();
  await page.getByRole('button', { name: 'खेल खत्म करें' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'खेल खत्म करें' }).click();
  await expect(page.getByText('आपका स्कोर')).toBeVisible();
  await expect.poll(async () => (await music(page)).playing, { timeout: 5_000 }).toBe(true);
  expect((await music(page)).time).toBeGreaterThanOrEqual(stoppedAt);
});

test('music can be switched off from the home screen and stays off', async ({ page }) => {
  await page.goto('/');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect.poll(async () => (await music(page)).playing, { timeout: 10_000 }).toBe(true);
  await page.getByRole('button', { name: 'संगीत बंद करें' }).click();
  await expect.poll(async () => (await music(page)).playing, { timeout: 5_000 }).toBe(false);
  await page.waitForTimeout(300);
  await page.reload();
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(1500);
  expect((await music(page)).playing).toBe(false);
  await expect(page.getByRole('button', { name: 'संगीत चालू करें' })).toBeVisible();
});

test('sound and vibration can be switched off during a game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /झटपट खेल/ }).click();
  const sound = page.getByRole('button', { name: 'आवाज़' });
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /शुरू करें ·/ }).click();
  await page.getByRole('button', { name: 'रोकें' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'आवाज़' })).toHaveAttribute('aria-pressed', 'false');
  await dialog.getByRole('button', { name: 'कंपन' }).click();
  await expect(dialog.getByRole('button', { name: 'कंपन' })).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/#/settings');
  await expect(page.getByRole('switch', { name: 'बटन और खेल की आवाज़ें' })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: /कंपन/ })).not.toBeChecked();
});
