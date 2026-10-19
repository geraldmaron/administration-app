import { ScenarioDef, type ScenarioDef as ScenarioDefType } from "@admin/content";

/** One shipped scenario the schema refused, and why. */
export type ShardDrop = {
  /** 1-based line in the shard body, so a finding names somewhere to look. */
  readonly line: number;
  /** The document's own id when it had a readable one, `?` when it did not. */
  readonly id: string;
  readonly issue: string;
};

export type ShardBody = {
  readonly scenarios: readonly ScenarioDefType[];
  /**
   * Lines this build could not read. Empty for every shard that cleared the
   * content gate against this schema; anything else means the corpus and the
   * binary disagree, and the disagreement is costing playable scenarios.
   */
  readonly drops: readonly ShardDrop[];
};

/** The document's own id, when the document got far enough to have a readable one. */
function documentId(doc: unknown): string {
  const id = (doc as { id?: unknown } | null)?.id;
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
export function parseShardBody(text: string): ShardBody {
  const scenarios: ScenarioDefType[] = [];
  const drops: ShardDrop[] = [];
  text.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    let doc: unknown;
    try {
      doc = JSON.parse(trimmed);
    } catch (error) {
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
