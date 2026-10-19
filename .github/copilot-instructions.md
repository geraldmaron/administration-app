# GitHub Copilot Instructions

See `CLAUDE.md` for the full development guide — project structure, conventions, agent roles, code review checklist, and key contracts.

Agent roles live in `.claude/agents/<role>.md`.

## Platform Quick-Reference

There is no Next.js, no Swift, and no external backend in this
repository. The stack is a pnpm monorepo: TypeScript packages and a Vite
React DOM player, fully self-contained — the corpus is baked into the player
and there is no cloud save.

### TypeScript
- Strict mode; no `any` without written justification
- async/await; no raw promise chains
- Immutable patterns; no in-place mutation
- Functions under 50 lines, files under 800 (`scripts/verify-file-size.mjs`)

### Web player (`apps/web`)
- One route tree for every surface. Adapt on viewport width — never on a
  platform flag in the renderer
- The browser is the primary ship surface (`docs/DECISIONS.md` §8.1). Electron
  packages the same UI for desktop and Steam. Phone and desktop have task parity
- Compose from `packages/ui-web` and tokens in `packages/design`. Semantic HTML.
  Do not import `react-native`, `expo`, or Electron into the renderer
- Colors, type and spacing come from the `packages/design` tokens
  (`packages/design/src/tokens.css`); never inline a value. The design brief is
  `docs/DESIGN.md`

### Backend
- The player calls no backend: `apps/web/src` has no `fetch` call and no API
  environment variable. `services/api` (accounts, the entitlement verifier port,
  the starter-pack manifest audit) is not wired into the player
- The studio console has no sign-in gate — single-operator, localhost-only

### Content
- The player is the President of the United States; all 196 governments are
  real countries. Authored prose still names no real living person and no real news
  outlet — `docs/CONTENT_DOCTRINE.md` §10 has the full rule
