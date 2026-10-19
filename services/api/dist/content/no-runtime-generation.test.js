import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// Content is delivered, never generated at runtime. That is an invariant, so it
// is checked mechanically rather than trusted to review: no gameplay-serving
// path in this service may reach a model provider, and the service may not even
// carry a dependency that would let it.
//
// Test files are excluded from the source scan because this one necessarily
// spells the forbidden names out in order to look for them.
const SERVICE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN_IDENTIFIERS = [
    "openai",
    "anthropic",
    "@anthropic-ai",
    "openrouter",
    "generativelanguage",
    "googleapis.com/v1beta/models",
    "completions",
    "chat/completions",
];
function sourceFiles(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory())
            return sourceFiles(full);
        if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts"))
            return [];
        return [full];
    });
}
describe("no gameplay path triggers an LLM call", () => {
    it("no source file in services/api references a model provider", () => {
        const offenders = sourceFiles(SERVICE_ROOT).flatMap((file) => {
            const text = readFileSync(file, "utf8").toLowerCase();
            return FORBIDDEN_IDENTIFIERS.filter((needle) => text.includes(needle)).map((needle) => `${file}: ${needle}`);
        });
        expect(offenders).toEqual([]);
    });
    it("services/api declares no model-provider dependency", () => {
        const manifest = JSON.parse(readFileSync(join(SERVICE_ROOT, "..", "package.json"), "utf8"));
        const declared = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
        const offenders = declared.filter((name) => FORBIDDEN_IDENTIFIERS.some((needle) => name.toLowerCase().includes(needle)));
        expect(offenders).toEqual([]);
    });
});
