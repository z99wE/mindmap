module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  // 30s timeout for async tests that involve DB mocks
  testTimeout: 30000,

  // Code coverage configuration
  collectCoverage: false, // Set true in CI via --coverage flag
  collectCoverageFrom: [
    'src/**/*.js',
    'features/**/*.js',
    '!src/frontend/**',
    '!src/pulsekit/channels/**', // Channel drivers require real API keys to test meaningfully
    '!node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 60,   // 60% branch coverage (realistic for a multi-provider routing system)
      functions: 70,  // 70% function coverage
      lines: 70,      // 70% line coverage
      statements: 70,
    },
    // Core modules need higher coverage
    'src/auth.js': {
      branches: 80,
      functions: 85,
      lines: 85,
    },
    'src/middleware*.js': {
      branches: 80,
      functions: 85,
      lines: 85,
    },
    'src/crypto.js': {
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
};
