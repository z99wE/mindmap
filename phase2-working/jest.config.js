module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  // 30s timeout for async tests that involve DB mocks
  testTimeout: 30000,
};
