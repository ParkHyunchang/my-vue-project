module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/network-isolation.cjs'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['**/tests/unit/**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
