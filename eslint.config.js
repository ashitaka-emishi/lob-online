import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import pluginN from 'eslint-plugin-n';
import pluginImport from 'eslint-plugin-import';
import configPrettier from 'eslint-config-prettier';

export default [
  // Global ignores
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'docs/**', 'coverage/**'],
  },

  // Base JS rules — all files
  js.configs.recommended,

  // Server — Node.js rules
  {
    files: ['server/src/**/*.js'],
    plugins: { n: pluginN, import: pluginImport },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      ...pluginN.configs['flat/recommended'].rules,
      'n/no-missing-import': 'error',
      'n/no-extraneous-import': 'error',
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal'],
          'newlines-between': 'always',
        },
      ],
    },
  },

  // Client — Vue 3 rules (applies to .vue files via plugin processor)
  ...pluginVue.configs['flat/vue3-recommended'],

  // Client — additional JS/Vue overrides scoped to client/src
  {
    files: ['client/src/**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Prettier — must be last; disables all formatting rules
  configPrettier,
];
