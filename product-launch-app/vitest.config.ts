import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // The repository layer imports 'server-only', which throws under
      // Vitest. Stub it out for tests.
      'server-only': path.resolve(__dirname, './tests/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['./tests/db-test-helper.ts'],
  },
})
