import { expect, test } from '@playwright/test';

test.describe('PWA', () => {
  test('manifest is valid and icons are served', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifest = await (await request.get(href!)).json();
    expect(manifest.name).toBe('जिनदेखा — Jin-Dekha');
    expect(manifest.short_name).toBe('जिनदेखा');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      const res = await request.get('/' + icon.src);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }
  });

  test('works fully offline after the first visit', async ({ page, context }) => {
    await page.goto('/');
    // Wait until the service worker controls the page and has precached the app.
    // The worker installs and precaches on the first visit; it controls pages from the next load
    // (registerType 'prompt' deliberately avoids taking over a page mid-game).
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await expect.poll(async () => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'जिनदेखा' })).toBeVisible();
    await expect(page.getByText('ऑफ़लाइन — खेल चालू रहेगा')).toBeVisible();
    await page.getByRole('button', { name: 'नया खेल' }).click();
    await page.getByRole('button', { name: 'खेल शुरू करें' }).click();
    await page.getByRole('button', { name: /शुरू करें/ }).click();
    await expect(page.locator('.word-card .target h2')).not.toBeEmpty();
    await page.getByRole('button', { name: 'सही' }).click();
    await expect(page.locator('.score-pill')).toContainText('+1');
    // Fonts came from the cache too.
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => [...document.fonts].some((f) => f.family.includes('Baloo 2') && f.status === 'loaded'));
    expect(loaded).toBe(true);
    await context.setOffline(false);
  });
});
