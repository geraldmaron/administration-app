// HTTP handlers for the article cover editor: render the form, take a posted
// draft with its uploaded plate, and serve a saved plate back. Publishing is
// the only route here that writes outside the draft store.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { findArticle } from "./article-catalog.mjs";
import { parseFormBody, readRawBody } from "./article-form-body.mjs";
import { draftInput, publishArticleCover } from "./article-publish.mjs";
import { fieldsToInput, plateFilePath, readDraft, resolvePlateAsset, savePlate, writeDraft } from "./article-store.mjs";
import { articleFormPage, emptyInput } from "./articles-view.mjs";

const LOCK_SCAN = path.join("content", "cover-locks", "v1", "scan.jpg");

export async function renderArticleForm(id, query = new URLSearchParams()) {
  const article = findArticle(id);
  if (!article) return undefined;
  const fields = await draftInput(id, emptyInput(article));
  return articleFormPage(id, {
    fields,
    error: query.get("error") ?? undefined,
    notice: query.get("notice") ?? undefined,
  });
}

export async function handleArticlePost(req, id) {
  const article = findArticle(id);
  if (!article) return { status: 404, text: `no article "${id}"` };
  const raw = await readRawBody(req);
  const { fields, file } = parseFormBody(req, raw);
  const prior = (await readDraft(id)) ?? emptyInput(article);
  let plateAssetPath = await resolvePlateAsset(id, prior.plate?.assetPath ?? "");
  if (file?.field === "plate" && file.filename) {
    const saved = await savePlate(id, file);
    if (!saved.ok) {
      return { status: 303, location: `/articles/${encodeURIComponent(id)}?${new URLSearchParams({ error: saved.reason })}` };
    }
    plateAssetPath = saved.assetPath;
  }
  const input = fieldsToInput(fields, plateAssetPath);
  await writeDraft(id, input);
  if (fields.intent === "publish") {
    const outcome = await publishArticleCover(id, input);
    if (!outcome.ok) {
      return { status: 303, location: `/articles/${encodeURIComponent(id)}?${new URLSearchParams({ error: "Publish refused. The CoverPackage is not valid." })}` };
    }
    return { status: 303, location: `/articles/${encodeURIComponent(id)}?${new URLSearchParams({ notice: "Cover published." })}` };
  }
  return { status: 303, location: `/articles/${encodeURIComponent(id)}?${new URLSearchParams({ notice: "Draft saved." })}` };
}

export async function serveIfFile(res, filePath, type) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
  } catch {
    return false;
  }
  res.writeHead(200, { "content-type": type });
  createReadStream(filePath).pipe(res);
  return true;
}

export async function serveArticlePlate(res, id) {
  const draft = await readDraft(id);
  const filePath = plateFilePath(id, draft?.plate?.assetPath);
  if (!filePath) return false;
  const type = filePath.endsWith(".png") ? "image/png" : filePath.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return serveIfFile(res, filePath, type);
}

export function serveLockScan(res) {
  return serveIfFile(res, LOCK_SCAN, "image/jpeg");
}
