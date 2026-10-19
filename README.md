# The Administration

A political simulation game. You take office as President of the United States,
among the 196 governments a President deals with, seat a cabinet, and answer what
the presidency puts in front of you. Every answer costs something, and the country
remembers.

The player is one universal app for iOS, Android and the web, built with Expo and
Tamagui. Electron packages its web export for desktop. Phone, tablet and desktop
have the same capabilities; only the layout adapts.

Play it in a browser at <https://geraldmaron.github.io/administration-app/>.

- [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md): what the game is meant to be.
- [`docs/ABOUT_THE_GAME.md`](docs/ABOUT_THE_GAME.md): the plain-words pitch.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): the standing rules, each with its reason.
- [`docs/DESIGN.md`](docs/DESIGN.md): what the player sees and does.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/SCHEMA.md`](docs/SCHEMA.md): how it fits together and the data shapes.

## Repository

A pnpm workspace.

```
packages/
  engine/        Pure deterministic simulation. No I/O, no UI, no network
  world/         The dataset: schemas, 196 governments, and the validator
  content/       Authored content schemas and the audit rule family
  player-core/   Presentation-independent player logic (saves, campaign, navigation)
  design/        Platform-neutral design tokens
  ui/            The design system: React Native + Tamagui primitives and components
  ui-web/        Legacy React DOM primitives (kept until the Expo player replaces apps/web)
  contracts/     Shared API/DTO types. No logic
apps/
  player/        The player: Expo (Expo Router) for iOS, Android and the web
  web/           Legacy DOM player (Vite, TanStack Router)
  desktop/       Electron host for the player's web export
services/api/    Accounts and the entitlement verifier port
scripts/         Proof gates (verify-*.mjs), dataset bake scripts and dev tools
design/          App logo, icons and token pattern tiles
assets/          Authored art and brand assets
docs/            Intent, standing decisions, design brief, architecture, schema
```

The dependency direction is one-way and enforced, not conventional: the engine,
world, content, contracts, player-core and design packages import no renderer
(React, React Native, Expo, Tamagui), and `packages/ui` imports no router, host or
simulation. `scripts/verify-renderer-boundary.mjs` and `eslint.config.mjs` hold
that line.

## Getting started

Node 22.19+ and pnpm 9.

```bash
pnpm install
pnpm run build
pnpm --filter @admin/player run web      # the Expo player in a browser
pnpm --filter @admin/desktop start       # the Electron host
```

## Validation

Build before typecheck: the workspace packages are composite `tsc -b` projects,
and a typecheck first leaves incremental state that makes a later build emit
different declaration files.

```bash
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test
for g in scripts/verify-*.mjs; do node "$g" || echo "FAILED: $g"; done
```

Most gates have a `-proof` twin that builds a deliberate violation and requires
the gate to reject it; `scripts/README.md` has the conventions. The balance
harness simulates whole campaigns and is not part of `pnpm run test`:

```bash
pnpm --filter @admin/engine run test:balance
```

## Saves and backend

There is no backend. The player is self-contained: the scenario corpus is baked
into the build and there is no cloud save. Saves live in IndexedDB in the browser,
in the app's storage on a device, and in `userData/saves/` under Electron.

## History and license

This repository starts from one snapshot commit. Commit hashes cited in `docs/`
(gate records, the backlog's closed log, audit notes) refer to the earlier
development history, which is kept in a private archive. Evidence screenshots
under `docs/` were left out of the snapshot, so image links there do not resolve.

No license is granted: the code, content and art are all rights reserved.
Third-party data keeps its own terms (see `scripts/vendor/`).
