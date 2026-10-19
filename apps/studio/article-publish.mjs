import { publishCoverPackage } from "@admin/content";
import { houseLocks, publishedRecord, readDraft, stampPublished } from "./article-store.mjs";

// The studio publish door. Drafts may be incomplete; this is the only write
// that stamps published.json, and it does not stamp unless the content gate
// accepts the package.

export async function publishArticleCover(id, input, catalog) {
  const locks = catalog ?? (await houseLocks());
  const judgment = publishCoverPackage(input, locks);
  if (!judgment.ok) return { ok: false, findings: judgment.findings };
  const record = await stampPublished(id, judgment.package);
  return { ok: true, record, coverPackage: judgment.package };
}

export async function coverStatus(id, input) {
  const catalog = await houseLocks();
  const judgment = publishCoverPackage(input, catalog);
  const published = await publishedRecord(id);
  return { judgment, published, catalog };
}

export async function draftInput(id, fallback) {
  const draft = await readDraft(id);
  if (!draft) return fallback;
  return {
    brief: {
      situation: draft.brief?.situation ?? fallback.brief.situation,
      metaphor: draft.brief?.metaphor ?? fallback.brief.metaphor,
      refuse: draft.brief?.refuse ?? fallback.brief.refuse,
    },
    recipe: draft.recipe ?? fallback.recipe,
    plate: {
      assetPath: draft.plate?.assetPath ?? fallback.plate.assetPath,
      lockCite: draft.plate?.lockCite ?? fallback.plate.lockCite,
    },
    kicker: draft.kicker ?? fallback.kicker,
    headline: draft.headline ?? fallback.headline,
  };
}
