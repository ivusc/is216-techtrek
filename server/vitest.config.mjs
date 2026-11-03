import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./__tests__/setup/global-setup.js'],
    setupFiles: ['./__tests__/setup/database.js'],
  },
});
