Analyze test coverage for the current changes and surface gaps.

1. Run `git diff HEAD --name-only` to identify changed source files.

2. For each changed source file, find its corresponding test file:
   - `web/src/**` → `web/src/**/*.test.ts` or `web/src/**/*.test.tsx`
   - `functions/src/**` → `functions/src/__tests__/*.test.ts`
   - `ios/**/*.swift` → `ios/TheAdministrationTests/**/*.swift`

3. For each changed function or exported symbol, verify a test covers:
   - The happy path
   - At least one failure/error path
   - Edge cases for numeric bounds, empty inputs, and null/undefined

4. Run available tests to confirm they pass:
   ```bash
   cd web && pnpm test --run 2>&1 | tail -20
   cd functions && npx jest --passWithNoTests 2>&1 | tail -20
   ```

5. Report:
   - **MISSING** — changed behavior with no test coverage
   - **PARTIAL** — test exists but doesn't cover failure paths
   - **COVERED** — adequate coverage

If coverage is adequate, output: `QA PASS — coverage acceptable`.
