import { NationInput, metricFor, metricRejection } from "@admin/world";

// The overlay's pure half: which fields an editor may change, how a set of
// edits merges over the seed record, and whether the result is still a nation.
// Everything here is a function of its arguments — no Supabase, no filesystem —
// because it is the logic deciding whether a write to the authored dataset is
// safe, and that decision has to be testable without standing up a database.
//
// An edit is `{recordId, fieldPath, baseValue, newValue}`; a field path is
// dotted, e.g. `stats.economy.inflation`.

const isScalar = (value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean";

// Arrays and records are excluded rather than merely unimplemented. Every
// non-scalar in a nation is a list of ids or a weighted mix whose entries have
// to stay consistent with something else in the dataset — memberships mirror
// the organization registry, neighbors must be symmetric, an energy mix must
// sum. A form editing one of those in isolation produces a record that
// validates and is still wrong, which is worse than one the console refuses.
//
// Bands and memberships are excluded for a different reason: both are derived
// at assembly, so a published change to either is overwritten the next time the
// dataset is built.
const SKIPPED_ROOTS = new Set(["bands", "memberships"]);

// A nation's id is what every overlay row, relationship, membership and piece
// of content keys off. Changing it is a rename across the whole dataset, not a
// field edit — and in source it is written as a constant reference
// (`id: US_ID`) rather than a literal, so a scalar write would replace the
// reference with a bare string and fail the branded-type check at build.
const SKIPPED_PATHS = new Set(["id"]);

/**
 * Every scalar leaf of a nation, as dotted paths.
 *
 * Derived from the record rather than listed, so a field added to NationStats
 * becomes editable without an edit here — and cannot be silently left
 * uneditable because somebody forgot to extend a list.
 *
 * @returns {string[]}
 */
export function scalarLeafPaths(record, prefix = "") {
  if (record === null || typeof record !== "object" || Array.isArray(record)) return [];
  const paths = [];
  for (const [key, value] of Object.entries(record)) {
    if (!prefix && SKIPPED_ROOTS.has(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (SKIPPED_PATHS.has(path)) continue;
    if (isScalar(value)) paths.push(path);
    else paths.push(...scalarLeafPaths(value, path));
  }
  return paths;
}

export function valueAtPath(record, path) {
  return path.split(".").reduce((node, segment) => {
    if (node === null || typeof node !== "object") return undefined;
    return node[segment];
  }, record);
}

/**
 * `record` with `path` set to `value`, copied the whole way down.
 *
 * Structural sharing everywhere the path does not go: the caller holds the seed
 * record from `@admin/world`, which is module-level state the rest of the
 * console reads, and mutating it would make one editor's unsaved change
 * everyone's dataset.
 */
export function withValueAtPath(record, path, value) {
  const [head, ...rest] = path.split(".");
  if (head === undefined) return record;
  return {
    ...record,
    [head]: rest.length === 0 ? value : withValueAtPath(record[head] ?? {}, rest.join("."), value),
  };
}

/** The seed record with every edit applied, in order. */
export function applyEdits(record, edits) {
  return edits.reduce((merged, edit) => withValueAtPath(merged, edit.fieldPath, edit.newValue), record);
}

/**
 * Why an edit may not be written at all: the path has to name a scalar leaf
 * that exists, and the new value has to be the same kind of thing as the one it
 * replaces. A number field handed the string "0.04" is the whole reason the
 * check exists — form bodies are strings, and a nation whose inflation is
 * `"0.04"` passes every eyeball test and fails at the first arithmetic.
 *
 * @returns {{fieldPath: string, reason: string} | undefined}
 */
export function rejectionFor(seedRecord, edit) {
  const current = valueAtPath(seedRecord, edit.fieldPath);
  if (current === undefined) {
    return { fieldPath: edit.fieldPath, reason: `no field "${edit.fieldPath}" on this record` };
  }
  if (!isScalar(current)) {
    return { fieldPath: edit.fieldPath, reason: `"${edit.fieldPath}" is not a scalar field — lists and mixes are not editable here` };
  }
  if (typeof edit.newValue !== typeof current) {
    return { fieldPath: edit.fieldPath, reason: `"${edit.fieldPath}" is a ${typeof current}, got ${typeof edit.newValue}` };
  }
  if (typeof edit.newValue === "number" && !Number.isFinite(edit.newValue)) {
    return { fieldPath: edit.fieldPath, reason: `"${edit.fieldPath}" must be a finite number` };
  }
  // The registry knows the schema's bounds and an enum's options, so a value
  // outside them is refused at save rather than at publish.
  const metric = metricFor(edit.fieldPath);
  const refused = metric ? metricRejection(metric, edit.newValue) : undefined;
  if (refused) return { fieldPath: edit.fieldPath, reason: refused };
  return undefined;
}

/**
 * Whether the seed still says what the editor thought it said.
 *
 * The dataset is hand-edited in TypeScript by people who are not using this
 * console. An overlay row written against one value and published against
 * another silently discards whichever edit landed second, so a stale row is
 * refused rather than applied — the editor re-reads the field and decides.
 */
export function isStale(seedRecord, edit) {
  return !Object.is(valueAtPath(seedRecord, edit.fieldPath), edit.baseValue);
}

/**
 * The seed nation with every edit applied, provided the result is still a
 * nation. Zod is the backstop the per-field checks cannot be: a debt-to-GDP
 * ratio of 40 is a number replacing a number, and only NationInput knows the
 * ceiling is 5.
 *
 * @returns {{ok: true, nation: object} | {ok: false, rejections: {fieldPath: string, reason: string}[]}}
 */
export function mergeNation(seedNation, edits) {
  const rejections = edits.map((edit) => rejectionFor(seedNation, edit)).filter((r) => r !== undefined);
  if (rejections.length > 0) return { ok: false, rejections };

  const merged = applyEdits(seedNation, edits);
  // NationInput accepts neither derived field, so both are dropped before the
  // merged record is offered to it.
  const { bands, memberships, ...input } = merged;
  void bands;
  void memberships;
  const parsed = NationInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      rejections: parsed.error.issues.map((issue) => ({ fieldPath: issue.path.join("."), reason: issue.message })),
    };
  }
  return { ok: true, nation: merged };
}
