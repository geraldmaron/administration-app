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
├── scripts/                # Admin and maintenance scripts
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

**OpenAI settings** (used by Cloud Functions for scenario generation; the iOS app does not call OpenAI directly):

- **Production (required):** Set your OpenAI API key as a Firebase secret so the deployed functions can use it:
  ```bash
  firebase functions:secrets:set OPENAI_API_KEY
  ```
  When prompted, paste your key from [OpenAI API keys](https://platform.openai.com/api-keys). Redeploy functions after setting secrets: `firebase deploy --only functions`.

- **Optional overrides** (env vars; defaults in code if unset):
  - `OPENAI_BASE_URL` — API base URL (default: `https://api.openai.com/v1`; use for compatible proxies or Azure).
  - `CONCEPT_MODEL`, `BLUEPRINT_MODEL`, `DRAFTER_MODEL`, `REPAIR_MODEL`, `ARCHITECT_MODEL` — model names (default: `gpt-4o-mini`).
  - `EMBEDDING_MODEL` / `OPENAI_EMBEDDING_MODEL` — embedding model (default: `text-embedding-3-small`).
  - `OPENAI_MAX_CONCURRENT` — max concurrent OpenAI requests (default: `20`).
  - `ENABLE_SEMANTIC_DEDUP` — set to `false` to disable semantic dedup (default: enabled).
  - `SEMANTIC_SIMILARITY_THRESHOLD` — similarity threshold for dedup (default: `0.85`).

  For **deployed functions**, set these in [Google Cloud Console](https://console.cloud.google.com/) → Cloud Functions → your function → Edit → Runtime, build, connections and security → Environment variables. For **local** runs (emulator or scripts), use a `.env` or `.env.local` in `functions/` (e.g. `OPENAI_API_KEY=sk-...`) and ensure your process loads them (e.g. `dotenv`); do not commit keys.

**Local emulation:**

```bash
firebase emulators:start --only functions,firestore,auth
```

## Admin Scripts

Scripts in `scripts/` require `ts-node` and Firebase credentials:

```bash
cd scripts
npm install

# Generate new scenarios
npm run scripts:generate

# Pre-flight validation
npm run scripts:preflight

# Audit existing scenarios
ts-node audit-existing-scenarios.ts
```

## Architecture

- **Game State**: Managed by `GameStore` (SwiftUI `ObservableObject`) — scenarios, metrics, diplomacy, cabinet, policy, news, persistence.
- **Data Models**: Defined in `Models.swift` — mirrors Firebase Firestore schema.
- **Scenario Engine**: Cloud Functions (`scenario-engine.ts`) generate AI scenarios using OpenAI. Scenarios are stored in Firestore and fetched by `FirebaseDataService`.
- **Scoring**: `Scoring.swift` implements the full scoring engine including cabinet modifiers, trait bonuses, and end-game review.
- **Authentication**: Anonymous Firebase Auth on launch via `AuthService`.

## Features

- Cabinet management — hire, fire, replace ministers with trait-driven candidates
- Scenario decision engine — weighted random selection with cooldown, tag, and country filtering
- Diplomacy system — bilateral relations, trade, military actions
- Policy sliders — economic stance, social spending, defence posture, environmental policy
- Strategic plans — multi-turn goal tracking
- Trust Your Gut — limited-use AI command override
- Finance view — taxation, budget allocation, market forecast
- Archive — full turn-by-turn decision log with metric deltas
- God mode — metric editor, diplomacy editor, scenario control, news injection, save slots
