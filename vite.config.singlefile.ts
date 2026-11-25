/**
 * Single-file web build — everything (JS, CSS, fonts) inlined into one HTML so
 * the app can be opened from disk or shared as one attachment.
 *
 *   npx vite build --config vite.config.singlefile.ts
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  base: './',
  clearScreen: false,
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_'],
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      input: path.resolve(process.cwd(), 'standalone.html'),
      output: { inlineDynamicImports: true, manualChunks: undefined, entryFileNames: 'app.js' },
    },
  },
});
