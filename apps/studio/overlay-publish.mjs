import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { worldDataset } from "@admin/world";
import { objectLiteralSpan } from "./source-patch.mjs";
import { readScalarAtPath, writeScalarAtPath } from "./nation-source.mjs";
import { mergeNation, valueAtPath } from "./overlay-model.mjs";
import { markPublished } from "./overlay-store.mjs";

// Materialising the overlay: pending edits become TypeScript in
// packages/world/src/dataset/nations.ts, and only then are marked published.
//
// The order matters in one direction only. Stamping first and writing second
// would, on a failed write, leave rows marked applied that are absent from
// source — an overlay claiming a change the dataset does not carry. Writing
// first and stamping second fails the other way, leaving a published edit
// showing as pending, which the next publish resolves as a no-op because the
// field already reads that way in source.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const NATIONS_PATH = path.join(REPO_ROOT, "packages/world/src/dataset/nations.ts");

function idConstantsByCode(source) {
  const byCode = new Map();
  for (const match of source.matchAll(/export const (\w+_ID) = "([A-Z]{2,4})" as NationId;/g)) {
    byCode.set(match[2], match[1]);
  }
  return byCode;
}

function nationBlocksByCode(source) {
  const idConst = idConstantsByCode(source);
  const blocks = new Map();
  for (const match of source.matchAll(/NationInput\.parse\(\{/g)) {
    const openBrace = match.index + match[0].length - 1;
    const [start, end] = objectLiteralSpan(source, openBrace);
    const body = source.slice(start, end);
    const idRef = body.match(/\bid:\s*(\w+_ID)\s*,/);
    if (!idRef) continue;
    const code = [...idConst.entries()].find(([, name]) => name === idRef[1])?.[0];
    if (code) blocks.set(code, { start, end });
  }
  return blocks;
}

/** The current text of the file the publisher writes, for judging staleness against. */
export const readNationsSource = () => readFile(NATIONS_PATH, "utf8");

const seedNation = (code) => worldDataset.nations.find((nation) => String(nation.id) === code);

/**
 * What publishing a set of edits would do, without doing it.
 *
 * Every refusal is decided here rather than mid-write: a publish that applied
 * four edits and then discovered the fifth was stale would have to unwind four
 * writes to a file somebody else may be editing.
 *
 * `source` is the current text of nations.ts, and staleness is judged against
 * it rather than against the imported dataset. The two disagree the moment
 * anything is published: rebuilding the package does not replace the module
 * already resident in this process, so a second publish judged against the
 * import is judged against values one publish out of date. Callers without the
 * file to hand may omit it and get the import, which is correct for a process
 * that has not published yet and is what the overlay page wants for a preview.
 *
 * @returns {{applicable: object[], refused: {edit: object, reason: string}[]}}
 */
export function planPublish(edits, source) {
  const blocks = source ? nationBlocksByCode(source) : undefined;
  const currentValue = (code, fieldPath) => {
    if (!source || !blocks) return undefined;
    const block = blocks.get(code);
    if (!block) return undefined;
    const read = readScalarAtPath(source, block.start, block.end, fieldPath);
    return read.ok ? read.value : undefined;
  };

  const applicable = [];
  const refused = [];

  const byNation = new Map();
  for (const edit of edits) {
    const list = byNation.get(edit.recordId) ?? [];
    list.push(edit);
    byNation.set(edit.recordId, list);
  }

  for (const [code, group] of byNation) {
    const seed = seedNation(code);
    if (!seed) {
      for (const edit of group) refused.push({ edit, reason: `no nation "${code}" in the dataset` });
      continue;
    }
    const fresh = [];
    for (const edit of group) {
      const fromSource = currentValue(code, edit.fieldPath);
      const current = fromSource === undefined ? valueAtPath(seed, edit.fieldPath) : fromSource;
      if (!Object.is(current, edit.baseValue)) {
        refused.push({
          edit,
          reason: `source now reads ${JSON.stringify(current)}, not the ${JSON.stringify(edit.baseValue)} this edit was written against — somebody changed it by hand`,
        });
        continue;
      }
      fresh.push(edit);
    }
    if (fresh.length === 0) continue;

    // The nation is validated with its whole group applied, not edit by edit:
    // a pair of changes can each be in range and be nonsense together, and
    // publishing half of a pair is worse than publishing neither.
    const outcome = mergeNation(seed, fresh);
    if (!outcome.ok) {
      for (const edit of fresh) {
        refused.push({
          edit,
          reason: outcome.rejections.map((r) => `${r.fieldPath}: ${r.reason}`).join("; "),
        });
      }
      continue;
    }
    applicable.push(...fresh);
  }

  return { applicable, refused };
}

/**
 * Write the applicable edits into source, rebuild, and stamp them published.
 *
 * A build failure reverts the file. A whitelisted scalar written at a path the
 * schema already accepted should never break the build, but "should never" is
 * not a reason to leave a broken working tree behind if it does.
 */
export async function publishEdits(session, edits) {
  const original = await readFile(NATIONS_PATH, "utf8");
  const plan = planPublish(edits, original);
  if (plan.applicable.length === 0) return { ok: true, published: 0, refused: plan.refused };

  let source = original;
  const written = [];

  for (const edit of plan.applicable) {
    // Blocks are re-derived per edit: each write shifts every offset after it.
    const block = nationBlocksByCode(source).get(edit.recordId);
    if (!block) {
      plan.refused.push({ edit, reason: `no block for "${edit.recordId}" in nations.ts` });
      continue;
    }
    const result = writeScalarAtPath(source, block.start, block.end, edit.fieldPath, edit.newValue);
    if (!result.ok) {
      plan.refused.push({ edit, reason: result.reason });
      continue;
    }
    source = result.source;
    written.push(edit);
  }

  if (written.length === 0) return { ok: true, published: 0, refused: plan.refused };

  await writeFile(NATIONS_PATH, source, "utf8");
  try {
    execFileSync("pnpm", ["--filter", "@admin/world", "run", "build"], { cwd: REPO_ROOT, stdio: "pipe" });
  } catch (error) {
    await writeFile(NATIONS_PATH, original, "utf8");
    const output = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
    return { ok: false, reason: `rebuild failed, every edit reverted:\n${output.slice(0, 2000)}`, refused: plan.refused };
  }

  const stamp = await markPublished(session, written.map((edit) => edit.id));
  if (!stamp.ok) {
    // Source is correct and the build is green; only the bookkeeping failed.
    // Reverting here would throw away a good edit to fix a stale row, so the
    // failure is reported and the rows stay pending — republishing them is a
    // no-op that clears them.
    return {
      ok: true,
      published: written.length,
      refused: plan.refused,
      warning: `written to source and rebuilt, but marking them published failed: ${stamp.reason}. Re-run publish to clear them.`,
    };
  }

  return { ok: true, published: written.length, refused: plan.refused };
}
