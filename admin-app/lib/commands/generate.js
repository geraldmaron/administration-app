/**
 * Generate scenario loop for one or more bundles with optional distribution and confirm-per-batch.
 */

import inquirer from 'inquirer';
import { promptGenerateOptions } from '../prompts.js';
import { runScenarioLoop } from '../scenario-runner.js';
import { requestMainMenu } from '../run-context.js';
import {
  BULK_DEFAULTS,
  clampCount,
  clampConcurrency,
  clampBatchSize,
  clampRetries,
} from '../options.js';

export function registerGenerate(cmd) {
  return cmd
    .command('generate')
    .description('Generate scenario loop for one or more bundles (interactive or with options)')
    .option('--bundle <id>', 'Single bundle ID to generate into (e.g. default, tutorial)')
    .option('--bundles <ids>', 'Comma-separated bundle IDs for multi-bundle generation')
    .option('--region <name>', 'Limit scenarios to this region (tagging/filter)')
    .option('--country <ids>', 'Limit to these country IDs (comma-separated, e.g. DE,FR)')
    .option('--count <n>', 'Total number of scenarios to generate (up to 100k)', '10')
    .option('--concurrency <n>', `How many batches run in parallel (1-${BULK_DEFAULTS.maxConcurrency}); higher = faster`, `${BULK_DEFAULTS.defaultConcurrency}`)
    .option('--batch-size <n>', `Scenarios per batch (1-${BULK_DEFAULTS.maxBatchSize}); larger = fewer round-trips`, `${BULK_DEFAULTS.defaultBatchSize}`)
    .option('--retries <n>', `Retries per batch on failure, e.g. rate limit (0-${BULK_DEFAULTS.maxRetries})`, `${BULK_DEFAULTS.defaultRetries}`)
    .option('--retry-delay <ms>', 'Milliseconds to wait between retries (exponential backoff)', `${BULK_DEFAULTS.defaultRetryDelayMs}`)
    .option('--delay <ms>', 'Milliseconds to wait between starting batches (rate limiting)', `${BULK_DEFAULTS.defaultDelayBetweenBatchesMs}`)
    .option('--timeout <ms>', 'Timeout in ms per batch; batch fails if exceeded', `${BULK_DEFAULTS.defaultTimeoutPerBatchMs}`)
    .option('--preflight', 'Run a quick validation before generating; exit on errors')
    .option('-y, --yes', 'Skip confirmation prompt even for large scenario counts')
    .option('--log-file <path>', 'Append progress and errors to this file path')
    .option('-q, --quiet', 'Only print errors to stdout (no progress line)')
    .option('-v, --verbose', 'Log each batch start/end to stdout')
    .option('--human', 'Human-readable output: one line per event, no overwriting, no ANSI')
    .option('--dry-run', 'Show plan (counts, bundles, options) without writing scenarios')
    .option('--skip-existing', 'Skip scenarios that already exist in the store (default)')
    .option('--no-skip-existing', 'Generate anyway; may create duplicates of existing scenarios')
    .option('--dedup-within-run', 'Backend avoids duplicate content within this run (default)')
    .option('--no-dedup-within-run', 'Disable within-run deduplication')
    .option('--confirm-per-batch', 'Prompt to continue after each batch (slower, more control)')
    .addHelpText('after', `
Options explained:
  concurrency    Number of batches running at once; capped by OPENAI_MAX_CONCURRENT if set.
  batch-size     Scenarios per batch; one API round-trip per batch.
  retries        How many times to retry a batch on failure (e.g. rate limit).
  skip-existing  Do not create scenarios that already exist (by bundle/region/country).
  dedup-within-run  Backend reduces duplicate/similar content within the same run.
  confirm-per-batch  Pause after each batch and ask to continue (run becomes sequential).
  preflight      Quick validation before generation; exits on config errors.
  dry-run        Print planned counts and options only; no scenarios written.`)
    .option('--architect-model <model>', 'Override the architect model (e.g., ollama:model-name)')
    .option('--drafter-model <model>', 'Override the drafter model (e.g., ollama:model-name)')
    .option('--embedding-model <model>', 'Override the embedding model (e.g., ollama:model-name)')
    .action(async (options) => {
      const opts = await promptGenerateOptions(options);
      if (opts.mainMenu) {
        requestMainMenu();
        return;
      }
      if (opts.cancelled) {
        console.log('Cancelled.');
        return;
      }

      const runOpts = {
        ...opts,
        architectModel: options.architectModel,
        drafterModel: options.drafterModel,
        embeddingModel: options.embeddingModel,
      };

      await runScenarioLoop(runOpts);
    });
}
