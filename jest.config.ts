import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageReporters: ['text', 'cobertura'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
};

export default createJestConfig(config);