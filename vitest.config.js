import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/src/**/*.js', 'client/src/**/*.{js,vue}'],
      exclude: [
        '**/*.test.js',
        'server/src/server.js',
        'client/src/main.js',
        'client/src/App.vue',
        'server/src/schemas/leaders.schema.js',
        'server/src/schemas/oob.schema.js',
        'server/src/schemas/scenario.schema.js',
      ],
      thresholds: {
        lines: 70,
      },
    },
  },
});
