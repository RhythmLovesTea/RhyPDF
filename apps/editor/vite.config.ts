import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const PROD_SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

const DEV_SECURITY_HEADERS = {
  ...PROD_SECURITY_HEADERS,
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data: ws: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@rhypdf/pdf-model': path.resolve(__dirname, '../../packages/pdf-model/src/index.ts'),
      '@rhypdf/pdf-engine': path.resolve(__dirname, '../../packages/pdf-engine/src/index.ts'),
      '@rhypdf/text-layout': path.resolve(__dirname, '../../packages/text-layout/src/index.ts'),
      '@rhypdf/fonts': path.resolve(__dirname, '../../packages/fonts/src/index.ts'),
      '@rhypdf/ocr': path.resolve(__dirname, '../../packages/ocr/src/index.ts'),
      '@rhypdf/edit-core': path.resolve(__dirname, '../../packages/edit-core/src/index.ts'),
      '@rhypdf/ui/styles.css': path.resolve(__dirname, '../../packages/ui/src/styles.css'),
      '@rhypdf/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@rhypdf/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@rhypdf/test-fixtures': path.resolve(__dirname, '../../packages/test-fixtures/src/index.ts')
    }
  },
  server: {
    hmr: {
      overlay: false
    },
    headers: DEV_SECURITY_HEADERS
  },
  preview: {
    headers: PROD_SECURITY_HEADERS
  },
  worker: {
    format: 'es'
  },
  esbuild: {
    target: 'esnext'
  },
  build: {
    target: 'esnext'
  }
});
