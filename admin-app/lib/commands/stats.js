/**
 * Stats command: scenario counts (total, per bundle, per bundle and region).
 * All options available via arrow-key lists when run interactively.
 */

import inquirer from 'inquirer';
import { listBundles, listScenarios } from '../scenario-runner.js';
import { addBackChoice, PROMPT_MAIN_MENU } from '../prompts.js';
import { requestMainMenu } from '../run-context.js';

const isInteractive = () => process.stdin.isTTY && process.stdout.isTTY;

export function registerStats(cmd) {
  return cmd
    .command('stats')
    .description('Show scenario counts (total, per bundle, or per bundle and region)')
    .option('--total', 'Show one total count across all bundles')
    .option('--per-bundle', 'Show count for each bundle (default, tutorial, etc.)')
    .option('--per-region', 'Show count per bundle and per region (detailed breakdown)')
    .option('--json', 'Output counts as JSON')
    .action(async (options) => {
      let mode = options.total ? 'total' : options.perBundle ? 'per-bundle' : options.perRegion ? 'per-region' : null;
      if (mode == null && isInteractive()) {
        const { m } = await inquirer.prompt([
          {
            type: 'list',
            name: 'm',
            message: 'What counts do you want to see? Stats help you plan generation and spot gaps.',
            choices: addBackChoice([
              { name: 'Total only — one number: total scenarios across all bundles', value: 'total' },
              { name: 'Per bundle — count per bundle (default, campaign, tutorial) so you can balance content', value: 'per-bundle' },
              { name: 'Per bundle and region — count per bundle and per region (most detailed)', value: 'per-region' },
            ], 'main'),
          },
        ]);
        if (m === PROMPT_MAIN_MENU) {
          requestMainMenu();
          return;
        }
        mode = m;
      }
      if (mode == null) mode = 'total';

      const bundles = await listBundles();
      let data;

      if (mode === 'total') {
        let total = 0;
        for (const bundle of bundles) {
          const scenarios = await listScenarios({ bundle, region: null, countries: [] });
          total += scenarios.length;
        }
        data = { total };
        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(`Total scenarios: ${total.toLocaleString()}`);
        }
        return;
      }

      if (mode === 'per-bundle') {
        const perBundle = {};
        for (const bundle of bundles) {
          const scenarios = await listScenarios({ bundle, region: null, countries: [] });
          perBundle[bundle] = scenarios.length;
        }
        data = { perBundle, total: Object.values(perBundle).reduce((a, b) => a + b, 0) };
        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log('Scenarios per bundle:');
          for (const [b, count] of Object.entries(perBundle)) {
            console.log(`  ${b}: ${count.toLocaleString()}`);
          }
          console.log(`  Total: ${data.total.toLocaleString()}`);
        }
        return;
      }

      const perBundleRegion = {};
      let grandTotal = 0;
      for (const bundle of bundles) {
        perBundleRegion[bundle] = { all: 0, byRegion: {} };
        const all = await listScenarios({ bundle, region: null, countries: [] });
        perBundleRegion[bundle].all = all.length;
        grandTotal += all.length;
        for (const region of REGIONS) {
          const scenarios = await listScenarios({ bundle, region, countries: [] });
          perBundleRegion[bundle].byRegion[region] = scenarios.length;
        }
      }
      data = { perBundleRegion, total: grandTotal };
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('Scenarios per bundle and region:');
        for (const [bundle, info] of Object.entries(perBundleRegion)) {
          console.log(`  ${bundle}: ${info.all.toLocaleString()} total`);
          for (const [region, count] of Object.entries(info.byRegion)) {
            if (count > 0) console.log(`    ${region}: ${count.toLocaleString()}`);
          }
        }
        console.log(`  Grand total: ${grandTotal.toLocaleString()}`);
      }
    });
}
