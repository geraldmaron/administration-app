# Gate: backlog pass after the local continuation (2026-10-16)

Covers commits `7e9d35bbd`, `a61962809` and `694095e1f` on `codex/reconcile-worktrees-2026-10-14`: the import-cycle work and fixtures (BL-219, BL-220), and the player backlog pass (BL-212, BL-213, BL-214's haiku, BL-217's governors lens, BL-218).

## What was run

Every `tsconfig.tsbuildinfo` was deleted first, then in this order on Node 24 (the machine default):

| Step | Result |
|---|---|
| `pnpm run build` | pass |
| `pnpm run typecheck` | pass |
| `pnpm run lint` | failed once on a `node:fs` import in `hill-ledger-golden.test.ts`. The test now carries a scoped exemption with its reason, and the rerun passed. |
| `pnpm run test` | every package passed except seven tests in the frozen `apps/web`, which expected wording the shared code changed in the plain-language rewrite (`70d5a32a9`). Their expected strings were updated, and `apps/web/src/washington` then passed 84 of 84. Engine: 4627 passed, 1 skipped (the Hill digest check, Node 22 only). |
| `scripts/verify-*.mjs` | all pass except `verify-dist-freshness` and its proof, which refuse an uncommitted tree. After the commits both pass. `verify-no-history-references` now lists the presidential authority audit folder. |

The dist-freshness proof left a marker export in `packages/contracts/src/index.ts` when it failed on the dirty tree. It was reverted.

## Not run, and why

- **Balance harness.** Agent E stopped it partway at the lead's request. Seven files passed (`balance-party-scope`, the four `ws-*-behavior-balance` files, `pledge-balance`, `overruling-balance`). The full run belongs to the next integration checkpoint.
- **Browser checks of the UI items.** The classification marks, whole-row tables and layout fixes pass their tests but weren't checked in the running app at 390, 768, 1066 and 1440. Those items are marked "landed, awaiting proof".
- **Native bundles, devices, text zoom, 320 and 1920 px, a screen reader pass.** Not run. They stay open under BL-220.
