import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replit-friendly config: binds to 0.0.0.0:3000 and routes HMR through the
// HTTPS proxy when running inside a Repl.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/grade7-exam-master/' : '/',
  plugins: [react()],
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
