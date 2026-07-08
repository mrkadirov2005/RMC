module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.ts$': '<rootDir>/jest.ts-transformer.cjs',
  },
  clearMocks: true,
  restoreMocks: true,
};
