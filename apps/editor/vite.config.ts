import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
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
