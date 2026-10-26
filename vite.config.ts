import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

/**
 * After build, copy index.html → 404.html so GitHub Pages serves the SPA
 * for deep links (hospital routes, refresh, direct URL open).
 */
function spaFallbackPlugin() {
  return {
    name: 'spa-github-pages-fallback',
    closeBundle() {
      const outDir = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
      const indexHtml = resolve(outDir, 'index.html');
      const notFound = resolve(outDir, '404.html');
      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, notFound);
      }
    },
  };
}

export default defineConfig({
  // GitHub Actions sets VITE_BASE_PATH=/Hail-Health-Cluster-Formulary/ for project Pages.
  // Local `npm run build` / `npm run preview` default to `/`.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), spaFallbackPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
