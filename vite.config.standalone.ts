/**
 * Standalone (hostable) web build.
 *
 *   npm run build:web   →  dist-web/  with index.html as the entry
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

/**
 * Serve standalone.html for / during dev, then rename it to index.html after
 * the build finishes.
 *
 * The rename has to happen in `closeBundle`, not `generateBundle`: Vite's own
 * html plugin re-emits the processed HTML *after* the generateBundle hooks of
 * user plugins have run, so renaming there is silently undone. Doing it on
 * disk once the bundle is closed is deterministic.
 */
function standaloneEntry(): Plugin {
  const outDir = path.resolve(process.cwd(), 'dist-web');
  return {
    name: 'studysentry-standalone-entry',
    configureServer(server) {
      // Dev: any request to / renders the standalone entry.
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') req.url = '/standalone.html';
        next();
      });
    },
    closeBundle() {
      const built = path.join(outDir, 'standalone.html');
      const root = path.join(outDir, 'index.html');
      if (fs.existsSync(built)) {
        fs.copyFileSync(built, root);
        fs.unlinkSync(built);
        // eslint-disable-next-line no-console
        console.log('\n  ✓ dist-web/index.html created from standalone.html');
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
