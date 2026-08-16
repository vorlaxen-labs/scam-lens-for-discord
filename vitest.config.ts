import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/services/**/*.ts',
        'src/shared/**/*.ts',
      ],
      exclude: [
        'src/shared/types/**',
      ],
    },
  },
});
