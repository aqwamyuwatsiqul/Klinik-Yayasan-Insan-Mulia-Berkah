import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite Production Config — Performance Optimized
 *
 * Strategi chunk splitting:
 *  react-vendor  — React + React-DOM (cache lama, jarang berubah)
 *  router-vendor — React Router
 *  query-vendor  — TanStack Query
 *  ui-vendor     — Lucide icons
 *  time-vendor   — dayjs + locale
 *  pdf-vendor    — jsPDF + html2canvas + dependensi (besar, lazy load)
 *  vendor        — semua node_modules lainnya
 *
 * Catatan: splitVendorChunkPlugin() TIDAK dipakai bersama manualChunks
 * karena menyebabkan circular chunk warning.
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api'    : { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },

  build: {
    target              : 'es2020',
    chunkSizeWarningLimit: 800,
    minify              : 'esbuild',

    rollupOptions: {
      output: {
        // Nama file deterministik dengan content hash untuk cache busting
        chunkFileNames : 'assets/[name]-[hash].js',
        entryFileNames : 'assets/[name]-[hash].js',
        assetFileNames : 'assets/[name]-[hash].[ext]',

        manualChunks(id) {
          // Hanya proses node_modules
          if (!id.includes('node_modules')) return;

          // ── PDF chunk (paling besar, hanya Laporan yang butuh) ──────────
          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('canvg') ||
            id.includes('rgbcolor') ||
            id.includes('stackblur') ||
            id.includes('dompurify') ||
            id.includes('core-js')   // dipakai jsPDF untuk polyfill
          ) return 'pdf-vendor';

          // ── React core — harus pisah dari vendor utama ──────────────────
          // Masukkan react, react-dom, react/jsx-runtime, scheduler
          // ke satu chunk. Jangan pisah react dan react-dom karena mereka
          // saling bergantung dan menyebabkan circular jika dipisah.
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'react-vendor';

          // ── TanStack Query ──────────────────────────────────────────────
          if (id.includes('@tanstack')) return 'query-vendor';

          // ── React Router ────────────────────────────────────────────────
          if (
            id.includes('react-router-dom') ||
            id.includes('react-router/') ||
            id.includes('@remix-run')
          ) return 'router-vendor';

          // ── Lucide icons ────────────────────────────────────────────────
          if (id.includes('lucide-react')) return 'ui-vendor';

          // ── dayjs ────────────────────────────────────────────────────────
          if (id.includes('dayjs')) return 'time-vendor';

          // ── Semua node_modules lain → vendor utama ──────────────────────
          return 'vendor';
        },
      },
    },
  },
});
