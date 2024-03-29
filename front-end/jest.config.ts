import type { Config } from '@jest/types';
// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    'd3': '<rootDir>/node_modules/d3/dist/d3.min.js',
    '^.+\\.(css|less)$': '<rootDir>/src/test/CSSStub.ts'
  },
  setupFilesAfterEnv: [
    "@testing-library/jest-dom/extend-expect"
  ],
  setupFiles: [
    '<rootDir>/src/setupTests.js'
  ]
};
export default config;