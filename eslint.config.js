import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/public/**',
      'apps/editor/public/**',
      'fixtures/**',
      'packages/test-fixtures/fixtures/**',
      'scripts/**',
      'src/**',
      '*.config.js',
      '*.config.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off'
    }
  }
);
