/**
 * Delete scenarios: by ID(s), by selection from list, or all matching bundle/region/country.
 * List output shows scenario IDs so they can be used with --id/--ids.
 */

import inquirer from 'inquirer';
import { promptForBundle, promptForRegion, promptForCountries, promptForDeleteMode, promptForScenariosToDelete, promptConfirmDelete } from '../prompts.js';
import { listScenarios, deleteScenarios } from '../scenario-runner.js';
import { parseCountryList } from '../options.js';
import { PROMPT_MAIN_MENU, PROMPT_BACK } from '../prompts.js';
import { requestMainMenu } from '../run-context.js';

const isInteractive = () => process.stdin.isTTY && process.stdout.isTTY;

function hasDeleteArgs(options) {
  return options.bundle != null || options.id != null || options.ids != null || options.all;
}

export function registerDelete(cmd) {
  return cmd
    .command('delete')
    .description('Delete scenarios by ID, by selection from list, or all in a bundle')
    .option('--bundle <id>', 'Bundle that contains the scenarios to delete')
    .option('--id <id>', 'Delete a single scenario by ID')
    .option('--ids <id1,id2>', 'Delete multiple scenarios by comma-separated IDs')
    .option('--all', 'Delete all scenarios in the bundle (optional: use with --region/--country to filter)')
    .option('--region <name>', 'Filter by region (for --all or when listing to select)')
    .option('--country <ids>', 'Filter by country IDs, comma-separated (for --all or when listing)')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--dry-run', 'Show what would be deleted without deleting')
    .action(async (options) => {
      let bundle = options.bundle != null ? String(options.bundle) : null;
      let idsToDelete = null;
      let all = !!options.all;
      let region = options.region != null ? String(options.region) : null;
      let countries = options.country != null ? parseCountryList(String(options.country)) : [];
      const yes = !!options.yes;
      const dryRun = !!options.dryRun;

      if (options.id) idsToDelete = [String(options.id).trim()];
      if (options.ids) idsToDelete = String(options.ids).split(',').map((s) => s.trim()).filter(Boolean);

      if (isInteractive() && !hasDeleteArgs(options)) {
        for (;;) {
          bundle = await promptForBundle(bundle, 'main');
          if (bundle === PROMPT_MAIN_MENU) {
            requestMainMenu();
            return;
          }
          const mode = await promptForDeleteMode('back');
          if (mode === PROMPT_MAIN_MENU) {
            requestMainMenu();
            return;
          }
          if (mode === PROMPT_BACK) continue;
          if (mode === 'list') {
            const scenarios = await listScenarios({ bundle, region, countries });
            if (!scenarios.length) {
              console.log('No scenarios found for this bundle/filter.');
              return;
            }
            idsToDelete = await promptForScenariosToDelete(scenarios, 'back');
            if (idsToDelete === PROMPT_MAIN_MENU) {
              requestMainMenu();
              return;
            }
            if (idsToDelete === PROMPT_BACK) continue;
            if (!idsToDelete.length) {
              console.log('None selected. Cancelled.');
              return;
            }
          } else if (mode === 'ids') {
            const { idInput } = await inquirer.prompt([
              { type: 'input', name: 'idInput', message: 'Scenario IDs (comma-separated)' },
            ]);
            idsToDelete = (idInput || '').split(',').map((s) => s.trim()).filter(Boolean);
            if (!idsToDelete.length) {
              console.log('No IDs entered. Cancelled.');
              return;
            }
          } else {
            all = true;
            region = await promptForRegion(region, 'back');
            if (region === PROMPT_MAIN_MENU) {
              requestMainMenu();
              return;
            }
            if (region === PROMPT_BACK) continue;
            countries = await promptForCountries(countries, 'back');
            if (countries === PROMPT_MAIN_MENU) {
              requestMainMenu();
              return;
            }
            if (countries === PROMPT_BACK) continue;
          }
          break;
        }
      }

      if (!bundle && !idsToDelete?.length && !all) {
        console.error('Specify --bundle and either --id, --ids, or --all. Or run interactively.');
        process.exitCode = 1;
        return;
      }
      if (!bundle) {
        console.error('--bundle is required.');
        process.exitCode = 1;
        return;
      }
      if (!all && (!idsToDelete || idsToDelete.length === 0)) {
        console.error('Specify --id, --ids, or --all to choose which scenarios to delete.');
        process.exitCode = 1;
        return;
      }

      const count = all ? (await listScenarios({ bundle, region, countries })).length : idsToDelete.length;
      if (count === 0) {
        console.log('No scenarios to delete.');
        return;
      }

      if (!yes && isInteractive()) {
        const proceed = await promptConfirmDelete(count, dryRun, 'back');
        if (proceed === PROMPT_MAIN_MENU) {
          requestMainMenu();
          return;
        }
        if (proceed === PROMPT_BACK) return;
        if (!proceed) {
          console.log('Cancelled.');
          return;
        }
      } else if (!yes) {
        console.error('Add -y/--yes to confirm deletion without a TTY.');
        process.exitCode = 1;
        return;
      }

      if (dryRun) {
        console.log(`Dry run: would delete ${count} scenario(s) in bundle "${bundle}".`);
        if (idsToDelete?.length) console.log('IDs:', idsToDelete.join(', '));
        return;
      }

      const result = all
        ? await deleteScenarios({ bundle, all: true, region, countries })
        : await deleteScenarios({ bundle, ids: idsToDelete, all: false });

      if (result.errors.length) {
        result.errors.forEach((e) => console.error(e));
        process.exitCode = 1;
      }
      console.log(`Deleted ${result.deleted} scenario(s).`);
    });
}
