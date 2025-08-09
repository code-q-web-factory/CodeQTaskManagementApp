/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', { rootMode: 'upward' }],
  },
  moduleNameMapper: {
    '^.+\\.(css|scss|sass)$': 'identity-obj-proxy',
    '^.+\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/test/fileMock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Exclude Playwright test suites from Jest
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/', '/tests-examples/'],
  extensionsToTreatAsEsm: [],
}


