import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The overlay's I/O half: pending dataset edits, kept in a local JSON file.
//
// The console is a single-operator, localhost-only tool with no sign-in gate,
// so there is no session to attribute a write to and no policy to enforce —
// every operator who can reach this port already has full access. The file
// lives outside the repo tree's tracked files (git-ignored) so pending edits
// survive a restart without ever being mistaken for authored source.

export const overlayEnabled = true;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STORE_FILE = path.join(HERE, ".local", "overlay-edits.json");

function readAll() {
  if (!existsSync(STORE_FILE)) return [];
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    // A corrupt or half-written file is treated as empty rather than a crash:
    // pending edits are working state, not authored source, and losing them
    // to a bad read is recoverable in a way a dead console is not.
    return [];
  }
}

function writeAll(rows) {
  mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(rows, null, 2));
}

/**
 * The operator's dataset role.
 *
 * The console has no sign-in gate, so there is exactly one role: whoever can
 * reach this localhost port can read, edit, and publish. `session` is kept as
 * a parameter only so callers don't need a conditional signature.
 *
 * @returns {Promise<"admin">}
 */
export async function datasetRole(_session) {
  return "admin";
}

// Publishing rewrites the source the game is built from — the only action in
// the console whose consequence outlives the console.
export const canPublish = (role) => role === "admin";

/** Every pending edit, newest first, optionally for one record. */
export async function pendingEdits(_session, recordId) {
  const rows = readAll()
    .filter((row) => row.entityKind === "nation" && !row.publishedAt)
    .filter((row) => !recordId || row.recordId === recordId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

/**
 * Write one pending edit, replacing any pending edit to the same field.
 */
export async function saveEdit(_session, edit) {
  const rows = readAll();
  const kept = rows.filter(
    (row) => row.publishedAt || row.entityKind !== "nation" || row.recordId !== edit.recordId || row.fieldPath !== edit.fieldPath,
  );
  kept.push({
    id: randomUUID(),
    entityKind: "nation",
    recordId: edit.recordId,
    fieldPath: edit.fieldPath,
    baseValue: edit.baseValue,
    newValue: edit.newValue,
    note: edit.note ?? "",
    authorEmail: "",
    createdAt: new Date().toISOString(),
    publishedAt: null,
  });
  writeAll(kept);
  return { ok: true };
}

export async function discardEdit(_session, id) {
  const rows = readAll();
  writeAll(rows.filter((row) => row.id !== id));
  return { ok: true };
}

/** Stamp rows published. */
export async function markPublished(_session, ids) {
  const rows = readAll();
  const idSet = new Set(ids);
  const publishedAt = new Date().toISOString();
  let published = 0;
  const next = rows.map((row) => {
    if (!idSet.has(row.id) || row.publishedAt) return row;
    published += 1;
    return { ...row, publishedAt };
  });
  writeAll(next);
  return { ok: true, published };
}
