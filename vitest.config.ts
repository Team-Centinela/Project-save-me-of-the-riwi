import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/main.tsx', 'src/**/*.d.ts', 'src/test/**'],
      // Thresholds are intentionally kept off until the domain layer lands.
      // Turning them on with an empty scaffold only teaches the gate how to
      // negotiate with you.
      // thresholds: {
      //   lines: 80, functions: 80, branches: 80, statements: 80,
      //   'src/domain/**/*.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
      // },
    },
  },
});
