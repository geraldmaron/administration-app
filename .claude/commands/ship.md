Run the full pre-merge gate. Surface any blockers before pushing.

Execute each step in sequence. Stop and report if any step fails.

## Step 1 — Type Check

```bash
cd web && pnpm type-check
```

## Step 2 — Lint

```bash
cd web && pnpm lint
```

## Step 3 — Tests

```bash
cd web && pnpm test --run
cd functions && npx jest --passWithNoTests
```

## Step 4 — Build

```bash
cd web && pnpm build
cd functions && pnpm build
```

## Step 5 — Code Review

Run the `/review` checklist against current changes (`git diff HEAD`).

## Report Format

After all steps complete, summarize:

```
TYPE-CHECK:  PASS / FAIL
LINT:        PASS / FAIL
TESTS:       PASS / FAIL (N failed)
BUILD:       PASS / FAIL
REVIEW:      PASS / WARN / BLOCK
```

If all steps pass: `SHIP — ready to push`.
If any step fails: list each blocker with file and line reference.
