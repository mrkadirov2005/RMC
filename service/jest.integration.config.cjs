module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.test.js'],
  setupFiles: ['<rootDir>/test/integration/test.env.js', '<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/test/integration/globalSetup.js',
  transform: {
    '^.+\\.ts$': '<rootDir>/jest.ts-transformer.cjs',
  },
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: 1,
};
