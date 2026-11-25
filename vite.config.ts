import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'studysentry-data.json');

/**
 * Local dev preview storage fallback when running `npm run dev` in a browser
 * outside the Tauri Rust runtime. Inside Tauri v2 on Windows 11, all persistence
 * goes directly to the native Rust + SQLite (WAL mode) engine.
 */
function localDevStoragePlugin(): Plugin {
  return {
    name: 'studysentry-local-dev-storage',
    configureServer(server) {
      fs.mkdirSync(DATA_DIR, { recursive: true });

      server.middlewares.use('/api/state', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(DATA_FILE)) {
              res.end(JSON.stringify({ ok: true, state: null, dbPath: DATA_FILE }));
              return;
            }
            const state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            res.end(JSON.stringify({ ok: true, state, dbPath: DATA_FILE }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
          return;
        }

        if (req.method === 'POST') {
          // Collect the body as BUFFERS and decode once at the end.
          // Decoding each chunk separately (body += chunk) tears any multi-byte
          // character that straddles a chunk boundary into U+FFFD, which used to
          // corrupt Bengali chapter names such as "ভৌত জগৎ ও পরিমাপ".
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
              const payload = parsed?.state ?? parsed;
              const tmp = `${DATA_FILE}.tmp`;
              fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
              fs.renameSync(tmp, DATA_FILE);
              res.end(JSON.stringify({ ok: true, dbPath: DATA_FILE }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }

        next();
      });

      server.middlewares.use('/api/export_csv', (_req, res) => {
        try {
          const state = fs.existsSync(DATA_FILE)
            ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
            : { sessions: [] };
          const sessions = state.sessions || [];
          const header =
            'Date,Subject,Mode,Started At,Ended At,Duration (Minutes),Duration (Seconds),Notes\n';
          const rows = sessions
            .slice()
            .reverse()
            .map((s: Record<string, unknown>) => {
              const mins = ((Number(s.durationSec) || 0) / 60).toFixed(2);
              const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
              return [
                esc(s.dateKey),
                esc(s.subjectName),
                esc(s.mode),
                esc(s.startedAt),
                esc(s.endedAt),
                mins,
                Number(s.durationSec) || 0,
                esc(s.notes),
              ].join(',');
            })
            .join('\n');

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="StudySentry_Sessions.csv"'
          );
          res.end('\uFEFF' + header + rows);
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err));
        }
      });
    },
  };
}

const host = process.env.TAURI_DEV_HOST || '0.0.0.0';

export default defineConfig({
  base: './',
  clearScreen: false,
  /**
   * Interaction latency fix.
   *
   * A navigation profile showed dev was spending ~175ms per click where the
   * same click in the production bundle cost ~69ms. The gap was not the app:
   * `exports.jsxDEV` alone burned 70ms, because Vite compiles JSX to the
   * development runtime in dev, which validates every prop of every element
   * and stamps each node with `__source`/`__self`. The style engine then has
   * extra attributes to diff on each re-render.
   *
   * `jsxDev: false` compiles JSX to the production runtime in dev too. React
   * Refresh keeps working (it is a Babel transform, independent of the JSX
   * runtime), HMR is unaffected, and the dev server now behaves like the app
   * people actually run.
   */
  esbuild: {
    jsxDev: false,
  },
  plugins: [react(), tailwindcss(), localDevStoragePlugin()],
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  server: {
    host,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome118' : 'es2022',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    assetsInlineLimit: 131072,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['motion'],
          'vendor-icons': ['lucide-react'],
          'vendor-tauri': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-notification',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-opener',
          ],
        },
      },
    },
  },
});
