import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCoverLocks } from "../../packages/content/dist/cover-locks.js";
import { plateExtension } from "./article-form-body.mjs";

// Drafts and uploaded plates for the cover form. The house lock lives under
// content/cover-locks/; this directory is only editor work.

export const ARTICLES_WORK = () => process.env.ARTICLES_WORK ?? path.join("content", "articles-work");

const draftPath = (id) => path.join(ARTICLES_WORK(), id, "draft.json");

export async function readDraft(id) {
  const raw = await readFile(draftPath(id), "utf8").catch(() => undefined);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function writeDraft(id, draft) {
  const dir = path.join(ARTICLES_WORK(), id);
  await mkdir(dir, { recursive: true });
  await writeFile(draftPath(id), `${JSON.stringify(draft, null, 2)}\n`);
  return draft;
}

export async function savePlate(id, file) {
  const ext = plateExtension(file);
  if (!ext) return { ok: false, reason: "plate must be a png, jpeg, or webp scan" };
  const dir = path.join(ARTICLES_WORK(), id);
  await mkdir(dir, { recursive: true });
  const assetPath = `plate${ext}`;
  await writeFile(path.join(dir, assetPath), file.bytes);
  return { ok: true, assetPath };
}

export function plateFilePath(id, assetPath) {
  const base = path.basename(assetPath ?? "");
  if (!base || base !== assetPath) return undefined;
  return path.join(ARTICLES_WORK(), id, base);
}

/** A path that is not a file on disk is not a plate. */
export async function resolvePlateAsset(id, assetPath) {
  const filePath = plateFilePath(id, assetPath);
  if (!filePath) return "";
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0 ? path.basename(filePath) : "";
  } catch {
    return "";
  }
}

export async function publishedRecord(id) {
  const raw = await readFile(path.join(ARTICLES_WORK(), id, "published.json"), "utf8").catch(() => undefined);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function stampPublished(id, coverPackage) {
  const dir = path.join(ARTICLES_WORK(), id);
  await mkdir(dir, { recursive: true });
  const record = { publishedAt: new Date().toISOString(), coverPackage };
  await writeFile(path.join(dir, "published.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export async function houseLocks() {
  return loadCoverLocks();
}

export function fieldsToInput(fields, plateAssetPath) {
  return {
    brief: {
      situation: fields.situation ?? "",
      metaphor: fields.metaphor ?? "",
      refuse: fields.refuse ?? "",
    },
    recipe: fields.recipe ?? "",
    plate: {
      assetPath: plateAssetPath ?? fields.plateAssetPath ?? "",
      lockCite: fields.lockCite ?? "",
    },
    kicker: fields.kicker ?? "",
    headline: fields.headline ?? "",
  };
}
