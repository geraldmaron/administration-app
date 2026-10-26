import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { NationStats } from "../schemas/nation.js";
import { schemaLeaves } from "./schema-walk.js";
import { CONSUMER_REGISTRIES, STAT_CONSUMERS, statLeafPaths } from "./stat-consumers.js";
const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
/** Every value a file declares at its top level: functions, classes, enums and variables. Types read nothing. */
function topLevelValues(file) {
    const text = readFileSync(file, "utf8");
    const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : /\.m?js$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, kind);
    const names = source.statements.flatMap((statement) => {
        if (ts.isVariableStatement(statement)) {
            return statement.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [d.name.text] : []));
        }
        if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) {
            return statement.name ? [statement.name.text] : [];
        }
        return [];
    });
    return new Set(names);
}
/** Why each claimed reader does not resolve: a missing file, or no top-level value of that name in it. */
export function unresolvedReaders(entries, root) {
    const cache = new Map();
    const declared = (file) => {
        if (!cache.has(file))
            cache.set(file, existsSync(path.join(root, file)) ? topLevelValues(path.join(root, file)) : undefined);
        return cache.get(file);
    };
    return entries.flatMap((entry) => {
        if (!("readBy" in entry))
            return [];
        if (entry.readBy.length === 0)
            return [`${entry.path}: names no reader`];
        return entry.readBy.flatMap((site) => {
            const [file, name, ...rest] = site.split("#");
            if (!file || !name || rest.length > 0)
                return [`${entry.path}: "${site}" is not path#declaration`];
            const values = declared(file);
            if (!values)
                return [`${entry.path}: ${file} does not exist`];
            return values.has(name) ? [] : [`${entry.path}: ${file} declares no top-level value ${name}`];
        });
    });
}
// The other scalability claim: no authored field is decorative. The contract
// covered NationStats alone, and every field the dynamism audit found inert was
// outside that cover — geo.disasterExposure, traits.transparency,
// Person.integrity. It now walks every authored surface a rule can read.
describe("authored-field consumers", () => {
    for (const registry of CONSUMER_REGISTRIES) {
        describe(registry.name, () => {
            it("accounts for every field in the schema, so a new field cannot slip in unnoticed", () => {
                const registered = new Set(registry.entries.map((c) => c.path));
                const leaves = statLeafPaths(registry.schema);
                expect(leaves.length).toBeGreaterThan(3);
                expect(leaves.filter((l) => !registered.has(l))).toEqual([]);
            });
            it("carries no entry for a field the schema no longer has", () => {
                const leaves = new Set(statLeafPaths(registry.schema));
                expect(registry.entries.map((c) => c.path).filter((p) => !leaves.has(p))).toEqual([]);
            });
            // A claim is a site, and a site has to exist: this is what would have
            // caught two fields credited for years to rate laws nobody wrote.
            it("resolves every claimed reader to a value a real file declares", () => {
                expect(unresolvedReaders(registry.entries, REPO_ROOT)).toEqual([]);
            });
            it("says what its readers do with the field, or why it is owed", () => {
                for (const entry of registry.entries) {
                    const words = "readBy" in entry ? entry.purpose : entry.owedBy;
                    expect(words.trim(), entry.path).not.toBe("");
                    if ("readBy" in entry)
                        expect(new Set(entry.readBy).size, entry.path).toBe(entry.readBy.length);
                }
            });
        });
    }
    it("refuses a reader that names a missing file, a missing declaration or a type", () => {
        const planted = [
            { path: "a", readBy: ["packages/world/src/dataset/macro.ts#deathBaseline"], purpose: "a rate law that was never written" },
            { path: "b", readBy: ["packages/world/src/dataset/bands.ts#deathBaseline"], purpose: "a function the file does not declare" },
            { path: "c", readBy: ["packages/world/src/dataset/stat-consumers.ts#StatConsumer"], purpose: "a type, which reads nothing" },
            // The type refuses the prose form the sites replaced; the check still has to.
            // @ts-expect-error not a path#declaration site
            { path: "d", readBy: ["bands.powerScore"], purpose: "the prose form the sites replaced" },
            { path: "e", readBy: [], purpose: "a claim with no reader at all" },
            { path: "f", readBy: ["packages/world/src/dataset/bands.ts#powerScore"], purpose: "a reader that exists" },
        ];
        expect(unresolvedReaders(planted, REPO_ROOT)).toEqual([
            "a: packages/world/src/dataset/macro.ts does not exist",
            "b: packages/world/src/dataset/bands.ts declares no top-level value deathBaseline",
            "c: packages/world/src/dataset/stat-consumers.ts declares no top-level value StatConsumer",
            'd: "bands.powerScore" is not path#declaration',
            "e: names no reader",
        ]);
    });
    it("gives every numeric NationStats leaf a quantity kind and every leaf a write policy", () => {
        const byPath = new Map(STAT_CONSUMERS.map((c) => [c.path, c]));
        const numeric = schemaLeaves(NationStats).filter((leaf) => leaf.type === "number" || leaf.type === "integer");
        expect(numeric.filter((leaf) => byPath.get(leaf.path)?.kind === undefined).map((leaf) => leaf.path)).toEqual([]);
        expect(STAT_CONSUMERS.filter((c) => c.writePolicy === undefined).map((c) => c.path)).toEqual([]);
    });
    // Pinned rather than bounded: a field may only join these lists by a
    // deliberate edit here, which is the point — the debt cannot grow quietly.
    // `medianAge` and `literacy` were credited to two rate laws that never
    // existed, so they are owed again, honestly. `topPartners` lost its last
    // engine reader when ties and observer exposure moved to the lane's size.
    it("owes a consumer for exactly the NationStats fields recorded as owed", () => {
        const owed = STAT_CONSUMERS.filter((c) => "owedBy" in c).map((c) => c.path).sort();
        expect(owed).toEqual(["demography.literacy", "demography.medianAge", "trade.topPartners"]);
    });
    // Outside NationStats: the stored industrial-mobilization band nothing reads;
    // the authored affiliation badge no generated person carries; and every
    // district cohort skew, whose only reader left with the previous player. The
    // skew is pinned as the whole set of its leaves, so a cohort added to the
    // schema adds its owed skew by the same edit.
    it("owes a consumer for exactly the other fields recorded as owed", () => {
        const owed = Object.fromEntries(CONSUMER_REGISTRIES.filter((r) => r.name !== "NationStats")
            .map((r) => [r.name, r.entries.filter((c) => "owedBy" in c).map((c) => c.path).sort()])
            .filter(([, paths]) => paths.length > 0));
        const district = CONSUMER_REGISTRIES.find((r) => r.name === "District");
        expect(owed).toEqual({
            NationBands: ["militaryMetrics.sustainability.industrialMobilization"],
            Person: ["affiliation"],
            District: statLeafPaths(district.schema).filter((p) => p.startsWith("cohortSkew.")).sort(),
        });
    });
});
