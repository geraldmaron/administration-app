Validate the current plan against actual project state.

1. Read `plan.md` at the workspace root. If it doesn't exist, output: `No plan.md found — nothing to check`.

2. For each item in the plan:
   - Check whether referenced files exist
   - Check whether described functionality is already implemented
   - Check whether any listed TODOs have been completed but not removed

3. Cross-reference with recent git history:
   ```bash
   git log --oneline -20
   ```

4. Report findings:
   - **STALE** — plan item describes work already completed in git history
   - **MISSING** — plan references a file or contract that doesn't exist yet
   - **ACTIVE** — plan item is in-progress or still accurate
   - **BLOCKED** — plan item has an unresolved dependency

5. If the plan has stale items, recommend specific removals or updates. Do not modify `plan.md` unless explicitly asked.
