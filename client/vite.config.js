import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  plugins: [
    vue(),
    ...(process.env.CYPRESS_COVERAGE === 'true'
      ? [
          istanbul({
            include: ['src/**/*'],
            exclude: ['node_modules', 'cypress/'],
            extension: ['.js', '.vue'],
          }),
        ]
      : []),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/tools/map-editor/assets': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
