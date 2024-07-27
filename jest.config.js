/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  testMatch: ["**/__tests__/**/*.spec.ts", "**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/index.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testEnvironment: "node",
  preset: "ts-jest",
};
