import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@rhypdf/pdf-model': path.resolve(__dirname, 'packages/pdf-model/src/index.ts'),
      '@rhypdf/pdf-engine': path.resolve(__dirname, 'packages/pdf-engine/src/index.ts'),
      '@rhypdf/text-layout': path.resolve(__dirname, 'packages/text-layout/src/index.ts'),
      '@rhypdf/fonts': path.resolve(__dirname, 'packages/fonts/src/index.ts'),
      '@rhypdf/ocr': path.resolve(__dirname, 'packages/ocr/src/index.ts'),
      '@rhypdf/edit-core': path.resolve(__dirname, 'packages/edit-core/src/index.ts'),
      '@rhypdf/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
      '@rhypdf/i18n': path.resolve(__dirname, 'packages/i18n/src/index.ts'),
      '@rhypdf/test-fixtures': path.resolve(__dirname, 'packages/test-fixtures/src/index.ts')
    }
  },
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.spec.{ts,tsx}', 'apps/**/*.spec.{ts,tsx}']
  }
});
