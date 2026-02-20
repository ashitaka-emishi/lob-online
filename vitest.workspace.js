import { defineWorkspace } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineWorkspace([
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
]);
