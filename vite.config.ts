/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { viteSingleFile } from 'vite-plugin-singlefile';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// `--mode preview-file` builds one self-contained HTML file (no service worker) for sharing a playable preview.
export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: mode === 'preview-file' ? './' : '/',
  build: mode === 'preview-file' ? { outDir: 'dist-preview', assetsInlineLimit: 100_000_000 } : undefined,
  plugins: [
    react(),
    mode === 'preview-file' && viteSingleFile(),
    VitePWA({
      disable: mode === 'preview-file',
      // The app shows its own "update available" prompt instead of reloading under players mid-game.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'जिनदेखा — Jin-Dekha',
        short_name: 'जिनदेखा',
        description: 'जिनदेखा, तिन पाइयाँ — जैन शब्दों का टीम खेल। A Jain word-guessing party game.',
        lang: 'hi',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FBF4E6',
        theme_color: '#7A1F2B',
        categories: ['games', 'education', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // The music file is large, so it is cached the first time it is fetched rather than at install.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'jindekha-audio',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 2 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
  },
}));
