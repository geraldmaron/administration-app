import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  auditConsequences,
  consequenceAuditPasses,
  ConsequenceDef,
  ConsequencePack,
  CORE_CONSEQUENCES,
  CORE_FLAG_VOCABULARY,
  type ConsequenceCorpusContext,
  type ConsequenceFinding,
} from "@admin/content";
import { z } from "zod";

// The publish gate for generated consequence cards, shaped exactly like the
// scenario gate: shape first (zod), then the content audit, and a batch with
// one bad card fails as a batch. Warnings ride along with the result rather
// than blocking it — a writer should see every smell the audit found, but only
// an error decides whether the batch ships.

export type ConsequenceValidation = {
  readonly file: string;
  readonly consequences: number;
  readonly shapeErrors: readonly string[];
  readonly findings: readonly ConsequenceFinding[];
  readonly ok: boolean;
};

const Document = z.union([ConsequencePack, z.array(ConsequenceDef).min(1)]);

/**
 * The bundled floor is always installed at runtime, so it is always part of the
 * pool the coverage rules judge. Without it every batch smaller than the whole
 * matrix would be refused for cells it was never asked to write.
 */
function poolWith(corpus?: ConsequenceCorpusContext): ConsequenceCorpusContext {
  return { ...corpus, installed: [...CORE_CONSEQUENCES, ...(corpus?.installed ?? [])] };
}

/**
 * `knownFlags` is the governance memory something else already writes — the
 * bundled scenario vocabulary plus whatever the scenario corpus's replies
 * stamp. Chain closure runs across both content types, so a card gating on a
 * flag a scenario reply sets is legitimate and must not be refused.
 */
export function validateConsequenceDocument(
  file: string,
  raw: unknown,
  knownFlags: readonly string[] = CORE_FLAG_VOCABULARY,
  corpus?: ConsequenceCorpusContext,
): ConsequenceValidation {
  const parsed = Document.safeParse(raw);
  if (!parsed.success) {
    const shapeErrors = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return { file, consequences: 0, shapeErrors, findings: [], ok: false };
  }
  const defs = Array.isArray(parsed.data) ? parsed.data : parsed.data.consequences;
  const findings = auditConsequences(defs, knownFlags, poolWith(corpus));
  return { file, consequences: defs.length, shapeErrors: [], findings, ok: consequenceAuditPasses(findings) };
}

/** Validate every .json under a directory — the CI shape of the gate. */
export async function validateConsequenceDir(dir: string): Promise<readonly ConsequenceValidation[]> {
  const entries = await readdir(dir);
  const results: ConsequenceValidation[] = [];
  // A work directory holds the gate's own rejection reports beside the documents
  // it rejected. Reading those back in would fail every one of them on shape and
  // bury the real count under noise the gate itself wrote.
  for (const entry of entries.filter((name) => name.endsWith(".json") && !name.endsWith(".findings.json")).sort()) {
    const file = path.join(dir, entry);
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      results.push({
        file,
        consequences: 0,
        shapeErrors: [`unreadable JSON: ${error instanceof Error ? error.message : String(error)}`],
        findings: [],
        ok: false,
      });
      continue;
    }
    results.push(validateConsequenceDocument(file, raw));
  }
  return results;
}
