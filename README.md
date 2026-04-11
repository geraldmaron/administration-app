# The Administration

A political simulation game for iOS. You are the head of state — manage your cabinet, make high-stakes decisions, balance metrics, engage in diplomacy, and survive your term.

## Project Structure

```
the-administration/
├── ios/                    # iOS application (Swift / SwiftUI)
│   └── TheAdministration/ # Source code
│       ├── Models/         # Data models (Codable structs)
│       ├── ViewModels/     # GameStore — central state management
│       ├── Views/          # All SwiftUI views and sheets
│       ├── Services/       # Firebase, AI, scoring, template engine
│       └── Resources/      # Assets, fonts, config
├── functions/              # Firebase Cloud Functions (TypeScript)
│   └── src/                # Cloud Function source
├── admin-app/              # Admin CLI (scenario/bundle management: generate, list, delete, export, audit)
├── firebase.json           # Firebase project config
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite index definitions
├── storage.rules           # Firebase Storage rules
└── .firebaserc             # Firebase project alias
```

## iOS App

**Requirements:**
- Xcode 16+
- iOS 17+
- Swift 5.9+
- Firebase iOS SDK (via Swift Package Manager)

**Setup:**

1. Open `ios/TheAdministration.xcodeproj` in Xcode.
2. Add your `GoogleService-Info.plist` to `ios/TheAdministration/Resources/` (download from [Firebase Console](https://console.firebase.google.com/)).
3. Build and run on a simulator or device.

The app signs in anonymously to Firebase on first launch. All game data is persisted locally via `UserDefaults` and optionally synced to Firestore.

## Firebase Backend

**Requirements:**
- Node.js 22
- Firebase CLI (`npm install -g firebase-tools`)

**Setup:**

```bash
firebase login
firebase use the-administration-3a072

# Deploy Cloud Functions
cd functions && npm install && npm run build
cd .. && firebase deploy --only functions

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage
```

**Cloud LLM (OpenRouter)** — Cloud Functions use [OpenRouter](https://openrouter.ai/) for all non-local generation. The iOS app does not call the LLM directly.

- **Production (required):** Set your OpenRouter API key as a Firebase secret:
  ```bash
  firebase functions:secrets:set OPENROUTER_API_KEY
  ```
  Optional: `firebase functions:secrets:set OPENROUTER_MANAGEMENT_KEY` for management APIs. Redeploy after setting secrets: `firebase deploy --only functions`.

- **Legacy direct OpenAI (optional):** Set `USE_OPENAI_DIRECT=true` and provide `OPENAI_API_KEY` (local `.env` or Secret Manager). You must add `OPENAI_API_KEY` to each function’s `secrets` array in code if you use this path in production.

- **Optional overrides** (env vars; OpenRouter-style defaults apply when unset — see `functions/src/lib/generation-models.ts`):
  - `CONCEPT_MODEL`, `BLUEPRINT_MODEL`, `DRAFTER_MODEL`, `REPAIR_MODEL`, `ARCHITECT_MODEL`, `ADVISOR_MODEL`, `CONTENT_QUALITY_MODEL`, `NARRATIVE_REVIEW_MODEL` — model IDs (vendor/slug or `gpt-*` routed via OpenRouter).
  - `EMBEDDING_MODEL` / `OPENAI_EMBEDDING_MODEL` — embedding model (default: `openai/text-embedding-3-small` on OpenRouter).
  - `USE_OPENROUTER_DEFAULTS=false` — use OpenAI-style default *names* when no per-phase env is set (still routed through OpenRouter if `OPENROUTER_API_KEY` is set).
  - `OPENROUTER_BASE_URL` — override API base if needed.
  - `OPENAI_BASE_URL` / `OPENAI_MAX_CONCURRENT` — only for `USE_OPENAI_DIRECT` or compatible proxies.
  - `ENABLE_SEMANTIC_DEDUP` — set to `false` to disable semantic dedup (default: enabled).
  - `SEMANTIC_SIMILARITY_THRESHOLD` — similarity threshold for dedup (default: `0.85`).

  For **deployed functions**, set non-secret env vars in [Google Cloud Console](https://console.cloud.google.com/) → Cloud Functions → your function → Edit → Runtime, build, connections and security → Environment variables. For **local** runs, use `.env` or `.env.local` in `functions/` (e.g. `OPENROUTER_API_KEY=sk-or-...`); do not commit keys.

**Local emulation:**

```bash
firebase emulators:start --only functions,firestore,auth
```

**Inspect the latest generation job** (requires `serviceAccountKey.json` at the repo root or `GOOGLE_APPLICATION_CREDENTIALS`):

```bash
cd functions && npx tsx src/tools/dump-last-generation-job.ts
```

**Queue a generation job** (triggers `onScenarioJobCreated`; requires the same credentials as above):

```bash
cd functions && pnpm exec tsx src/tools/create-generation-job.ts --bundles standard-diplomacy-first --count 2 --mode manual
```

Use `standard-diplomacy-first` to run the **diplomacy** bundle before the other standard bundles (helps catch universal-scope / foreign-policy prompt issues early). Use `standard` or `all` for default ordering.

## Admin Scripts

The **admin-app** CLI handles scenario and bundle management (generate, list, audit). Node 18+ required.

**Run from anywhere (recommended):** From the project root, run once:

```bash
cd /path/to/the-administration
cd admin-app && npm install && cd ..
npm link
```

After that, you can run `admin-app` from any directory:

```bash
admin-app --help
admin-app generate    # interactive
admin-app list
admin-app stats
```

**Run from project root only:** Without linking, from the repo root you can run:

```bash
npm run admin-app -- --help
# or
node admin-app/bin/scenario-loops.js --help
```

### admin-app commands

Run with no arguments for an interactive menu (stats, generate, list, delete, export, audit, help). Each command has an interactive flow with arrow-key lists. Listing scenarios shows **IDs** so you can use them with `delete --id <id>` or `--ids <id1,id2>`.

```bash
# Help and command list
admin-app --help

# Scenario counts: total, per bundle, or per bundle and region (interactive or --total / --per-bundle / --per-region)
admin-app stats
admin-app stats --per-bundle
admin-app stats --per-region --json

# Generate: interactive supports single bundle OR multiple bundles with distribution (evenly / by percentage / same count)
admin-app generate
admin-app generate --bundle default --count 20
admin-app generate --confirm-per-batch   # ask after each batch

# Bulk: thousands of scenarios; progress shows rate (scenarios/s), ETA, batch N/M, in-flight count
admin-app generate --bundle default --count 5000 --concurrency 20 --batch-size 50
admin-app generate --count 10000 --preflight -y --log-file scenario.log --verbose

# List bundles or scenarios (shows scenario IDs for use with delete)
admin-app list
admin-app list --bundles
admin-app list --bundle default [--region Europe] [--json]

# Delete: by ID(s), by selection from list, or all in bundle (interactive or --bundle, --id/--ids/--all)
admin-app delete
admin-app delete --bundle default --id <scenario-id>
admin-app delete --bundle default --ids id1,id2
admin-app delete --bundle default --all [-y] [--region X] [--country DE,FR] [--dry-run]

# Export scenarios to JSON file (backup or inspection)
admin-app export --bundle default [-o scenarios-default.json] [--region X] [--country DE,FR]

# Audit (interactive or --bundle, --preflight, --fix)
admin-app audit
admin-app audit --bundle default [--preflight] [--fix] [--json]
```

**Progress:** Generation shows real-time progress: `Progress: 40/100 (40%) | 12.5/s | ETA 5s Batch 4/10 (2 in flight)`. Updates on every batch completion.

**Generate options**

| Option | Description |
|--------|-------------|
| `--bundle <id>` | Bundle ID (default, campaign, tutorial) |
| `--region <name>` | Restrict to one region |
| `--country <ids>` | Comma-separated country IDs |
| `--count <n>` | Number of scenarios (up to 100k) |
| `--concurrency <n>` | Parallel batches (1–100, default 20) |
| `--batch-size <n>` | Scenarios per batch (1–200, default 25) |
| `--retries <n>` | Retries per batch on failure (default 3) |
| `--retry-delay <ms>` | Delay between retries (default 2000) |
| `--delay <ms>` | Delay between batches (rate limiting) |
| `--timeout <ms>` | Timeout per batch in ms (default 120000) |
| `--preflight` | Run validation first; exit on errors |
| `-y, --yes` | Skip confirmation for large counts (≥1000) |
| `--log-file <path>` | Append progress and errors to file |
| `-q, --quiet` | Only errors to stdout |
| `-v, --verbose` | Log each batch start/end |
| `--dry-run` | Show planned operation only |
| `--skip-existing` | Skip scenarios that already exist (default) |
| `--no-skip-existing` | Generate even if duplicates exist |
| `--dedup-within-run` | Avoid duplicates within this run (default) |
| `--no-dedup-within-run` | Disable within-run dedup |
| `--confirm-per-batch` | Pause after each batch and ask to continue |

Run `admin-app generate --help` for full option descriptions and an **Options explained** section (concurrency, batch-size, retries, skip-existing, dedup-within-run, etc.). Interactive prompts also show what each choice means (e.g. "Evenly — divide total by number of bundles", "20 — recommended (matches typical OpenAI limit)").

**Stats:** `--total`, `--per-bundle`, `--per-region`, `--json` — scenario counts (total only, per bundle, or per bundle and region).  
**List:** `--bundles`, `--bundle <id>`, `--region`, `--country`, `--json` — scenario list shows `id: <id>` for use with delete.  
**Delete:** `--bundle <id>`, `--id <id>`, `--ids <id1,id2>`, `--all`, `--region`, `--country`, `-y`, `--dry-run`.  
**Export:** `--bundle <id>`, `-o/--output <path>`, `--region`, `--country`.  
**Audit:** `--bundle <id>`, `--preflight`, `--fix`, `--json`

With Firebase credentials (`FIREBASE_PROJECT_ID` or `GOOGLE_APPLICATION_CREDENTIALS`), admin-app can list/audit against Firestore and trigger the scenario pipeline; without them it runs in stub/dry-run style.

**Concurrency:** Generation runs batches **concurrently** (multiple batches in flight). Default concurrency is **20** (see `OPENAI_MAX_CONCURRENT` when using direct OpenAI). If you set `OPENAI_MAX_CONCURRENT` in the environment, admin-app caps its concurrency to that value. Retries use exponential backoff for rate-limit resilience.

**Deduplication (guard rails):** By default, generation **skips scenarios that already exist** for the chosen bundle/region/country (existing IDs are loaded before run and passed to the backend) and **avoids duplicates within the same run** (backend uses deterministic seeds per batch). Use `--no-skip-existing` to generate even if duplicates exist, or `--no-dedup-within-run` to disable within-run dedup. In interactive mode you can choose these via arrow-key lists.

**Interactive CLI:** All prompts use **list** choices so you can navigate with **arrow keys** and Enter: bundle, region, country filter, count (presets or custom), bulk options (concurrency, batch size, retries, preflight, log file, verbose, dry run), dedup options, and proceed. No typing required except for custom count, custom concurrency/batch size, or country IDs when you choose "Specific countries".

## Architecture

- **Game State**: Managed by `GameStore` (SwiftUI `ObservableObject`) — scenarios, metrics, diplomacy, cabinet, policy, news, persistence.
- **Data Models**: Defined in `Models.swift` — mirrors Firebase Firestore schema.
- **Scenario Engine**: Cloud Functions (`scenario-engine.ts`) generate AI scenarios using OpenAI. Scenarios are stored in Firestore and fetched by `FirebaseDataService`. Multi-act arcs use `chain_id`, `act_index`, option `consequence_scenario_ids` / `consequence_delay`, and iOS `pendingConsequences` + `chainTokenBindings` for consistent follow-ups (see `docs/SCHEMA.md`).
- **Scoring**: `Scoring.swift` implements the full scoring engine including cabinet modifiers, trait bonuses, and end-game review.
- **Authentication**: Anonymous Firebase Auth on launch via `AuthService`.

### Scripts — name pools (cabinet / candidates)

The iOS app loads regional name lists from Firestore `world_state/names` (`regions.{region_id}.first_male`, `first_female`, `first_neutral`, `last`). To seed or refresh them (requires `serviceAccountKey.json` at repo root, same as other `scripts/` seed tools):

```bash
cd scripts && pnpm install && pnpm exec tsx seed-name-pools.ts
```

Use `--dry-run` to validate pool sizes without writing. Source data lives in `scripts/lib/world-name-pools.ts`.

## Features

- Cabinet management — hire, fire, replace ministers with trait-driven candidates
- Scenario decision engine — weighted random selection with cooldown, tag, and country filtering
- Diplomacy system — bilateral relations, trade, military actions
- Policy sliders — economic stance, social spending, defence posture, environmental policy
- Strategic plans — multi-turn goal tracking
- Trust Your Gut — limited-use AI command override
- Player mood — updatable with turn-based cooldown (3 turns); tasks, reminders, quests use the same throttle pattern to avoid conflicts
- Finance view — taxation, budget allocation, market forecast
- Archive — full turn-by-turn decision log with metric deltas
- God mode — metric editor, diplomacy editor, scenario control, news injection, save slots
