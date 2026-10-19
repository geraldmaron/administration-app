import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { objectLiteralSpan } from "./source-patch.mjs";

// The write path into the authored source that actually decides who the world
// is made of: the role profiles in packages/world/src/dataset/people.ts.
//
// No individual person is editable, because no individual person is stored —
// the 2,325 people a campaign meets are generated from these fifteen profiles
// and a seed, and the same seed regenerates them exactly. A console offering
// "edit this person" would be editing something that does not survive the next
// roll. Editing the profile is the honest version of the same intent: widen a
// competence band and every general in the world gets better.
//
// Same discipline as the posture patcher next door: isolate the target's own
// object literal by brace-counting from a known anchor, replace only whitelisted
// numeric literals inside it, rebuild @admin/world immediately, and revert the
// file if the build fails rather than leaving a broken tree.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PEOPLE_PATH = path.join(REPO_ROOT, "packages/world/src/dataset/people.ts");

export const ATTRIBUTES = ["competence", "loyalty", "ambition", "integrity", "charisma"];

/** Every role profile literal's span in the source, keyed by role id. */
function roleBlocks(source) {
  const blocks = new Map();
  for (const match of source.matchAll(/\{\s*\n\s*role:\s*"([a-z-]+)"/g)) {
    const [start, end] = objectLiteralSpan(source, match.index);
    blocks.set(match[1], { start, end });
  }
  return blocks;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Patch one role profile's numeric bands.
 *
 * @param {string} role e.g. "role-foreign-minister"
 * @param {{attributes?: Record<string, {min: number, max: number}>, ageRange?: {min: number, max: number}, ideologySpread?: number}} edit
 */
export async function setRoleProfile(role, edit) {
  const original = await readFile(PEOPLE_PATH, "utf8");
  const block = roleBlocks(original).get(role);
  if (!block) return { ok: false, reason: `no role profile "${role}" found in people.ts` };

  let body = original.slice(block.start, block.end);

  for (const [attribute, band] of Object.entries(edit.attributes ?? {})) {
    if (!ATTRIBUTES.includes(attribute)) return { ok: false, reason: `"${attribute}" is not an attribute` };
    const min = clamp01(band.min);
    const max = clamp01(band.max);
    if (min > max) return { ok: false, reason: `${attribute}: min ${min} is above max ${max}` };
    const pattern = new RegExp(`${attribute}:\\s*range\\(([\\d.]+),\\s*([\\d.]+)\\)`);
    if (!pattern.test(body)) return { ok: false, reason: `"${role}" has no ${attribute} range to replace — layout changed` };
    body = body.replace(pattern, `${attribute}: range(${min}, ${max})`);
  }

  if (edit.ageRange) {
    const min = Math.round(edit.ageRange.min);
    const max = Math.round(edit.ageRange.max);
    if (min < 18 || max > 100 || min > max) return { ok: false, reason: `age range ${min}–${max} is not sane` };
    const pattern = /ageRange:\s*\{\s*min:\s*(\d+),\s*max:\s*(\d+)\s*\}/;
    if (!pattern.test(body)) return { ok: false, reason: `"${role}" has no ageRange to replace — layout changed` };
    body = body.replace(pattern, `ageRange: { min: ${min}, max: ${max} }`);
  }

  if (edit.ideologySpread !== undefined) {
    const spread = clamp01(edit.ideologySpread);
    const pattern = /ideologySpread:\s*([\d.]+)/;
    if (!pattern.test(body)) return { ok: false, reason: `"${role}" has no ideologySpread to replace — layout changed` };
    body = body.replace(pattern, `ideologySpread: ${spread}`);
  }

  if (body === original.slice(block.start, block.end)) return { ok: true, role, unchanged: true };

  const patched = original.slice(0, block.start) + body + original.slice(block.end);
  await writeFile(PEOPLE_PATH, patched, "utf8");
  try {
    execFileSync("pnpm", ["--filter", "@admin/world", "run", "build"], { cwd: REPO_ROOT, stdio: "pipe" });
  } catch (error) {
    await writeFile(PEOPLE_PATH, original, "utf8");
    const output = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
    return { ok: false, reason: `rebuild failed, edit reverted:\n${output.slice(0, 2000)}` };
  }
  return { ok: true, role };
}
