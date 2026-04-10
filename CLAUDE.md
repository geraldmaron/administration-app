# The Administration — AI Development Guide

## Project

Multi-platform political simulation game.

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `ios/` | Swift + SwiftUI | Game client |
| `functions/` | TypeScript + Firebase Functions | Backend logic, generation pipeline |
| `web/` | TypeScript + Next.js | Admin portal |
| `scripts/` | TypeScript | Seed and migration utilities |

## Before Starting Any Task

1. Check for `plan.md` at the workspace root — read it if it exists
2. Read the relevant source files before proposing changes
3. Validate assumptions; never implement on guesses
4. Run the existing test suite to establish a passing baseline

## Code Conventions

**TypeScript**
- Strict mode; no `any` without explicit justification
- Modern ES6+ syntax; async/await over raw promises
- Immutable patterns preferred; no in-place mutation
- Functions < 50 lines; files < 800 lines

**Swift**
- Modern concurrency: async/await and actors
- SwiftUI best practices; no UIKit bridging unless unavoidable
- Follow existing naming conventions in `ios/TheAdministration/`

**All Languages**
- Why-comments only — no point-in-time comments, no name-restating doc comments
- Explicit error handling; never silently swallow errors
- Handle errors at every layer; don't let them propagate as unknowns

## Agent Roles

Full specs: `.claude/agents.md`

| Agent | Owns |
|-------|------|
| `orchestrator` | Complex multi-step coordination, sequencing specialists |
| `architect` | Data models, module contracts, Firestore schema, API design |
| `engineer` | TypeScript/Firebase/Swift implementation, bug fixing, build errors |
| `ai` | Prompt engineering, model selection, LLM evaluation, context architecture |
| `design` | UI components, design system, motion, SwiftUI + React/Next.js |
| `accessibility` | VoiceOver/ARIA, Dynamic Type, keyboard nav, cognitive load |
| `qa` | Test strategy, coverage analysis, regression — Jest/Vitest + XCTest |
| `ops` | OWASP security, CVEs, GDPR/App Store compliance, Firestore rules |
| `reviewer` | Correctness, logic, conventions — pre-merge gate |

Default routing for most tasks: `engineer` → `qa` → `reviewer`
Cross-cutting changes: `orchestrator` → `architect` → `engineer` → `qa` → `reviewer` → `ops`

## Doc Sync Contract (BLOCKING)

When any of the following change, you **MUST** update `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change. Doc drift is a **blocking review finding** — no exceptions.

- Scenario schema (`functions/src/types.ts` — `Scenario`, `ScenarioApplicability`, `MetricGate`, `RelationshipGate`, `ScenarioOption`, `ScenarioMetadata`)
- Token system (`functions/src/lib/token-registry.ts` — `TOKEN_CATEGORIES`, `TOKEN_ALIAS_MAP`, `CONCEPT_TO_TOKEN_MAP`, `CANONICAL_ROLE_IDS`)
- Audit rules (`functions/src/shared/scenario-audit.ts` — `REQUIRES_FLAG_REGISTRY`)
- Role canonicalization (`functions/src/lib/audit-rules.ts` — `ROLE_ID_CANONICALIZATION`)
- Country archetypes (`functions/src/data/schemas/country-archetypes.ts` — `CountryArchetype` enum or derivation rules)
- Metric keys (`MetricKey` in `functions/src/types.ts`)
- Firestore collection schemas
- Generation pipeline stages (`functions/src/scenario-engine.ts`, `functions/src/lib/blitz-planner.ts`, `functions/src/gaia.ts`)

Additionally, `logic.md` must be updated when game-logic rules change (metrics, crises, effects, phases).

## Code Review Checklist

Every PR must pass before merge:

- [ ] TypeScript strict — no new `any`, types correct throughout
- [ ] Tests added or updated for all changed behavior
- [ ] No hardcoded secrets, credentials, or tokens
- [ ] Firestore rules updated if data model changed
- [ ] No silent error swallowing (`catch` blocks must handle or rethrow)
- [ ] Functions < 50 lines, files < 800 lines
- [ ] Immutable patterns — no direct object/array mutation
- [ ] **Doc sync** — `docs/SCHEMA.md` + `docs/ARCHITECTURE.md` updated if any listed surface changed
- [ ] All `plan.md` acceptance criteria met (if applicable)

## Key Contracts

Understand these before touching the generation pipeline or iOS client:

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | End-to-end system architecture — read first |
| `docs/SCHEMA.md` | Scenario schema, token system, country archetypes — authoritative |
| `docs/ABOUT_THE_GAME.md` | Player-facing game overview |
| `functions/src/types.ts` | Core scenario and game types |
| `functions/src/shared/generation-job.ts` | Generation job contract |
| `functions/src/shared/action-resolution-contract.ts` | Action resolution types |
| `functions/src/shared/token-registry-contract.ts` | Token registry interface |
| `functions/src/shared/scenario-repair.ts` | Repair pipeline contract |
| `functions/src/data/schemas/country-archetypes.ts` | Country archetype enum + derivation |

## Test Commands

```bash
# Web (vitest)
cd web && pnpm test

# Functions (jest)
cd functions && npx jest

# iOS
xcodebuild test -project ios/TheAdministration.xcodeproj -scheme TheAdministration -destination 'platform=iOS Simulator,name=iPhone 16'
```
