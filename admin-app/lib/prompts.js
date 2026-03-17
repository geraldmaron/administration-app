/**
 * Interactive prompts for scenario-loops CLI (bundle, region, country, etc.).
 * Uses inquirer when no CLI args are provided. Supports Back / Main menu in sub-menus.
 */

import inquirer from 'inquirer';
import {
  REGIONS,
  DEFAULT_BUNDLE_IDS,
  BULK_DEFAULTS,
  COUNT_PRESETS,
  CONCURRENCY_CHOICES,
  BATCH_SIZE_CHOICES,
  RETRIES_CHOICES,
  DEDUP_DEFAULTS,
  BUNDLE_CHOICES,
  REGION_CHOICES,
  validateRegion,
  parseCountryList,
} from './options.js';

/** Sentinel values: return from a prompt to navigate back or to main menu. */
export const PROMPT_BACK = '__PROMPT_BACK__';
export const PROMPT_MAIN_MENU = '__PROMPT_MAIN_MENU__';

/**
 * Append Back or Main menu choice to a list of choices.
 * @param {Array<{ name: string, value: any }>} choices
 * @param {'main'|'back'|'none'} option - 'main' = Main menu, 'back' = Back to previous, 'none' = no nav
 */
export function addBackChoice(choices, option) {
  if (option === 'none') return choices;
  return [
    ...choices,
    new inquirer.Separator(),
    { name: option === 'main' ? '← Main menu' : '← Back to previous', value: option === 'main' ? PROMPT_MAIN_MENU : PROMPT_BACK },
  ];
}

export async function promptForBundle(initial, backOption = 'back') {
  const { bundle } = await inquirer.prompt([
    {
      type: 'list',
      name: 'bundle',
      message: 'Select bundle. Bundles group scenarios by where they appear in the game (main game, campaign, or tutorial).',
      default: initial || DEFAULT_BUNDLE_IDS[0],
      choices: addBackChoice(BUNDLE_CHOICES, backOption),
    },
  ]);
  return bundle;
}

/** Multi-select: one or more bundles (for generate). */
export async function promptForBundles(initial, backOption = 'back') {
  const { bundles } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'bundles',
      message: 'Select one or more bundles to generate into (space = toggle, enter = confirm). Same meanings as single bundle.',
      choices: [
        ...BUNDLE_CHOICES.map((c) => ({
          name: c.name,
          value: c.value,
          checked: initial && (Array.isArray(initial) ? initial.includes(c.value) : initial === c.value),
        })),
        new inquirer.Separator(),
        { name: backOption === 'main' ? '← Main menu' : '← Back to previous', value: backOption === 'main' ? PROMPT_MAIN_MENU : PROMPT_BACK },
      ],
      validate: (v) => {
        if (v && v.includes(PROMPT_BACK)) return true;
        if (v && v.includes(PROMPT_MAIN_MENU)) return true;
        return (v && v.length > 0) || 'Select at least one bundle';
      },
    },
  ]);
  if (bundles && bundles.includes(PROMPT_MAIN_MENU)) return PROMPT_MAIN_MENU;
  if (bundles && bundles.includes(PROMPT_BACK)) return PROMPT_BACK;
  return (bundles || []).filter((x) => x !== PROMPT_BACK && x !== PROMPT_MAIN_MENU);
}

/** How to distribute total count across selected bundles. */
export async function promptForDistribution(selectedBundles, totalCount, backOption = 'back') {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: `You selected ${selectedBundles.length} bundle(s) and ${totalCount} total scenarios. How should the count be split?`,
      choices: addBackChoice([
        { name: 'Evenly — divide total by number of bundles (each bundle gets roughly the same)', value: 'evenly' },
        { name: 'By percentage — you set % per bundle (e.g. 50%, 30%, 20%); must sum to 100%', value: 'percentage' },
        { name: 'Same count for each — every bundle gets the full total (e.g. 100 in each = 300 total)', value: 'same' },
      ], backOption),
    },
  ]);
  if (mode === PROMPT_MAIN_MENU || mode === PROMPT_BACK) return mode;
  if (mode === 'evenly') {
    const perBundle = Math.floor(totalCount / selectedBundles.length);
    const remainder = totalCount - perBundle * selectedBundles.length;
    const countPerBundle = {};
    selectedBundles.forEach((b, i) => { countPerBundle[b] = perBundle + (i < remainder ? 1 : 0); });
    return countPerBundle;
  }
  if (mode === 'same') {
    const countPerBundle = {};
    selectedBundles.forEach((b) => { countPerBundle[b] = totalCount; });
    return countPerBundle;
  }
  const percentages = {};
  for (const b of selectedBundles) {
    const { pct } = await inquirer.prompt([
      {
        type: 'input',
        name: 'pct',
        message: `Percentage of the total for bundle "${b}" (0–100). Percentages will be normalized if they don't sum to 100.`,
        default: String(Math.round(100 / selectedBundles.length)),
        validate: (v) => {
          const n = parseFloat(v);
          return (!Number.isNaN(n) && n >= 0 && n <= 100) || 'Enter 0–100';
        },
      },
    ]);
    percentages[b] = parseFloat(pct) || 0;
  }
  const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
  const countPerBundle = {};
  let assigned = 0;
  const keys = Object.keys(percentages);
  keys.forEach((b, i) => {
    const pct = sum > 0 ? percentages[b] / sum : 1 / keys.length;
    const n = i === keys.length - 1 ? totalCount - assigned : Math.round(totalCount * pct);
    countPerBundle[b] = Math.max(0, n);
    assigned += countPerBundle[b];
  });
  return countPerBundle;
}

export async function promptForConfirmPerBatch(backOption = 'back') {
  const { confirm } = await inquirer.prompt([
    {
      type: 'list',
      name: 'confirm',
      message: 'Pause after each batch and ask to continue? (Use Yes for large runs where you want to stop early.)',
      choices: addBackChoice([
        { name: 'No — run all batches without stopping (faster, recommended for unattended runs)', value: false },
        { name: 'Yes — prompt after every batch (slower; use to review progress or stop early)', value: true },
      ], backOption),
    },
  ]);
  return confirm;
}

export async function promptForRegion(initial, backOption = 'back') {
  const { region } = await inquirer.prompt([
    {
      type: 'list',
      name: 'region',
      message: 'Region filter: scenarios are tagged by region (geographic). Leave "All regions" unless you want only one.',
      default: initial ?? '',
      choices: addBackChoice(REGION_CHOICES, backOption),
    },
  ]);
  if (region === PROMPT_MAIN_MENU || region === PROMPT_BACK) return region;
  return region || null;
}

export async function promptForCountries(initial, backOption = 'back') {
  const { scope } = await inquirer.prompt([
    {
      type: 'list',
      name: 'scope',
      message: 'Country filter: limit scenarios to specific countries (ISO-style IDs, e.g. DE, FR, US). Affects which scenarios are generated or listed.',
      choices: addBackChoice([
        { name: 'All countries — no limit (generate/list for every country)', value: 'all' },
        { name: 'Specific — enter comma-separated country IDs (e.g. DE, FR)', value: 'specific' },
      ], backOption),
    },
  ]);
  if (scope === PROMPT_MAIN_MENU || scope === PROMPT_BACK) return scope;
  if (scope === 'all') return [];
  const { countryInput } = await inquirer.prompt([
    {
      type: 'input',
      name: 'countryInput',
      message: 'Country IDs (comma-separated, e.g. DE, FR, US)',
      default: Array.isArray(initial) ? initial.join(', ') : (initial || ''),
    },
  ]);
  return parseCountryList(countryInput);
}

export async function promptForCount(defaultCount = 10, backOption = 'back') {
  const { countChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'countChoice',
      message: 'How many scenarios to generate in this run? Use a preset or Custom for a specific number (1–100,000).',
      default: defaultCount,
      choices: addBackChoice(COUNT_PRESETS, backOption),
    },
  ]);
  if (countChoice === PROMPT_MAIN_MENU || countChoice === PROMPT_BACK) return countChoice;
  if (countChoice !== 'custom') return countChoice;
  const { count } = await inquirer.prompt([
    {
      type: 'input',
      name: 'count',
      message: `Enter number from 1 to ${BULK_DEFAULTS.maxCount.toLocaleString()}`,
      default: String(defaultCount),
      validate: (v) => {
        const n = parseInt(v, 10);
        return (n > 0 && n <= BULK_DEFAULTS.maxCount) || `Enter 1–${BULK_DEFAULTS.maxCount.toLocaleString()}`;
      },
    },
  ]);
  return parseInt(count, 10) || defaultCount;
}

export async function promptForDedup(backOption = 'back') {
  const { skipExisting } = await inquirer.prompt([
    {
      type: 'list',
      name: 'skipExisting',
      message: 'Skip scenarios that already exist in the store? (Recommended: Yes to avoid duplicate content.)',
      default: true,
      choices: addBackChoice([
        { name: 'Yes — only create new scenarios; skip any that already exist for this bundle/region/country', value: true },
        { name: 'No — generate anyway (may create duplicates; use only if you intend to replace or allow dupes)', value: false },
      ], backOption),
    },
  ]);
  if (skipExisting === PROMPT_MAIN_MENU || skipExisting === PROMPT_BACK) return skipExisting;
  const { dedupWithinRun } = await inquirer.prompt([
    {
      type: 'list',
      name: 'dedupWithinRun',
      message: 'Avoid duplicate/similar content within this run? (Backend varies seeds per batch.)',
      default: true,
      choices: addBackChoice([
        { name: 'Yes — reduce chance of very similar scenarios in the same run (recommended)', value: true },
        { name: 'No — no within-run dedup (faster; may see more similar scenarios)', value: false },
      ], backOption),
    },
  ]);
  if (dedupWithinRun === PROMPT_MAIN_MENU || dedupWithinRun === PROMPT_BACK) return dedupWithinRun;
  return { skipExisting, dedupWithinRun };
}

function resolveChoice(value, customPrompt, defaultVal, minVal, maxVal) {
  if (value !== 'custom') return value;
  return inquirer.prompt([
    {
      type: 'input',
      name: 'v',
      message: customPrompt,
      default: String(defaultVal),
      validate: (v) => {
        const n = parseInt(v, 10);
        return (!Number.isNaN(n) && n >= minVal && n <= maxVal) || `Enter ${minVal}–${maxVal}`;
      },
    },
  ]).then((a) => parseInt(a.v, 10) || defaultVal);
}

export async function promptForBulkOptions(backOption = 'back') {
  const { adjust } = await inquirer.prompt([
    {
      type: 'list',
      name: 'adjust',
      message: 'Adjust bulk options? Concurrency = parallel batches; batch size = scenarios per batch; retries = on failure. Preflight validates before generating; log file saves progress.',
      choices: addBackChoice([
        { name: 'No — use recommended defaults (20 concurrent, batch 25, 3 retries; no preflight, no log file)', value: false },
        { name: 'Yes — set concurrency, batch size, retries, preflight, log file, verbose, dry run', value: true },
      ], backOption),
    },
  ]);
  if (adjust === PROMPT_MAIN_MENU || adjust === PROMPT_BACK) return adjust;
  if (!adjust) {
    return {
      concurrency: BULK_DEFAULTS.defaultConcurrency,
      batchSize: BULK_DEFAULTS.defaultBatchSize,
      retries: BULK_DEFAULTS.defaultRetries,
      retryDelayMs: BULK_DEFAULTS.defaultRetryDelayMs,
      delayMs: BULK_DEFAULTS.defaultDelayBetweenBatchesMs,
      timeoutMs: BULK_DEFAULTS.defaultTimeoutPerBatchMs,
      preflight: false,
      logFile: null,
      verbose: false,
      dryRun: false,
      yes: false,
    };
  }
  const { concurrencyChoice } = await inquirer.prompt([
    { type: 'list', name: 'concurrencyChoice', message: 'Concurrency: how many batches run at once. Higher = faster but more API load; 20 matches typical OpenAI limits.', choices: addBackChoice(CONCURRENCY_CHOICES, 'back') },
  ]);
  if (concurrencyChoice === PROMPT_BACK) return PROMPT_BACK;
  const { batchSizeChoice } = await inquirer.prompt([
    { type: 'list', name: 'batchSizeChoice', message: 'Batch size: scenarios per batch. Larger = fewer API round-trips; 25 is a good default.', choices: addBackChoice(BATCH_SIZE_CHOICES, 'back') },
  ]);
  if (batchSizeChoice === PROMPT_BACK) return PROMPT_BACK;
  const { retriesChoice } = await inquirer.prompt([
    { type: 'list', name: 'retriesChoice', message: 'Retries: how many times to retry a batch on failure (e.g. rate limit or timeout). 3 is recommended.', choices: addBackChoice(RETRIES_CHOICES, 'back') },
  ]);
  if (retriesChoice === PROMPT_BACK) return PROMPT_BACK;
  const concurrency = await resolveChoice(concurrencyChoice, 'Concurrency (1–100); capped by OPENAI_MAX_CONCURRENT if set', BULK_DEFAULTS.defaultConcurrency, 1, BULK_DEFAULTS.maxConcurrency);
  const batchSize = await resolveChoice(batchSizeChoice, 'Batch size (1–200); scenarios per API call', BULK_DEFAULTS.defaultBatchSize, 1, BULK_DEFAULTS.maxBatchSize);
  const retries = retriesChoice;
  const { preflight } = await inquirer.prompt([
    {
      type: 'list',
      name: 'preflight',
      message: 'Preflight: run a quick validation before generating? If validation fails, generation is skipped.',
      choices: addBackChoice([
        { name: 'No — generate without preflight (faster)', value: false },
        { name: 'Yes — validate config first; exit on errors (recommended for first run)', value: true },
      ], 'back'),
    },
  ]);
  if (preflight === PROMPT_BACK) return PROMPT_BACK;
  const { logFileChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'logFileChoice',
      message: 'Log file: optionally append progress and errors to a file for later review.',
      choices: addBackChoice([
        { name: 'None — output to terminal only', value: 'none' },
        { name: 'Yes — enter a file path (e.g. ./scenario.log)', value: 'custom' },
      ], 'back'),
    },
  ]);
  if (logFileChoice === PROMPT_BACK) return PROMPT_BACK;
  let logFile = null;
  if (logFileChoice === 'custom') {
    const a = await inquirer.prompt([{ type: 'input', name: 'path', message: 'Log file path (e.g. ./scenario.log)' }]);
    logFile = (a.path && a.path.trim()) || null;
  }
  const { verbose } = await inquirer.prompt([
    {
      type: 'list',
      name: 'verbose',
      message: 'Verbose: print each batch start/end to the terminal (noisier but useful for debugging).',
      choices: addBackChoice([
        { name: 'No — only show the progress line', value: false },
        { name: 'Yes — log every batch', value: true },
      ], 'back'),
    },
  ]);
  if (verbose === PROMPT_BACK) return PROMPT_BACK;
  const { dryRun } = await inquirer.prompt([
    {
      type: 'list',
      name: 'dryRun',
      message: 'Dry run: show planned counts and options without writing any scenarios. Use to double-check before a large run.',
      choices: addBackChoice([
        { name: 'No — run for real (scenarios will be created)', value: false },
        { name: 'Yes — show plan only; no scenarios created', value: true },
      ], 'back'),
    },
  ]);
  if (dryRun === PROMPT_BACK) return PROMPT_BACK;
  return {
    concurrency,
    batchSize,
    retries,
    retryDelayMs: BULK_DEFAULTS.defaultRetryDelayMs,
    delayMs: BULK_DEFAULTS.defaultDelayBetweenBatchesMs,
    timeoutMs: BULK_DEFAULTS.defaultTimeoutPerBatchMs,
    preflight,
    logFile,
    verbose,
    dryRun,
    yes: false,
  };
}

export async function promptProceed(backOption = 'back') {
  const { proceed } = await inquirer.prompt([
    {
      type: 'list',
      name: 'proceed',
      message: 'Proceed with generation using the options shown above? (You can cancel and re-run with different options.)',
      choices: addBackChoice([
        { name: 'No — cancel (nothing will be generated)', value: false },
        { name: 'Yes — start generation', value: true },
      ], backOption),
    },
  ]);
  return proceed;
}

function isInteractive() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

function hasGenerateArgs(argv) {
  return (
    argv.bundle != null ||
    argv.count != null ||
    argv.region != null ||
    argv.country != null ||
    argv.concurrency != null ||
    argv.batchSize != null ||
    argv.retries != null ||
    argv.preflight != null ||
    argv.yes != null ||
    argv.logFile != null ||
    argv.quiet != null ||
    argv.verbose != null ||
    argv.skipExisting != null ||
    argv.dedupWithinRun != null
  );
}

function formatSummary(opts) {
  const bundleLine = opts.bundles
    ? `  Bundles:    ${opts.bundles.join(', ')} (${JSON.stringify(opts.countPerBundle || {})})`
    : `  Bundle:     ${opts.bundle}`;
  const countLine = opts.countPerBundle
    ? `  Count:      ${Object.entries(opts.countPerBundle).map(([b, n]) => `${b}=${n}`).join(', ')}`
    : `  Count:      ${opts.count.toLocaleString()}`;
  const lines = [
    bundleLine,
    countLine,
    `  Region:     ${opts.region ?? 'all'}`,
    `  Countries:  ${opts.countries?.length ? opts.countries.join(', ') : 'all'}`,
    `  Dedup:      skip-existing=${opts.skipExisting !== false}, dedup-within-run=${opts.dedupWithinRun !== false}`,
    `  Confirm:   per-batch=${opts.confirmPerBatch === true}`,
  ];
  if (opts.concurrency != null) {
    lines.push(`  Concurrency: ${opts.concurrency}`);
    lines.push(`  Batch size:  ${opts.batchSize}`);
    lines.push(`  Retries:     ${opts.retries}`);
  }
  if (opts.dryRun) lines.push('  Mode:       dry-run (no writes)');
  if (opts.preflight) lines.push('  Preflight:  yes');
  if (opts.logFile) lines.push(`  Log file:   ${opts.logFile}`);
  return '\n' + lines.join('\n');
}

export async function promptGenerateOptions(argv) {
  const batchMode = hasGenerateArgs(argv);
  let bundle = argv.bundle != null ? String(argv.bundle) : null;
  let bundles = argv.bundles != null ? (Array.isArray(argv.bundles) ? argv.bundles : [argv.bundles]) : null;
  let countPerBundle = argv.countPerBundle != null ? argv.countPerBundle : null;

  if (!batchMode && isInteractive()) {
    const scopeChoices = addBackChoice([
      { name: 'Single bundle — all scenarios go into one bundle (then choose which bundle)', value: 'single' },
      { name: 'Multiple bundles — split total count across several bundles (evenly, by %, or same per bundle)', value: 'multiple' },
    ], 'main');
    let scope;
    let region = null;
    let countries = [];
    let count = 10;
    let bulk = {
      concurrency: BULK_DEFAULTS.defaultConcurrency,
      batchSize: BULK_DEFAULTS.defaultBatchSize,
      retries: BULK_DEFAULTS.defaultRetries,
      retryDelayMs: BULK_DEFAULTS.defaultRetryDelayMs,
      delayMs: BULK_DEFAULTS.defaultDelayBetweenBatchesMs,
      timeoutMs: BULK_DEFAULTS.defaultTimeoutPerBatchMs,
      preflight: false,
      logFile: null,
      verbose: false,
      dryRun: false,
      yes: false,
    };
    let dedup = { skipExisting: DEDUP_DEFAULTS.skipExisting, dedupWithinRun: DEDUP_DEFAULTS.dedupWithinRun };
    let confirmPerBatch = false;
    const runScope = async () => {
      const r = await inquirer.prompt([{ type: 'list', name: 'scope', message: 'Generate into one bundle or several? Single = all scenarios in one bundle (e.g. default). Multiple = split the total count across bundles (evenly, by %, or same count each).', choices: scopeChoices }]);
      return r.scope;
    };
    scope = await runScope();
    if (scope === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
    for (;;) {
      if (scope === 'single') {
        bundle = await promptForBundle(bundle, 'back');
        if (bundle === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
        if (bundle === PROMPT_BACK) { scope = await runScope(); if (scope === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true }; continue; }
      } else {
        bundles = await promptForBundles(bundles, 'back');
        if (bundles === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
        if (bundles === PROMPT_BACK) { scope = await runScope(); if (scope === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true }; continue; }
        let totalCount = await promptForCount(count, 'back');
        if (totalCount === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
        if (totalCount === PROMPT_BACK) continue;
        countPerBundle = await promptForDistribution(bundles, totalCount, 'back');
        if (countPerBundle === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
        if (countPerBundle === PROMPT_BACK) continue;
        count = totalCount;
      }
      break;
    }
    for (;;) {
      region = await promptForRegion(region, 'back');
      if (region === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
      if (region === PROMPT_BACK) {
        if (scope === 'single') { bundle = await promptForBundle(bundle, 'back'); if (bundle === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true }; if (bundle === PROMPT_BACK) scope = await runScope(); }
        else { bundles = await promptForBundles(bundles, 'back'); if (bundles === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true }; if (bundles === PROMPT_BACK) scope = await runScope(); }
        continue;
      }
      countries = await promptForCountries(countries, 'back');
      if (countries === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
      if (countries === PROMPT_BACK) continue;
      if (scope === 'single') {
        count = await promptForCount(count, 'back');
        if (count === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
        if (count === PROMPT_BACK) continue;
      }
      bulk = await promptForBulkOptions('back');
      if (bulk === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
      if (bulk === PROMPT_BACK) continue;
      dedup = await promptForDedup('back');
      if (dedup === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
      if (dedup === PROMPT_BACK) continue;
      confirmPerBatch = await promptForConfirmPerBatch('back');
      if (confirmPerBatch === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
      if (confirmPerBatch === PROMPT_BACK) continue;
      const finalCount = scope === 'single' ? count : Object.values(countPerBundle || {}).reduce((a, b) => a + b, 0);
      const dryRunVal = bulk.dryRun ?? false;
      if (!dryRunVal) {
        console.log(formatSummary({
          bundle: scope === 'single' ? bundle : null,
          bundles: scope === 'multiple' ? bundles : null,
          countPerBundle,
          count: finalCount,
          region,
          countries,
          skipExisting: dedup.skipExisting,
          dedupWithinRun: dedup.dedupWithinRun,
          confirmPerBatch,
          concurrency: bulk.concurrency,
          batchSize: bulk.batchSize,
          retries: bulk.retries,
          dryRun: false,
          preflight: bulk.preflight,
          logFile: bulk.logFile,
        }));
        const proceed = await promptProceed('back');
        if (proceed === PROMPT_MAIN_MENU) return { cancelled: true, mainMenu: true };
        if (proceed === PROMPT_BACK) continue;
        if (!proceed) {
          return { cancelled: true, mainMenu: false };
        }
      }
      break;
    }
    const finalCount = scope === 'single' ? count : Object.values(countPerBundle || {}).reduce((a, b) => a + b, 0);
    const dryRunVal = bulk.dryRun ?? false;
    const yesVal = bulk.yes ?? false;
    return {
      bundle: bundle || (bundles && bundles.length === 1 ? bundles[0] : null),
      bundles: bundles && bundles.length > 0 ? bundles : null,
      countPerBundle,
      count: finalCount,
      dryRun: dryRunVal,
      yes: yesVal,
      skipExisting: dedup.skipExisting,
      dedupWithinRun: dedup.dedupWithinRun,
      confirmPerBatch,
      concurrency: bulk.concurrency,
      batchSize: bulk.batchSize,
      retries: bulk.retries,
      retryDelayMs: bulk.retryDelayMs,
      delayMs: bulk.delayMs,
      timeoutMs: bulk.timeoutMs,
      preflight: bulk.preflight,
      logFile: bulk.logFile,
      verbose: bulk.verbose,
    };
  }

  if (bundle == null && (bundles == null || bundles.length === 0)) {
    bundle = argv.bundle != null ? String(argv.bundle) : (await promptForBundle());
  }
  const region =
    argv.region !== undefined && argv.region !== null
      ? validateRegion(String(argv.region))
      : batchMode
        ? null
        : isInteractive()
          ? await promptForRegion()
          : null;
  const countries =
    argv.country !== undefined
      ? parseCountryList(String(argv.country))
      : batchMode
        ? []
        : isInteractive()
          ? await promptForCountries()
          : [];
  const count =
    argv.count != null
      ? parseInt(argv.count, 10)
      : batchMode
        ? 10
        : (bundles != null ? null : (isInteractive() ? await promptForCount() : 10));
  const finalCount = count != null && !Number.isNaN(count) ? count : (bundles ? Object.values(countPerBundle || {}).reduce((a, b) => a + b, 0) : 10);
  let bulk = {
    concurrency: undefined,
    batchSize: undefined,
    retries: undefined,
    retryDelayMs: undefined,
    delayMs: undefined,
    timeoutMs: undefined,
    preflight: !!argv.preflight,
    logFile: argv.logFile || null,
    verbose: !!argv.verbose,
    dryRun: !!argv.dryRun,
    yes: !!argv.yes,
  };
  let dedup = { skipExisting: DEDUP_DEFAULTS.skipExisting, dedupWithinRun: DEDUP_DEFAULTS.dedupWithinRun };
  let confirmPerBatch = !!argv.confirmPerBatch;
  dedup = {
    skipExisting: argv.noSkipExisting ? false : (argv.skipExisting != null ? !!argv.skipExisting : DEDUP_DEFAULTS.skipExisting),
    dedupWithinRun: argv.noDedupWithinRun ? false : (argv.dedupWithinRun != null ? !!argv.dedupWithinRun : DEDUP_DEFAULTS.dedupWithinRun),
  };

  const dryRun = bulk.dryRun ?? !!argv.dryRun;
  const yes = bulk.yes ?? !!argv.yes;

  const opts = {
    bundle: bundle || (bundles && bundles.length === 1 ? bundles[0] : null),
    bundles: bundles && bundles.length > 0 ? bundles : null,
    countPerBundle: countPerBundle || null,
    count: finalCount,
    dryRun,
    yes,
    skipExisting: dedup.skipExisting,
    dedupWithinRun: dedup.dedupWithinRun,
    confirmPerBatch,
    concurrency: bulk.concurrency,
    batchSize: bulk.batchSize,
    retries: bulk.retries,
    retryDelayMs: bulk.retryDelayMs,
    delayMs: bulk.delayMs,
    timeoutMs: bulk.timeoutMs,
    preflight: bulk.preflight,
    logFile: bulk.logFile,
    verbose: bulk.verbose,
  };

  if (isInteractive() && !batchMode && !dryRun) {
    console.log(formatSummary(opts));
    const proceed = await promptProceed();
    if (!proceed) {
      opts.cancelled = true;
    }
  }

  return opts;
}

function hasListArgs(argv) {
  return argv.bundles || argv.bundle != null || argv.region != null || argv.country != null;
}

export async function promptListTarget(backOption = 'main') {
  const { target } = await inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'List bundle IDs only, or list scenarios (with IDs) for a chosen bundle? Scenario IDs are used by delete and export.',
      choices: addBackChoice([
        { name: 'Bundles — list bundle IDs only (default, campaign, tutorial)', value: 'bundles' },
        { name: 'Scenarios — list scenarios for a bundle (shows id, region, country; use IDs with delete --id or export)', value: 'scenarios' },
      ], backOption),
    },
  ]);
  return target;
}

export async function promptListOptions(argv) {
  const batchMode = hasListArgs(argv);
  const bundle =
    argv.bundle != null ? String(argv.bundle) : (await promptForBundle(undefined, 'back'));
  if (bundle === PROMPT_MAIN_MENU || bundle === PROMPT_BACK) return { bundle: null, region: null, countries: [], [bundle === PROMPT_MAIN_MENU ? 'mainMenu' : 'backToTarget']: true };
  const region =
    argv.region !== undefined && argv.region !== null
      ? validateRegion(String(argv.region))
      : batchMode
        ? null
        : isInteractive()
          ? (await promptForRegion(null, 'back'))
          : null;
  if (region === PROMPT_MAIN_MENU || region === PROMPT_BACK) return { bundle: null, region: null, countries: [], [region === PROMPT_MAIN_MENU ? 'mainMenu' : 'backToTarget']: true };
  const countries =
    argv.country !== undefined ? parseCountryList(String(argv.country)) : (isInteractive() ? await promptForCountries([], 'back') : []);
  if (countries === PROMPT_MAIN_MENU || countries === PROMPT_BACK) return { bundle: null, region: null, countries: [], [countries === PROMPT_MAIN_MENU ? 'mainMenu' : 'backToTarget']: true };
  return { bundle, region: region || null, countries };
}

export async function promptAuditOptions(argv) {
  if (!isInteractive() || (argv.bundle != null && argv.preflight != null && argv.fix != null)) {
    const bundle = argv.bundle != null ? String(argv.bundle) : 'default';
    return { bundle, preflight: !!argv.preflight, fix: !!argv.fix };
  }
  while (true) {
    const bundle =
      argv.bundle != null ? String(argv.bundle) : (await promptForBundle(undefined, 'main'));
    if (bundle === PROMPT_MAIN_MENU) return { bundle: 'default', preflight: false, fix: false, mainMenu: true };
    let preflight = !!argv.preflight;
    let fix = !!argv.fix;
    if (argv.preflight == null && argv.fix == null) {
      const { preflight: p } = await inquirer.prompt([
        {
          type: 'list',
          name: 'preflight',
          message: 'Preflight only (quick validation) or full audit? Preflight = fast check; full audit = deeper structure/tag checks.',
          choices: addBackChoice([
            { name: 'No — run full audit (structure, tags, country/region alignment)', value: false },
            { name: 'Yes — preflight only (quick validation, skip full audit)', value: true },
          ], 'back'),
        },
      ]);
      if (p === PROMPT_MAIN_MENU) return { bundle, preflight: false, fix: false, mainMenu: true };
      if (p === PROMPT_BACK) continue;
      preflight = p;
      const { fix: f } = await inquirer.prompt([
        {
          type: 'list',
          name: 'fix',
          message: 'Apply automatic fixes? When supported, fixes correct structure and tags in place.',
          choices: addBackChoice([
            { name: 'No — report issues only (do not change data)', value: false },
            { name: 'Yes — apply automatic fixes where possible (structure, tags)', value: true },
          ], 'back'),
        },
      ]);
      if (f === PROMPT_MAIN_MENU) return { bundle, preflight, fix: false, mainMenu: true };
      if (f === PROMPT_BACK) continue;
      fix = f;
    }
    return { bundle, preflight, fix };
  }
}

/** How to choose scenarios to delete: pick from list, enter IDs, or all matching filter. */
export async function promptForDeleteMode(backOption = 'main') {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How do you want to choose which scenarios to delete? List = pick from checklist; IDs = type ids from list output; All = delete every scenario in the bundle (optional region/country filter).',
      choices: addBackChoice([
        { name: 'Select from list — show scenarios for this bundle; pick one or more with space/enter (checkbox)', value: 'list' },
        { name: 'Enter scenario IDs — you type comma-separated IDs (e.g. from list output)', value: 'ids' },
        { name: 'All in bundle — delete every scenario in the bundle (optionally filter by region/country next)', value: 'all' },
      ], backOption),
    },
  ]);
  return mode;
}

/** Multi-select scenarios for deletion; choices show id and optional region/country. */
export async function promptForScenariosToDelete(scenarios, backOption = 'back') {
  if (!scenarios.length) return [];
  const choices = [
    ...scenarios.map((s) => {
      const meta = [s.region, s.countryId].filter(Boolean).join(' · ');
      const label = meta ? `id: ${s.id}   ${meta}` : `id: ${s.id}`;
      return { name: label, value: s.id };
    }),
    new inquirer.Separator(),
    { name: backOption === 'main' ? '← Main menu' : '← Back to previous', value: backOption === 'main' ? PROMPT_MAIN_MENU : PROMPT_BACK },
  ];
  const { ids } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'ids',
      message: 'Select scenarios to delete (space = toggle, enter = confirm). Deletion is permanent.',
      choices,
      validate: (v) => {
        if (v && (v.includes(PROMPT_BACK) || v.includes(PROMPT_MAIN_MENU))) return true;
        return true;
      },
    },
  ]);
  if (ids && ids.includes(PROMPT_MAIN_MENU)) return PROMPT_MAIN_MENU;
  if (ids && ids.includes(PROMPT_BACK)) return PROMPT_BACK;
  return (ids || []).filter((x) => x !== PROMPT_BACK && x !== PROMPT_MAIN_MENU);
}

/** Confirm before deleting N scenarios. */
export async function promptConfirmDelete(count, dryRun, backOption = 'back') {
  const { confirm } = await inquirer.prompt([
    {
      type: 'list',
      name: 'confirm',
      message: dryRun
        ? `Dry run: would delete ${count} scenario(s). Proceed to show plan only?`
        : `Permanently delete ${count} scenario(s)? This cannot be undone.`,
      choices: addBackChoice([
        { name: 'No — cancel (nothing will be deleted)', value: false },
        { name: 'Yes — delete', value: true },
      ], backOption),
    },
  ]);
  return confirm;
}
