import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  test: {
    projects: [
      // Server-side tests — Node environment
      {
        test: {
          name: 'server',
          include: ['server/src/**/*.test.js'],
          environment: 'node',
          globals: true,
        },
      },
      // Client-side tests — jsdom environment
      {
        plugins: [vue()],
        test: {
          name: 'client',
          include: ['client/src/**/*.test.js'],
          environment: 'jsdom',
          globals: true,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/src/**/*.js', 'client/src/**/*.{js,vue}'],
      exclude: [
        '**/*.test.js',
        'server/src/server.js', // entry point; not unit-testable
        'client/src/main.js',
        'client/src/App.vue',
        'server/src/schemas/leaders.schema.js', // data-only schemas
        'server/src/schemas/oob.schema.js',
        'server/src/schemas/scenario.schema.js',
      ],
      thresholds: { lines: 70 }, // raise as engine matures
    },
  },
});
