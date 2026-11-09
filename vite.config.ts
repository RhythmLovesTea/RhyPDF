import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    target: 'esnext',
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
    exclude: ['@embedpdf/pdfium', 'harfbuzzjs'],
  },
  worker: {
    format: 'es',
  },
});
