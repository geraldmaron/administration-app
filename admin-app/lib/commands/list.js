/**
 * List bundles or scenarios with optional filters (bundle, region, country).
 * Interactive: prompts for "bundles vs scenarios" then bundle/region if needed.
 */

import { promptListTarget, promptListOptions, PROMPT_MAIN_MENU } from '../prompts.js';
import { listBundles, listScenarios } from '../scenario-runner.js';
import { requestMainMenu } from '../run-context.js';

const isInteractive = () => process.stdin.isTTY && process.stdout.isTTY;

export function registerList(cmd) {
  return cmd
    .command('list')
    .description('List bundles or scenarios (interactive or with options)')
    .option('--bundles', 'List bundle IDs only (default, tutorial, etc.)')
    .option('--scenarios', 'List scenarios; use with --bundle to choose which bundle')
    .option('--bundle <id>', 'Bundle ID to list scenarios for (required when using --scenarios)')
    .option('--region <name>', 'Filter listed scenarios by region')
    .option('--country <ids>', 'Filter by country IDs (comma-separated)')
    .option('--json', 'Output list as JSON')
    .action(async (options) => {
      let listBundlesOnly = options.bundles;
      let didListInLoop = false;
      if (!listBundlesOnly && !options.bundle && !options.region && !options.country && isInteractive()) {
        for (;;) {
          const target = await promptListTarget();
          if (target === PROMPT_MAIN_MENU) {
            requestMainMenu();
            return;
          }
          listBundlesOnly = target === 'bundles';
          if (listBundlesOnly) break;
          const opts = await promptListOptions(options);
          if (opts.mainMenu) {
            requestMainMenu();
            return;
          }
          if (opts.backToTarget) continue;
          const scenarios = await listScenarios({
            bundle: opts.bundle,
            region: opts.region,
            countries: opts.countries,
          });
          if (options.json) {
            console.log(JSON.stringify(scenarios, null, 2));
          } else {
            console.log(`Scenarios (bundle: ${opts.bundle}) — use id with admin-app delete --id <id>:`);
            if (!scenarios.length) {
              console.log('  (none)');
            } else {
              scenarios.forEach((s) => {
                const meta = [s.region, s.countryId].filter(Boolean).join(' · ');
                console.log(`  id: ${s.id}${meta ? `   ${meta}` : ''}`);
              });
            }
          }
          didListInLoop = true;
          break;
        }
      }
      if (didListInLoop) return;
      if (listBundlesOnly) {
        const list = await listBundles();
        if (options.json) {
          console.log(JSON.stringify(list, null, 2));
        } else {
          console.log('Bundles:');
          list.forEach((b) => console.log(`  - ${b}`));
        }
        return;
      }
      const opts = await promptListOptions(options);
      if (opts.mainMenu) {
        requestMainMenu();
        return;
      }
      if (opts.backToTarget) return;
      const scenarios = await listScenarios({
        bundle: opts.bundle,
        region: opts.region,
        countries: opts.countries,
      });
      if (options.json) {
        console.log(JSON.stringify(scenarios, null, 2));
      } else {
        console.log(`Scenarios (bundle: ${opts.bundle}) — use id with admin-app delete --id <id>:`);
        if (!scenarios.length) {
          console.log('  (none)');
        } else {
          scenarios.forEach((s) => {
            const meta = [s.region, s.countryId].filter(Boolean).join(' · ');
            console.log(`  id: ${s.id}${meta ? `   ${meta}` : ''}`);
          });
        }
      }
    });
}
