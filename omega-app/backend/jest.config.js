module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  moduleNameMapper: {
    '^../shared/(.*)$': '<rootDir>/../shared/$1'
  },
  setupFilesAfterEnv: [],
  testTimeout: 30000
};