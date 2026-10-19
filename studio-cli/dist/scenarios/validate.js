import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { auditInertGates, auditPasses, auditReachability, auditScenarios, CORE_FLAG_VOCABULARY, deedsRemembered, ScenarioDef, ScenarioPack, reachabilityBoards, } from "@admin/content";
import { z } from "zod";
const NO_DEEDS = deedsRemembered([]);
const Document = z.union([ScenarioPack, z.array(ScenarioDef).min(1)]);
/**
 * `corpus` is the pool this batch is landing in, as indexes rather than
 * content: passing it is what makes a batch's collisions with *already
 * shipped* scenarios visible. Omitted, the batch is only checked against
 * itself — correct for a standalone directory, wrong for a publish.
 */
export function validateScenarioDocument(file, raw, corpus, knownFlags = CORE_FLAG_VOCABULARY) {
    const parsed = Document.safeParse(raw);
    if (!parsed.success) {
        const shapeErrors = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
        return { file, scenarios: 0, shapeErrors, findings: [], binding: [], ok: false, deeds: NO_DEEDS };
    }
    const scenarios = Array.isArray(parsed.data) ? parsed.data : parsed.data.scenarios;
    // Reachability runs here rather than inside `auditScenarios` because it is
    // the one check that needs a board: it seals real campaigns off the shipped
    // dataset and asks whether each scenario is ever true on one. Everything the
    // audit knows is a property of the document; this is the only rule that can
    // see a scenario which clears every other one and still reaches no player.
    // The same boards then say whether each player-board gate ever turns one of
    // them away, which is how a gate added only to clear gate-on-nothing shows.
    const boards = reachabilityBoards(scenarios);
    const findings = [
        ...auditScenarios(scenarios, knownFlags, corpus),
        ...auditReachability(scenarios, boards),
        ...auditInertGates(scenarios, boards),
    ];
    return {
        file,
        scenarios: scenarios.length,
        shapeErrors: [],
        findings,
        binding: [],
        ok: auditPasses(findings),
        deeds: deedsRemembered(scenarios),
    };
}
/**
 * The documents a directory holds.
 *
 * A work directory holds the gate's own rejection reports beside the documents
 * it rejected. Reading those back in would fail every one of them on shape and
 * bury the real count under noise the gate itself wrote. Shared with the readers
 * that only measure a batch, so a second caller cannot forget the exclusion and
 * quietly report on the gate's own output.
 */
export async function scenarioDocumentPaths(dir) {
    const entries = await readdir(dir);
    return entries
        .filter((name) => name.endsWith(".json") && !name.endsWith(".findings.json"))
        .sort()
        .map((name) => path.join(dir, name));
}
/**
 * Every scenario a directory holds, for the callers that measure a batch rather
 * than gate it. The gate is `validateScenarioDir` and stays the only thing that
 * decides whether a document may ship.
 */
export async function readScenarioDir(dir) {
    const defs = [];
    const unreadable = [];
    for (const file of await scenarioDocumentPaths(dir)) {
        let parsed;
        try {
            parsed = Document.safeParse(JSON.parse(await readFile(file, "utf8")));
        }
        catch {
            unreadable.push(file);
            continue;
        }
        if (!parsed.success) {
            unreadable.push(file);
            continue;
        }
        defs.push(...(Array.isArray(parsed.data) ? parsed.data : parsed.data.scenarios));
    }
    return { defs, unreadable };
}
/** Validate every .json under a directory — the CI shape of the gate. */
export async function validateScenarioDir(dir, corpus) {
    const results = [];
    for (const file of await scenarioDocumentPaths(dir)) {
        let raw;
        try {
            raw = JSON.parse(await readFile(file, "utf8"));
        }
        catch (error) {
            results.push({
                file,
                scenarios: 0,
                shapeErrors: [`unreadable JSON: ${error instanceof Error ? error.message : String(error)}`],
                findings: [],
                binding: [],
                ok: false,
                deeds: NO_DEEDS,
            });
            continue;
        }
        results.push(validateScenarioDocument(file, raw, corpus));
    }
    return results;
}
/**
 * The errors a shipped scenario already carries, keyed kind and message, so a
 * revision gate can tell a defect it introduced from the corpus's standing
 * debt in a field it may not touch. Reachability is left out on purpose: it is
 * the one error a revision of conditions, cast or family exists to answer.
 */
export function shippedErrorKeys(id, original, corpus, knownFlags) {
    const findings = validateScenarioDocument(id, [original], corpus, knownFlags).findings;
    return new Set(findings.filter((finding) => finding.severity === "error" && finding.kind !== "unreachable-scenario").map((finding) => `${finding.kind}|${finding.message}`));
}
