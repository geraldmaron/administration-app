import type { Campaign } from "./state-campaign.js";

// The structural diff the divergence probe and rewind consume.
//
// Split out of state-campaign.ts because it is the only walking code in a file
// that is otherwise entirely shapes, and the shapes file has to stay inside the
// size budget as the Campaign grows.

export type CampaignDiffEntry = {
  readonly path: string;
  readonly before: unknown;
  readonly after: unknown;
};

export function diffCampaign(before: Campaign, after: Campaign): readonly CampaignDiffEntry[] {
  const entries: CampaignDiffEntry[] = [];
  diffValue("", before, after, entries);
  return entries;
}


function diffValue(path: string, before: unknown, after: unknown, entries: CampaignDiffEntry[]): void {
  if (Object.is(before, after)) return;
  const bothPlainObjects = isPlainObject(before) && isPlainObject(after);
  if (!bothPlainObjects) {
    entries.push({ path, before, after });
    return;
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    diffValue(path ? `${path}.${key}` : key, before[key], after[key], entries);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
