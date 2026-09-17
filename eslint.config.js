import js from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', SpeechSynthesisUtterance: 'readonly', Audio: 'readonly', URL: 'readonly', Blob: 'readonly', Float32Array: 'readonly', ArrayBuffer: 'readonly', DataView: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
];
