import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Replit-friendly config: binds to 0.0.0.0:3000 and routes HMR through the
// HTTPS proxy when running inside a Repl.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/grade7-exam-master/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // PWAStatus.tsx registers the service worker itself via the React
      // useRegisterSW() hook — injecting the plugin's own registration
      // script too would register it twice.
      injectRegister: null,
      manifest: {
        name: 'Grade 7 ECZ Revision',
        short_name: 'G7 Revision',
        description: 'Grade 7 Zambia ECZ Composite Examination past-paper revision app',
        theme_color: '#1E7A46',
        background_color: '#F4F7F3',
        display: 'standalone',
        // Relative to the manifest's own URL, which already resolves
        // correctly under either base ("/" locally, "/grade7-exam-master/"
        // on GitHub Pages) — never hardcode a path here.
        start_url: '.',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell plus the JSON the app actually needs for
        // its core flows (practice/quiz/mock exam/flashcards/review all load
        // grade7_master_database.json via lib/database.ts's loadDatabase()).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // The five per-subject *_master.json copies (only fetched by the
        // Admin diagnostics page, not any core flow) and the 246 question
        // figure images are deliberately excluded from precache so the
        // first install doesn't have to download ~25MB up front on a slow
        // or low-end connection. Both are covered by runtimeCaching below.
        globIgnores: ['**/data/*_master.json', '**/data/assets/**'],
        // Workbox's default precache size limit is 2MB; the master database
        // is 1.7MB today — raise this as a safety margin for future growth.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Deliberately a *substring* match on pathname, not an anchored
            // prefix regex — this must stay correct under both the local
            // "/" base and the GitHub Pages "/grade7-exam-master/" base.
            // Do not "simplify" this into a ^/data/assets/ pattern.
            urlPattern: ({ url }) => url.pathname.includes('/data/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'question-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The per-subject JSON copies excluded from precache above —
            // diagnostics-only data, so slight staleness is harmless.
            urlPattern: ({ url }) => /_master\.json$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'subject-json',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // Replit serves the app through a *.replit.dev / *.repl.co proxy host.
    // Allow those (and any host) so Vite 5 doesn't return "host not allowed".
    allowedHosts: true,
    hmr: process.env.REPL_ID ? { clientPort: 443 } : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
