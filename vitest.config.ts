import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.spec.{ts,tsx}', 'apps/**/*.spec.{ts,tsx}']
  }
});
