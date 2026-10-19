import { metricFor, metricRejection, nationTraitProfiles, personPoolSpecs, worldDataset } from "@admin/world";
import { createRngStreams, generateWorldPool, rollWorldTraits } from "@admin/engine";
import { nationsIndexPage } from "./nations-view.mjs";
import { nationEditorPage, nationProfilePage } from "./nation-page.mjs";
import { metricsPage } from "./metrics-view.mjs";
import { forcesPage } from "./forces-view.mjs";
import { bandsPage, geographyPage, orgsPage } from "./world-views.mjs";
import { regionsPage } from "./nation-view.mjs";
import { pendingEdits, saveEdit } from "./overlay-store.mjs";
import { rejectionFor, scalarLeafPaths, valueAtPath } from "./overlay-model.mjs";

// The dataset half of the console's route table: what the world is, field by
// field, and the one write path into it (the overlay). Kept apart from the
// content half so each can be read as one thing.

export const DEFAULT_SEED = "studio-preview";

export const seedOf = (url) => url.searchParams.get("seed") || DEFAULT_SEED;

/** The campaign a seed rolls: traits inside their bands, and the whole generated cast. */
export function campaignFor(seed) {
  const streams = createRngStreams(seed);
  const nations = rollWorldTraits(worldDataset.nations, nationTraitProfiles, streams);
  const people = generateWorldPool(nations, personPoolSpecs, createRngStreams(seed));
  return { nations, people };
}

// A form body is entirely strings. Every field is coerced back to the type the
// registry says the metric carries, because a nation whose inflation is the
// string "0.04" satisfies zod's `.min(0)` on no field at all and instead fails
// at the first arithmetic the engine does with it.
function coerce(metric, raw) {
  if (metric.valueType === "number" || metric.valueType === "integer") return Number(raw);
  if (metric.valueType === "boolean") return raw === "true";
  return raw;
}

/**
 * Turn a submitted nation form into pending overlay rows.
 *
 * Only fields whose submitted value differs from source become edits; each is
 * judged against the registry (bounds, options, provenance) and the overlay's
 * own shape rule before anything is written, so one bad field refuses the
 * whole form rather than half-saving it.
 */
export async function saveNationEdits(session, nation, body) {
  const code = String(nation.id);
  const edits = [];
  for (const path of scalarLeafPaths(nation)) {
    const raw = body.get(path);
    if (raw === null) continue;
    const metric = metricFor(path);
    if (!metric) return { ok: false, reason: `${path} is not a metric the registry knows` };
    const seedValue = valueAtPath(nation, path);
    const newValue = coerce(metric, raw);
    if (Object.is(newValue, seedValue)) continue;
    const refused = metricRejection(metric, newValue);
    if (refused) return { ok: false, reason: refused };
    const edit = { recordId: code, fieldPath: path, baseValue: seedValue, newValue, note: body.get("note") ?? "" };
    const rejection = rejectionFor(nation, edit);
    if (rejection) return { ok: false, reason: `${rejection.fieldPath}: ${rejection.reason}` };
    edits.push(edit);
  }
  for (const edit of edits) {
    const outcome = await saveEdit(session, edit);
    if (!outcome.ok) return { ok: false, reason: `saving ${edit.fieldPath}: ${outcome.reason}` };
  }
  return { ok: true, saved: edits.length };
}

async function pendingByNation(session) {
  const counts = new Map();
  for (const edit of await pendingEdits(session)) counts.set(edit.recordId, (counts.get(edit.recordId) ?? 0) + 1);
  return counts;
}

/**
 * Serve a dataset route, or return false so the caller can try the rest.
 *
 * @param {{url: URL, req: import("node:http").IncomingMessage, session: unknown, html: (body: string) => void, redirect: (to: string) => void, readBody: () => Promise<URLSearchParams>}} ctx
 */
export async function handleDatasetRoute({ url, req, session, html, redirect, readBody }) {
  const seed = seedOf(url);
  if (req.method === "GET") {
    if (url.pathname === "/nations") return html(nationsIndexPage(seed, url.searchParams, await pendingByNation(session))), true;
    if (url.pathname === "/metrics") return html(metricsPage(url.searchParams)), true;
    if (url.pathname === "/forces") return html(forcesPage(url.searchParams)), true;
    if (url.pathname === "/bands") return html(bandsPage(seed)), true;
    if (url.pathname === "/regions") return html(regionsPage(campaignFor(seed).nations, seed)), true;
    if (url.pathname === "/geography") return html(geographyPage(campaignFor(seed).nations, seed)), true;
    if (url.pathname === "/orgs") return html(orgsPage(campaignFor(seed).nations, seed)), true;
  }

  const nationMatch = url.pathname.match(/^\/nations\/([A-Z]{2,4})(?:\/(edit))?$/);
  if (!nationMatch) return false;
  const [, code, action] = nationMatch;
  const authored = worldDataset.nations.find((candidate) => String(candidate.id) === code);
  if (!authored) return false;

  if (action === "edit" && req.method === "POST") {
    const outcome = await saveNationEdits(session, authored, await readBody());
    return redirect(
      outcome.ok
        ? `/nations/${code}/edit?${new URLSearchParams({ seed, notice: `${outcome.saved} edit(s) pending on ${code}` })}`
        : `/nations/${code}/edit?${new URLSearchParams({ seed, error: outcome.reason })}`,
    ), true;
  }
  if (req.method !== "GET") return false;
  const pending = await pendingEdits(session, code);
  if (action === "edit") {
    return html(nationEditorPage(authored, pending, seed, { error: url.searchParams.get("error") ?? undefined, notice: url.searchParams.get("notice") ?? undefined })), true;
  }
  // The campaign nation carries traits rolled from the seed; the record
  // carries the authored ones. The page shows both and edits bind to source.
  const rolled = campaignFor(seed).nations.find((candidate) => String(candidate.id) === code) ?? authored;
  return html(nationProfilePage(authored, rolled, seed, pending)), true;
}
