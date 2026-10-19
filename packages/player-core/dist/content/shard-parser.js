import { ScenarioDef } from "@admin/content";
/** The document's own id, when the document got far enough to have a readable one. */
function documentId(doc) {
    const id = doc?.id;
    return typeof id === "string" && id.length > 0 ? id : "?";
}
/**
 * A shard is JSONL: one scenario document per line, which is what the corpus
 * writes and what lets a shard be appended to without rewriting it.
 *
 * Every line is parsed through the schema rather than cast, and a refused
 * line is returned beside the scenarios that survived rather than discarded
 * quietly — a dropped line is a scenario somebody wrote and nobody will ever
 * be dealt, and the only thing worse than losing it is losing it silently.
 */
export function parseShardBody(text) {
    const scenarios = [];
    const drops = [];
    text.split("\n").forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.length === 0)
            return;
        let doc;
        try {
            doc = JSON.parse(trimmed);
        }
        catch (error) {
            drops.push({
                line: index + 1,
                id: "?",
                issue: `not JSON: ${error instanceof Error ? error.message : "unreadable"}`,
            });
            return;
        }
        const parsed = ScenarioDef.safeParse(doc);
        if (parsed.success) {
            scenarios.push(parsed.data);
            return;
        }
        const first = parsed.error.issues[0];
        drops.push({
            line: index + 1,
            id: documentId(doc),
            issue: `${first?.path.join(".") || "(root)"}: ${first?.message ?? "failed the scenario schema"}`,
        });
    });
    return { scenarios, drops };
}
