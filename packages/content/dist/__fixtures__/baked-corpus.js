import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ScenarioDef } from "../scenario.js";
const BAKE_FILE = fileURLToPath(new URL("../../../player-core/src/content/bundled-corpus.generated.ts", import.meta.url));
/**
 * The corpus baked into the player binary, lifted out of the generated module
 * the same way verify-shipped-content-parses does: each shard body is one
 * `JSON.stringify` literal on its own line.
 */
export function bakedScenarios() {
    const source = readFileSync(BAKE_FILE, "utf8");
    const bodies = [...source.matchAll(/^ {4}jsonl: (".*"),$/gm)].map((match) => JSON.parse(match[1]));
    return bodies.flatMap((body) => jsonlScenarios(body));
}
function jsonlScenarios(body) {
    return body
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .flatMap((line) => {
        const parsed = ScenarioDef.safeParse(JSON.parse(line));
        return parsed.success ? [parsed.data] : [];
    });
}
