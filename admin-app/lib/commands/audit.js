/**
 * Audit scenarios for a bundle (structure, tags, country/region alignment).
 * --preflight runs quick validation; without it runs full audit. --fix applies fixes when supported.
 */

import { promptAuditOptions } from '../prompts.js';
import { auditScenarios } from '../scenario-runner.js';
import { requestMainMenu } from '../run-context.js';

export function registerAudit(cmd) {
  return cmd
    .command('audit')
    .description('Audit scenarios for a bundle (validation and optional fix)')
    .option('--bundle <id>', 'Bundle ID to audit (e.g. default, tutorial)')
    .option('--preflight', 'Quick validation only; skip full audit')
    .option('--fix', 'Apply automatic fixes (structure, tags) where supported')
    .option('--json', 'Output audit errors/warnings as JSON')
    .action(async (options) => {
      const opts = await promptAuditOptions(options);
      if (opts.mainMenu) {
        requestMainMenu();
        return;
      }
      const result = await auditScenarios({
        bundle: opts.bundle,
        preflight: opts.preflight,
        fix: opts.fix,
      });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Audit (bundle: ${opts.bundle}, preflight: ${opts.preflight}):`);
        console.log(`  Errors: ${result.errors.length}`);
        console.log(`  Warnings: ${result.warnings.length}`);
        if (result.errors.length) {
          result.errors.forEach((e) => console.log(`    - ${e}`));
        }
        if (result.warnings.length) {
          result.warnings.forEach((w) => console.log(`    ! ${w}`));
        }
      }
    });
}
