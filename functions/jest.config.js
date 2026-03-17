/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/src/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            diagnostics: false,
            tsconfig: {
                noUnusedLocals: false,
                noImplicitReturns: false,
            },
        }],
    },
};
