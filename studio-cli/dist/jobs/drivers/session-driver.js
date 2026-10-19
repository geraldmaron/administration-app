import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
// The session driver makes an agentic coding session — Claude Code, Codex,
// OpenCode, a human with an editor — a first-class generation worker, through
// a file handshake instead of an API call:
//
//   1. A run materializes each item's brief into the work directory, with a
//      README that carries the whole procedure. Items report "failed"
//      (awaiting output), which the runner treats as retryable.
//   2. Any session, in any tool, reads the briefs and writes
//      `<item>.out.json` beside them.
//   3. The next run validates each output through the same gate every other
//      driver faces and journals the item "done" — or writes
//      `<item>.findings.json` telling the session exactly what to fix.
//
// Nothing here is tool-specific on purpose: the work directory is the whole
// interface, so a generation session needs no MCP, no SDK, and no secrets.
// Spend is journaled at zero — a session's own metering is its own business.
export const SCENARIO_README = `# Scenario generation work directory

Each \`*.brief.md\` in this folder is one batch of scenarios to write. For each brief:

1. Read the brief in full. It contains the JSON contract, the hard gates, the craft
   rules, and two shipped exemplar scenarios that set the quality bar.
2. Write your scenarios as a JSON array of ScenarioDef objects to the matching
   \`<item>.out.json\` (same basename as the brief).
3. Re-run the job (\`studio scenarios run <jobId>\`). Every output is validated:
   a clean item is journaled done; a rejected one gets a \`<item>.findings.json\`
   naming each defect — fix the output and run again. Items already done are
   never re-checked or re-spent unless you pass --recheck.

For a scenario-repair job, a sibling output can supply a callback flag only while
that sibling passes its own full repair gate. After changing or removing an output
from a job with done items, run with --recheck to check dependent readers again.

The validator is the same gate every generated scenario faces regardless of who
or what wrote it. There is no path around it.
`;
export class SessionDriver {
    options;
    name = "session";
    constructor(options) {
        this.options = options;
    }
    file(item, suffix) {
        return path.join(this.options.workDir, `${item.id}${suffix}`);
    }
    async runItem(item) {
        await mkdir(this.options.workDir, { recursive: true });
        const readmePath = path.join(this.options.workDir, "README.md");
        if (!existsSync(readmePath))
            await writeFile(readmePath, this.options.readme ?? SCENARIO_README, "utf8");
        const briefPath = this.file(item, ".brief.md");
        if (!existsSync(briefPath)) {
            const prompt = typeof item.payload.prompt === "string" ? item.payload.prompt : JSON.stringify(item.payload, null, 2);
            await writeFile(briefPath, prompt, "utf8");
        }
        const outPath = this.file(item, ".out.json");
        if (!existsSync(outPath)) {
            return { itemId: item.id, status: "failed", spendUsd: 0, error: `awaiting ${path.basename(outPath)}` };
        }
        let raw;
        try {
            raw = JSON.parse(await readFile(outPath, "utf8"));
        }
        catch (error) {
            return {
                itemId: item.id,
                status: "failed",
                spendUsd: 0,
                error: `unreadable JSON in ${path.basename(outPath)}: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
        const validation = this.options.validate(outPath, raw, item);
        // Warnings are written back even on a clean pass: the session should see
        // every smell the audit found, and only errors decide whether it shipped.
        //
        // A run that finds nothing removes the file rather than leaving the last
        // one standing. A findings file outlives the defects it describes — a done
        // item is never re-validated — so a stale one asserts problems the writer
        // has already fixed, which is worse than no file at all.
        const findingsPath = this.file(item, ".findings.json");
        const binding = validation.binding ?? [];
        if (validation.shapeErrors.length + validation.findings.length + binding.length > 0) {
            await writeFile(findingsPath, JSON.stringify({ shapeErrors: validation.shapeErrors, findings: validation.findings, binding }, null, 2), "utf8");
        }
        else if (existsSync(findingsPath)) {
            await rm(findingsPath);
        }
        if (!validation.ok) {
            const errors = validation.findings.filter((finding) => finding.severity === "error");
            return {
                itemId: item.id,
                status: "failed",
                spendUsd: 0,
                error: `${validation.shapeErrors.length + errors.length + binding.length} defect(s) — see ${item.id}.findings.json`,
            };
        }
        return { itemId: item.id, status: "done", spendUsd: 0, output: raw, warnings: validation.findings.length };
    }
}
