# The Administration - Admin Scripts

This directory contains TypeScript scripts for administering and maintaining The Administration Firebase backend.

## Available Scripts

### Core Scripts

- **`generate-scenarios.ts`** - Generate new scenarios for bundles
- **`pre-flight.ts`** - Pre-flight checks before generation runs
- **`audit-existing-scenarios.ts`** - Audit and fix existing scenarios
- **`check-generation-job.ts`** - Monitor generation job status

### Data Seeding Scripts

- **`seed-metrics.ts`** - Populate the `world_state/metrics` document with canonical metric configurations

### Utility Scripts

- **`token-usage-audit.ts`** - Audit token usage in scenarios
- **`_check-state.ts`** - Check Firebase state and collection counts

## Usage

All scripts can be run from the project root using:

```bash
npx tsx scripts/<script-name>.ts [options]
```

Or using the npm scripts defined in `scripts/package.json`:

```bash
cd scripts && npm run <script-name>
```

## Firebase Setup

Scripts automatically configure Firebase Admin SDK using the service account key at `../serviceAccountKey.json`.

## Seed Metrics Script

The `seed-metrics.ts` script populates the `world_state/metrics` document with the canonical configuration for all 27 game metrics.

### Usage

```bash
# Dry run (recommended first)
npx tsx scripts/seed-metrics.ts --dry-run

# Actually update Firestore
npx tsx scripts/seed-metrics.ts
```

### What it does

- Creates/updates the `world_state/metrics` document
- Defines all 27 metrics with their properties:
  - Core metrics (18): economy, health, military, etc.
  - Inverse metrics (4): corruption, inflation, crime, bureaucracy
  - Fiscal metric (1): budget
  - Hidden metrics (3): unrest, economic_bubble, foreign_influence
- Sets effect magnitude caps and related cabinet roles for each metric
- Enables the audit system to validate scenarios properly

### Verification

After running, the audit system should log: "Config initialized: 27 metrics"

Test with:
```bash
npx tsx scripts/test-metrics-init.ts
```