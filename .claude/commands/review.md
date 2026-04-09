Perform a thorough code review of the current changes. Follow this sequence:

1. Run `git diff HEAD` to identify what has changed. If there are staged changes, also check `git diff --staged`.

2. For each changed file, verify the checklist from `CLAUDE.md`:
   - TypeScript strict — no new `any`, types correct throughout
   - Tests added or updated for all changed behavior
   - No hardcoded secrets, credentials, or tokens
   - Firestore rules updated if data model changed
   - No silent error swallowing (`catch` blocks must handle or rethrow)
   - Functions < 50 lines, files < 800 lines
   - Immutable patterns — no direct object/array mutation

3. Check for behavioral regressions: does the change preserve existing contracts in `functions/src/shared/`?

4. Flag any security-sensitive changes (auth, Firestore rules, environment variables, external API calls) with SECURITY label.

5. Report findings in this format:
   - **BLOCK** — must fix before merge (correctness, security, data integrity)
   - **WARN** — should fix (quality, test coverage gap, silent failure risk)
   - **NOTE** — optional improvement

If no issues found, output: `PASS — ready to merge`.
