#!/usr/bin/env node
// Renders the original Jin-Dekha mark to PNG app icons using the Playwright Chromium already used for E2E tests.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/icons');
mkdirSync(out, { recursive: true });

// Mark geometry mirrors src/ui/Logo.tsx. `scale` keeps maskable icons inside the safe zone.
const mark = (scale) => `
  <g transform="translate(60 60) scale(${scale}) translate(-60 -60)">
    <rect x="24" y="14" width="66" height="86" rx="12" fill="#E07B17" transform="rotate(-10 57 57)"/>
    <rect x="30" y="20" width="66" height="86" rx="12" fill="#FFFAF0" stroke="#3d0e15" stroke-width="3" transform="rotate(6 63 63)"/>
    <g transform="rotate(6 63 63)">
      <path d="M40 63c7-12 16-18 23-18s16 6 23 18c-7 12-16 18-23 18s-16-6-23-18z" fill="#7A1F2B"/>
      <circle cx="63" cy="63" r="10" fill="#FFFAF0"/>
      <circle cx="63" cy="63" r="5.5" fill="#E07B17"/>
      <path d="M44 92h38M50 99h26" stroke="#E07B17" stroke-width="4" stroke-linecap="round"/>
      <path d="M44 34h38" stroke="#7A1F2B" stroke-width="4" stroke-linecap="round" opacity=".35"/>
    </g>
  </g>`;

const svg = ({ maskable, rounded }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="75%">
      <stop offset="0" stop-color="#9b2c3b"/><stop offset="1" stop-color="#5e1520"/>
    </radialGradient>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="5" r="0.9" fill="#E07B17" opacity=".35"/>
    </pattern>
  </defs>
  <rect width="120" height="120" rx="${rounded ? 26 : 0}" fill="url(#bg)"/>
  <rect width="120" height="120" rx="${rounded ? 26 : 0}" fill="url(#dots)"/>
  ${mark(maskable ? 0.72 : 0.88)}
</svg>`;

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false, rounded: true },
  { file: 'icon-512.png', size: 512, maskable: false, rounded: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: true, rounded: false },
];

writeFileSync(resolve(root, 'public/favicon.svg'), svg({ maskable: false, rounded: true }));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(t).replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body></html>`);
  await page.screenshot({ path: resolve(out, t.file), omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log('icon:', t.file);
}
await browser.close();
