import { readdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import istanbul from 'vite-plugin-istanbul';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Regenerate countersManifest.js at every build/dev start so new images are
// automatically picked up without a manual script run.
function countersManifestPlugin() {
  return {
    name: 'counters-manifest',
    buildStart() {
      const countersDir = resolve(__dirname, 'public/counters');
      const manifestPath = resolve(__dirname, 'src/assets/countersManifest.js');
      const files = readdirSync(countersDir)
        .filter((f) => /\.(jpg|png)$/i.test(f))
        .sort();
      writeFileSync(manifestPath, `export default ${JSON.stringify(files)};\n`);
    },
  };
}

export default defineConfig({
  plugins: [
    countersManifestPlugin(),
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
