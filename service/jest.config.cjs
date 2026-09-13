module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/test/integration/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.ts$': '<rootDir>/jest.ts-transformer.cjs',
  },
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/tests/**',
    '!src/**/*.d.ts',
    '!src/db/schema/**',
    '!src/index.ts',
    // Declarations and generated documentation, not behaviour worth asserting on.
    '!src/types.ts',
    '!src/db/schema.ts',
    '!src/swagger/**',
  ],
  // The route wiring suite loads every router, and with it the whole controller/service graph.
  // Babel instrumentation of that graph segfaults intermittently, so measure coverage with V8.
  coverageProvider: 'v8',
  coverageReporters: ['text-summary', 'json-summary', 'lcov'],
  coverageDirectory: 'coverage',
  // Set just under the measured numbers so an ordinary change cannot quietly erode coverage.
  coverageThreshold: {
    global: {
      statements: 78,
      lines: 78,
      branches: 77,
      functions: 70,
    },
  },
};
