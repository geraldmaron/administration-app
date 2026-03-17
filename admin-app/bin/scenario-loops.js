#!/usr/bin/env node
/**
 * admin-app — CLI for scenario and bundle management (generate, list, audit).
 * Run with no args for an interactive menu; run a command for that command’s interactive flow.
 */

import inquirer from 'inquirer';
import { Command } from 'commander';
import { registerGenerate } from '../lib/commands/generate.js';
import { registerList } from '../lib/commands/list.js';
import { registerAudit } from '../lib/commands/audit.js';
import { registerStats } from '../lib/commands/stats.js';
import { registerDelete } from '../lib/commands/delete.js';
import { registerExport } from '../lib/commands/export.js';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });
loadEnv({ path: join(process.cwd(), '.env') });

const CLI_NAME = 'admin-app';

const program = new Command();

program
  .name(CLI_NAME)
  .description('Admin CLI for scenario and bundle management (stats, generate, list, delete, export, audit)')
  .version('1.0.0');

registerGenerate(program);
registerList(program);
registerDelete(program);
registerExport(program);
registerAudit(program);
registerStats(program);

const argv = process.argv.slice(2);
const isInteractiveShell = process.stdin.isTTY && process.stdout.isTTY && argv.length === 0;

function printHelpAndExamples() {
  program.outputHelp();
  console.log('\nExamples:');
  console.log(`  ${CLI_NAME} stats                       # scenario counts (total / per bundle / per region)`);
  console.log(`  ${CLI_NAME} generate                    # interactive: single or multiple bundles, distribution`);
  console.log(`  ${CLI_NAME} generate --bundle default --count 100`);
  console.log(`  ${CLI_NAME} generate --confirm-per-batch`);
  console.log(`  ${CLI_NAME} list                        # list bundles or scenarios`);
  console.log(`  ${CLI_NAME} list --bundles`);
  console.log(`  ${CLI_NAME} delete                      # interactive: by ID, selection, or all`);
  console.log(`  ${CLI_NAME} delete --bundle default --all -y`);
  console.log(`  ${CLI_NAME} export --bundle default -o out.json`);
  console.log(`  ${CLI_NAME} audit                       # audit scenarios`);
  console.log(`  ${CLI_NAME} audit --bundle default --preflight`);
}

if (isInteractiveShell) {
  (async () => {
    const { runContext } = await import('../lib/run-context.js');
    for (;;) {
      runContext.returnToMainMenu = false;
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What do you want to do? (Use arrow keys, Enter to select.)',
          choices: [
            { name: 'Stats — show scenario counts (total, per bundle, or per bundle+region)', value: 'stats' },
            { name: 'Generate — create new scenarios (one or more bundles; set count, filters, bulk options)', value: 'generate' },
            { name: 'List — list bundle IDs or scenarios with IDs (IDs used by delete/export)', value: 'list' },
            { name: 'Delete — remove scenarios by ID, by selection from list, or all in a bundle', value: 'delete' },
            { name: 'Export — save scenarios to a JSON file (backup or inspection)', value: 'export' },
            { name: 'Audit — validate scenario structure and tags; optionally apply fixes', value: 'audit' },
            { name: 'Help — show command list and examples', value: 'help' },
          ],
        },
      ]);
      if (action === 'help') {
        printHelpAndExamples();
        continue;
      }
      process.argv = process.argv.slice(0, 2).concat(action);
      await program.parseAsync(process.argv);
      if (runContext.returnToMainMenu) continue;
      break;
    }
  })();
} else {
  program.parse();
  if (argv.length === 0) {
    printHelpAndExamples();
    process.exitCode = 0;
  }
}
