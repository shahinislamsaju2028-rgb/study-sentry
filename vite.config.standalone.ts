/**
 * Standalone (hostable) web build.
 *
 *   npm run build:web   →  dist-web/
 *
 * Differences from the Tauri build:
 *   • entry is `standalone.html` (which boots src/standalone-entry.tsx and sets
 *     window.__STUDYSENTRY_STANDALONE_PREVIEW__ so the data layer uses
 *     localStorage instead of /api/state — there is no dev middleware);
 *   • output is a plain static folder that runs on any host (GitHub Pages,
 *     Netlify, Vercel, Cloudflare Pages, Firebase Hosting, or even file://);
 *   • no Tauri-specific env assumptions.
 *
 * The desktop NSIS bundle is unaffected — it keeps using vite.config.ts.
 */
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

/** Serve standalone.html for / during dev and emit it as index.html on build. */
function standaloneEntry(): Plugin {
  return {
    name: 'studysentry-standalone-entry',
    configureServer(server) {
      // Dev: any request to / renders the standalone entry.
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') req.url = '/standalone.html';
        next();
      });
    },
    generateBundle(_opts, bundle) {
      // Build: standalone.html becomes index.html at the site root.
      const html = bundle['standalone.html'];
      if (html && html.type === 'asset') {
        bundle['index.html'] = { ...html, fileName: 'index.html' };
        delete bundle['standalone.html'];
      }
    },
    closeBundle() {
      // Make sure static assets that live in public/ (icons, favicon) end up
      // beside index.html even for hosts that only serve that one file.
      const out = path.resolve(process.cwd(), 'dist-web');
      if (fs.existsSync(out)) {
        // no-op placeholder — keeps the hook honest if future post-processing is needed
      }
    },
  };
}

export default defineConfig({
  base: './',
  clearScreen: false,
  plugins: [react(), tailwindcss(), standaloneEntry()],
  envPrefix: ['VITE_'],
  server: { host: '0.0.0.0', port: 5174, strictPort: true, allowedHosts: true },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    target: 'es2022',
    minify: 'esbuild',
    assetsInlineLimit: 131072,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: path.resolve(process.cwd(), 'standalone.html'),
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['motion'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
