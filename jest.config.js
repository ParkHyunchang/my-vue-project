module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['**/tests/unit/**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
