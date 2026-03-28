# The Administration - Admin Scripts

This directory contains TypeScript scripts for administering and maintaining The Administration Firebase backend.

## Available Scripts

### Core Scripts

- **`generate-scenarios.ts`** - Generate new scenarios for bundles
- **`pre-flight.ts`** - Pre-flight checks before generation runs
- **`audit-existing-scenarios.ts`** - Audit and fix existing scenarios
- **`check-generation-job.ts`** - Monitor generation job status

### Utility Scripts

- **`token-usage-audit.ts`** - Audit token usage in scenarios

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

