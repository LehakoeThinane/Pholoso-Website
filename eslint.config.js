import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/',
      'dist-live/',
      'dist-app/',
      'reference/',
      '.venv-audio/',
      '.astro/',
      'node_modules/',
      'test-results/',
      'playwright-report/',
      '.lighthouseci/',
    ],
  },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['public/**/*.js'],
    languageOptions: { globals: { window: 'readonly', document: 'readonly' } },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
];
