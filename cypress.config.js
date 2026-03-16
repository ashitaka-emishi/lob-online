import { defineConfig } from 'cypress';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on) {
      on('task', {
        listBackups() {
          const dir = join(__dirname, 'data/scenarios/south-mountain/backups');
          try {
            return readdirSync(dir).filter((f) => f.startsWith('map-'));
          } catch (_) {
            return [];
          }
        },
      });
    },
  },
});
