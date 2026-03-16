import { defineConfig } from 'cypress';
import codeCoverage from '@cypress/code-coverage/task.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      codeCoverage(on, config);

      on('task', {
        listBackups(prefix = 'map-') {
          const dir = join(__dirname, 'data/scenarios/south-mountain/backups');
          try {
            return readdirSync(dir).filter((f) => f.startsWith(prefix));
          } catch (_) {
            return [];
          }
        },
      });

      return config;
    },
  },
});
