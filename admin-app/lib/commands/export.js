/**
 * Export scenarios for a bundle (and optional region/country) to a JSON file.
 * Useful for backup or inspection.
 */

import { writeFile } from 'fs/promises';
import { promptForBundle, promptForRegion, promptForCountries, PROMPT_MAIN_MENU, PROMPT_BACK } from '../prompts.js';
import { listScenarios } from '../scenario-runner.js';
import { parseCountryList } from '../options.js';
import { requestMainMenu } from '../run-context.js';

const isInteractive = () => process.stdin.isTTY && process.stdout.isTTY;

export function registerExport(cmd) {
  return cmd
    .command('export')
    .description('Export scenarios to a JSON file (by bundle, optional region/country filter)')
    .option('--bundle <id>', 'Bundle to export')
    .option('--region <name>', 'Filter by region')
    .option('--country <ids>', 'Filter by country IDs (comma-separated)')
    .option('-o, --output <path>', 'Output file path (default: scenarios-<bundle>.json)')
    .action(async (options) => {
      let bundle = options.bundle != null ? String(options.bundle) : null;
      let region = options.region != null ? String(options.region) : null;
      let countries = options.country != null ? parseCountryList(String(options.country)) : [];
      let outputPath = options.output || null;

      if (isInteractive() && (bundle == null || outputPath == null)) {
        if (bundle == null) {
          bundle = await promptForBundle(undefined, 'main');
          if (bundle === PROMPT_MAIN_MENU) {
            requestMainMenu();
            return;
          }
        }
        if (region == null) {
          region = await promptForRegion(null, 'back');
          if (region === PROMPT_MAIN_MENU || region === PROMPT_BACK) {
            requestMainMenu();
            return;
          }
        }
        if (countries.length === 0) {
          countries = await promptForCountries([], 'back');
          if (countries === PROMPT_MAIN_MENU || countries === PROMPT_BACK) {
            requestMainMenu();
            return;
          }
        }
        if (!outputPath) {
          const { path } = await (await import('inquirer')).default.prompt([
            { type: 'input', name: 'path', message: 'Output file path (JSON; e.g. scenarios-default.json or ./backup/default.json)', default: `scenarios-${bundle}.json` },
          ]);
          outputPath = (path && path.trim()) || `scenarios-${bundle}.json`;
        }
      }

      if (!bundle) {
        console.error('--bundle is required (or run interactively).');
        process.exitCode = 1;
        return;
      }
      if (!outputPath) outputPath = `scenarios-${bundle}.json`;

      const scenarios = await listScenarios({ bundle, region, countries });
      const payload = { bundle, region: region || null, countries, count: scenarios.length, scenarios };
      await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
      console.log(`Exported ${scenarios.length} scenario(s) to ${outputPath}`);
    });
}
