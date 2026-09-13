import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/tests/**/*.test.ts', 'src/**/tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      // Page components are exercised end to end by the Playwright workflows, so unit coverage
      // is measured over the logic modules those pages call into.
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/tests/**',
        'src/**/*.d.ts',
        'src/test/**',
        'src/types/**',
        'src/**/types.ts',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
