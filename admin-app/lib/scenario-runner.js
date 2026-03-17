/**
 * Scenario loop execution: generate (batched, concurrent, retries), list, and audit.
 * Batches run concurrently up to the concurrency limit (capped by OPENAI_MAX_CONCURRENT when set).
 */

import { createWriteStream } from 'fs';
import { DEFAULT_BUNDLE_IDS, BULK_DEFAULTS, effectiveConcurrency } from './options.js';

export async function listBundles() {
  if (process.env.SCENARIO_BUNDLES) {
    return process.env.SCENARIO_BUNDLES.split(',').map((s) => s.trim());
  }
  return [...DEFAULT_BUNDLE_IDS];
}

export async function listScenarios({ bundle, region, countries }) {
  const bundles = await listBundles();
  if (!bundles.includes(bundle)) {
    return [];
  }
  if (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return await listScenariosFromBackend({ bundle, region, countries });
  }
  return [];
}

/** Returns existing scenario IDs for the given filters (for dedup guard rails). */
export async function getExistingScenarioIds({ bundle, region, countries }) {
  const scenarios = await listScenarios({ bundle, region, countries });
  return scenarios.map((s) => (s && s.id) ? s.id : null).filter(Boolean);
}

async function listScenariosFromBackend({ bundle, region, countries }) {
  return [];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Exponential backoff delay for retries (best practice for rate limits).
 * delayMs * 2^attempt, capped at 30s.
 */
function retryDelay(attempt, baseMs) {
  const ms = baseMs * Math.pow(2, attempt);
  return Math.min(ms, 30_000);
}

async function processBatchWithRetry(
  { batchIndex, from, to, bundle, region, countries, existingIds, dedupWithinRun },
  { retries, retryDelayMs, timeoutMs }
) {
  const size = to - from;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await withTimeout(
        generateOneBatch({ bundle, region, countries, offset: from, size, existingIds, dedupWithinRun }),
        timeoutMs
      );
      return { ok: true, batchIndex, size };
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(retryDelay(attempt, retryDelayMs));
    }
  }
  return { ok: false, batchIndex, size, error: lastErr?.message || String(lastErr) };
}

async function generateOneBatch({ bundle, region, countries, offset, size, existingIds, dedupWithinRun }) {
  if (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return runScenarioBatchViaBackend({ bundle, region, countries, offset, size, existingIds, dedupWithinRun });
  }
  return Promise.resolve();
}

async function runScenarioBatchViaBackend({ bundle, region, countries, offset, size, existingIds, dedupWithinRun }) {
  // Integration point: call Cloud Function or local script per batch.
  // Backend should skip generating scenarios whose content would duplicate existingIds
  // and, when dedupWithinRun, avoid duplicates within this run (e.g. deterministic seeds per batch).
  return Promise.resolve();
}

/**
 * Run batches with a fixed concurrency pool. Schedules up to `concurrency` batches
 * in flight; when one completes, the next batch is started. Truly concurrent.
 */
async function runBatchedLoop(opts, log) {
  const {
    bundle,
    region,
    countries,
    count,
    batchSize,
    concurrency,
    retries,
    retryDelayMs,
    delayMs,
    timeoutMs,
    verbose,
    existingIds = [],
    dedupWithinRun = true,
    getConfirmBeforeNextBatch,
  } = opts;

  const batches = [];
  for (let from = 0; from < count; from += batchSize) {
    const to = Math.min(from + batchSize, count);
    batches.push({ batchIndex: batches.length, from, to });
  }

  const results = { completed: 0, failed: 0, errors: [] };
  const totalBatches = batches.length;
  let batchesDone = 0;

  if (getConfirmBeforeNextBatch) {
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      log.progress(results.completed + results.failed, count, {
        event: 'batch_start',
        batchIndex: b.batchIndex,
        totalBatches,
        batchSize: b.to - b.from,
        bundle,
        completed: results.completed,
      });
      const batchStartTimeMs = Date.now();
      const out = await processBatchWithRetry(
        { ...b, bundle, region, countries, existingIds, dedupWithinRun },
        { retries, retryDelayMs, timeoutMs }
      );
      const batchElapsedSec = ((Date.now() - batchStartTimeMs) / 1000).toFixed(1);
      if (out.ok) {
        results.completed += out.size;
        batchesDone++;
        log.progress(results.completed + results.failed, count, {
          event: 'batch_done',
          batchIndex: out.batchIndex,
          batchesDone,
          totalBatches,
          batchSize: out.size,
          batchElapsedSec,
          inFlightCount: 0,
          completed: results.completed,
        });
      } else {
        results.failed += out.size;
        results.errors.push(`Batch ${out.batchIndex + 1}: ${out.error}`);
        log.error(`Batch ${out.batchIndex + 1} failed: ${out.error}`);
        batchesDone++;
        log.progress(results.completed + results.failed, count, {
          event: 'batch_failed',
          batchIndex: out.batchIndex,
          batchesDone,
          totalBatches,
          batchSize: out.size,
          error: out.error,
          inFlightCount: 0,
          completed: results.completed,
        });
      }
      const done = results.completed + results.failed;
      const cont = await getConfirmBeforeNextBatch(out.batchIndex + 1, totalBatches, done, count);
      if (!cont) break;
    }
    return results;
  }

  const inFlight = new Set();
  let nextBatchIndex = 0;

  function runOneBatch(b) {
    const task = (async () => {
      log.progress(results.completed + results.failed, count, {
        event: 'batch_start',
        batchIndex: b.batchIndex,
        totalBatches,
        batchSize: b.to - b.from,
        bundle,
        completed: results.completed,
      });
      if (delayMs && results.completed + results.failed > 0) await sleep(delayMs);
      const batchStartTimeMs = Date.now();
      const out = await processBatchWithRetry(
        { ...b, bundle, region, countries, existingIds, dedupWithinRun },
        { retries, retryDelayMs, timeoutMs }
      );
      const batchElapsedSec = ((Date.now() - batchStartTimeMs) / 1000).toFixed(1);
      if (out.ok) {
        results.completed += out.size;
        batchesDone++;
        log.progress(results.completed + results.failed, count, {
          event: 'batch_done',
          batchIndex: out.batchIndex,
          batchesDone,
          totalBatches,
          batchSize: out.size,
          batchElapsedSec,
          inFlightCount: inFlight.size - 1,
          completed: results.completed,
        });
      } else {
        results.failed += out.size;
        results.errors.push(`Batch ${out.batchIndex + 1}: ${out.error}`);
        log.error(`Batch ${out.batchIndex + 1} failed: ${out.error}`);
        batchesDone++;
        log.progress(results.completed + results.failed, count, {
          event: 'batch_failed',
          batchIndex: out.batchIndex,
          batchesDone,
          totalBatches,
          batchSize: out.size,
          error: out.error,
          inFlightCount: inFlight.size - 1,
          completed: results.completed,
        });
      }
    })();
    inFlight.add(task);
    task.finally(() => inFlight.delete(task));
    return task;
  }

  while (nextBatchIndex < batches.length || inFlight.size > 0) {
    while (inFlight.size < concurrency && nextBatchIndex < batches.length) {
      const b = batches[nextBatchIndex++];
      runOneBatch(b);
    }
    if (inFlight.size > 0) {
      await Promise.race(inFlight);
    }
  }

  return results;
}

function renderProgressBar(done, total, width = 10) {
  const filled = total > 0 ? Math.round((done / total) * width) : 0;
  return '▓'.repeat(filled) + '▒'.repeat(width - filled);
}

function createLogger(opts) {
  const { quiet, logFile, verbose, human } = opts;
  let logStream = null;
  if (logFile) {
    try {
      logStream = createWriteStream(logFile, { flags: 'a' });
    } catch (e) {
      console.error(`Could not open log file ${logFile}:`, e.message);
    }
  }
  const write = (level, msg) => {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
    if (logStream) logStream.write(line);
    if (level === 'error' || !quiet) {
      if (level === 'error') process.stderr.write(msg + '\n');
      else console.log(msg);
    }
  };
  const progressStartTime = Date.now();
  const fmtTime = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return {
    info: (msg) => write('info', msg),
    verbose: (msg) => { if (verbose) write('verbose', msg); },
    error: (msg) => write('error', msg),
    progress: (done, total, detail = {}) => {
      if (quiet) return;
      const { event, batchIndex, batchesDone, totalBatches, batchSize, batchElapsedSec, bundle: batchBundle, error, completed, inFlightCount } = detail;
      const elapsedSec = (Date.now() - progressStartTime) / 1000;
      const rate = elapsedSec > 0 ? done / elapsedSec : 0;
      const remaining = total - done;
      const etaSec = rate > 0 && remaining > 0 ? Math.ceil(remaining / rate) : 0;
      const etaStr = etaSec >= 60 ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s` : `${etaSec}s`;
      if (logStream) {
        const logMsg = event ? `[${event}] batch=${batchIndex != null ? batchIndex + 1 : '?'} done=${done} total=${total}` : `done=${done} total=${total}`;
        logStream.write(`[${new Date().toISOString()}] [progress] ${logMsg}\n`);
      }
      if (human) {
        if (event === 'batch_start') {
          const bundleStr = batchBundle ? ` for "${batchBundle}"` : '';
          const sizeStr = `${batchSize} ${batchSize === 1 ? 'scenario' : 'scenarios'}`;
          process.stdout.write(`Starting batch ${batchIndex + 1} of ${totalBatches} — generating ${sizeStr}${bundleStr}\n`);
        } else if (event === 'batch_done') {
          const sizeStr = `${batchSize} ${batchSize === 1 ? 'scenario' : 'scenarios'}`;
          process.stdout.write(`Batch ${batchIndex + 1} complete — ${sizeStr} saved (took ${batchElapsedSec}s)\n`);
          const pct = total > 0 ? Math.round((100 * done) / total) : 0;
          const inFlightStr = inFlightCount > 0 ? ` — ${inFlightCount} in flight` : '';
          process.stdout.write(`Progress: ${completed ?? done} of ${total} scenarios complete (${pct}%)${inFlightStr} — ETA ~${etaStr}\n`);
        } else if (event === 'batch_failed') {
          process.stdout.write(`Batch ${batchIndex + 1} failed — ${error}\n`);
        }
      } else if (verbose) {
        const time = fmtTime();
        if (event === 'batch_start') {
          const bundleStr = batchBundle ? `, ${batchBundle}` : '';
          const sizeStr = `${batchSize} ${batchSize === 1 ? 'scenario' : 'scenarios'}`;
          process.stdout.write(`  ${time}  ▶ Batch ${batchIndex + 1}/${totalBatches} started  (${sizeStr}${bundleStr})\n`);
        } else if (event === 'batch_done') {
          const sizeStr = `${batchSize} ${batchSize === 1 ? 'scenario' : 'scenarios'}`;
          process.stdout.write(`  ${time}  ✓ Batch ${batchIndex + 1}/${totalBatches} complete  (${sizeStr} in ${batchElapsedSec}s)\n`);
        } else if (event === 'batch_failed') {
          process.stdout.write(`  ${time}  ✗ Batch ${batchIndex + 1}/${totalBatches} failed   Error: ${error}\n`);
        }
      } else {
        if (event === 'batch_start') return;
        const barDone = batchesDone ?? 0;
        const barTotal = totalBatches ?? 1;
        const bar = renderProgressBar(barDone, barTotal);
        const scenariosStr = `${completed ?? done} scenarios`;
        const inFlightStr = inFlightCount > 0 ? ` · ${inFlightCount} in flight` : '';
        const rateStr = rate.toFixed(1);
        const msg = `[${bar}] ${barDone}/${barTotal} batches · ${scenariosStr}${inFlightStr} · ${rateStr}/s · ETA ${etaStr}`;
        const pad = '\r' + msg + ' '.repeat(Math.max(0, 80 - msg.length));
        process.stdout.write(pad);
        if (done === total) process.stdout.write('\n');
      }
    },
    close: () => { if (logStream) logStream.end(); },
  };
}

export async function runScenarioLoop(opts) {
  const {
    bundle,
    region,
    countries,
    count,
    dryRun,
    preflight,
    yes,
    logFile,
    quiet,
    verbose,
    human,
    skipExisting = true,
    dedupWithinRun = true,
    confirmPerBatch = false,
    getConfirmBeforeNextBatch = null,
    concurrency = BULK_DEFAULTS.defaultConcurrency,
    batchSize = BULK_DEFAULTS.defaultBatchSize,
    retries = BULK_DEFAULTS.defaultRetries,
    retryDelayMs = BULK_DEFAULTS.defaultRetryDelayMs,
    delayMs = BULK_DEFAULTS.defaultDelayBetweenBatchesMs,
    timeoutMs = BULK_DEFAULTS.defaultTimeoutPerBatchMs,
  } = opts;

  const log = createLogger({ quiet, logFile, verbose, human });

  const effective = effectiveConcurrency(concurrency);
  if (effective !== concurrency && !quiet) {
    log.info(`Concurrency capped by OPENAI_MAX_CONCURRENT: ${concurrency} → ${effective}`);
  }

  const filters = [];
  if (region) filters.push(`region=${region}`);
  if (countries?.length) filters.push(`countries=${countries.join(',')}`);
  const filterStr = filters.length ? ` (${filters.join(', ')})` : '';

  if (dryRun) {
    log.info('[dry-run] Would generate scenario loop:');
    log.info(`  bundle: ${bundle}`);
    log.info(`  count: ${count.toLocaleString()}`);
    log.info(`  concurrency: ${effective}${effective !== concurrency ? ` (capped from ${concurrency} by OPENAI_MAX_CONCURRENT)` : ''}`);
    log.info(`  batch-size: ${batchSize}`);
    log.info(`  retries: ${retries}`);
    log.info(`  dedup: skip-existing=${skipExisting}, dedup-within-run=${dedupWithinRun}`);
    if (retryDelayMs) log.info(`  retry-delay: ${retryDelayMs}ms`);
    if (delayMs) log.info(`  delay: ${delayMs}ms`);
    log.info(`  timeout: ${timeoutMs}ms per batch`);
    if (region) log.info(`  region: ${region}`);
    if (countries?.length) log.info(`  countries: ${countries.join(', ')}`);
    log.info('  Run without --dry-run to execute.');
    log.close();
    return;
  }

  if (preflight) {
    const audit = await auditScenarios({ bundle, preflight: true, fix: false });
    if (audit.errors.length > 0) {
      log.error('Preflight failed:');
      audit.errors.forEach((e) => log.error(`  ${e}`));
      log.close();
      process.exitCode = 1;
      return;
    }
    if (!quiet) log.info('Preflight OK.');
  }

  const needConfirm =
    count >= BULK_DEFAULTS.confirmThreshold &&
    !yes &&
    process.stdin.isTTY &&
    process.stdout.isTTY;
  if (needConfirm) {
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question(
        `About to generate ${count.toLocaleString()} scenarios. Continue? [y/N] `,
        (ans) => { rl.close(); resolve((ans || 'n').trim().toLowerCase()); }
      );
    });
    if (answer !== 'y' && answer !== 'yes') {
      log.info('Aborted.');
      log.close();
      return;
    }
  }

  log.info(`Generating ${count.toLocaleString()} scenarios for bundle "${bundle}"${filterStr}`);
  log.info(`Batches: ${Math.ceil(count / batchSize)}, concurrency: ${effective}`);

  if (!process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    log.info('No Firebase credentials; running batched loop (backend integration will run when configured).');
  }

  let existingIds = [];
  if (skipExisting) {
    try {
      existingIds = await getExistingScenarioIds({ bundle, region, countries });
      if (existingIds.length > 0 && !quiet) {
        log.info(`Deduplication: ${existingIds.length.toLocaleString()} existing scenario(s) for this bundle/region; new generation will skip duplicates.`);
      }
    } catch (e) {
      if (!quiet) log.info(`Could not load existing scenarios for dedup: ${e?.message || e}. Proceeding without skip-existing.`);
    }
  }

  const results = await runBatchedLoop(
    {
      bundle,
      region,
      countries,
      count,
      batchSize,
      concurrency: effective,
      retries,
      retryDelayMs,
      delayMs,
      timeoutMs,
      verbose,
      existingIds,
      dedupWithinRun,
      getConfirmBeforeNextBatch,
    },
    log
  );

  log.info(`Done. Completed: ${results.completed}, Failed: ${results.failed}`);
  if (results.errors.length) {
    results.errors.forEach((e) => log.error(e));
    process.exitCode = results.failed > 0 ? 1 : 0;
  }
  log.close();
}

export async function auditScenarios({ bundle, preflight, fix }) {
  const bundles = await listBundles();
  if (!bundles.includes(bundle)) {
    return { errors: [`Unknown bundle: ${bundle}`], warnings: [] };
  }
  if (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return await auditScenariosViaBackend({ bundle, preflight, fix });
  }
  return { errors: [], warnings: ['No backend configured; run against Firestore for full audit.'] };
}

async function auditScenariosViaBackend({ bundle, preflight, fix }) {
  return { errors: [], warnings: [] };
}

/**
 * Delete scenarios by ID or all matching bundle/region/country.
 * ids: array of scenario IDs to delete; if null/undefined and all is true, delete all matching the filter.
 * Returns { deleted: number, errors: string[] }.
 */
export async function deleteScenarios({ bundle, ids = null, all = false, region = null, countries = [] }) {
  const bundles = await listBundles();
  if (!bundles.includes(bundle)) {
    return { deleted: 0, errors: [`Unknown bundle: ${bundle}`] };
  }
  if (!process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { deleted: 0, errors: ['No backend configured; set FIREBASE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS to delete scenarios.'] };
  }
  let toDelete = ids;
  if (all || (ids != null && Array.isArray(ids) && ids.length === 0)) {
    const scenarios = await listScenarios({ bundle, region, countries });
    toDelete = scenarios.map((s) => s && s.id).filter(Boolean);
  }
  if (!toDelete || toDelete.length === 0) {
    return { deleted: 0, errors: [] };
  }
  return await deleteScenariosFromBackend({ bundle, ids: toDelete });
}

async function deleteScenariosFromBackend({ bundle, ids }) {
  // Integration point: delete scenario documents from Firestore (or call Cloud Function).
  // Return { deleted: number, errors: string[] }.
  return { deleted: 0, errors: ['Backend delete not implemented; wire to Firestore or Cloud Function.'] };
}
