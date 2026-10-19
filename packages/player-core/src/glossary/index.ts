import { DESK_EXPLAINERS, DESK_GLOSSARY } from "./desk.js";
import { GOVERNMENT_EXPLAINERS, GOVERNMENT_GLOSSARY } from "./government.js";
import { POLICY_EXPLAINERS, POLICY_GLOSSARY } from "./policy.js";
import { RECORD_EXPLAINERS, RECORD_GLOSSARY } from "./record.js";
import { WORLD_EXPLAINERS, WORLD_GLOSSARY } from "./world.js";
import type { Explainer, GlossaryEntry } from "./types.js";

export type { Explainer, ExplainerCastMember, ExplainerExample, ExplainerLink, ExplainerStep, ExplainerThreshold, GlossaryEntry } from "./types.js";

// One file per area of government, so the people who write an area's terms
// own one file between them; this joins them into the one glossary.

export const GLOSSARY: readonly GlossaryEntry[] = [
  ...DESK_GLOSSARY,
  ...GOVERNMENT_GLOSSARY,
  ...POLICY_GLOSSARY,
  ...WORLD_GLOSSARY,
  ...RECORD_GLOSSARY,
];

export const EXPLAINERS: readonly Explainer[] = [
  ...DESK_EXPLAINERS,
  ...GOVERNMENT_EXPLAINERS,
  ...POLICY_EXPLAINERS,
  ...WORLD_EXPLAINERS,
  ...RECORD_EXPLAINERS,
];

const GLOSSARY_BY_ID: ReadonlyMap<string, GlossaryEntry> = new Map(GLOSSARY.map((entry) => [entry.id, entry]));
const EXPLAINERS_BY_ID: ReadonlyMap<string, Explainer> = new Map(EXPLAINERS.map((entry) => [entry.id, entry]));

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY_BY_ID.get(id);
}

export function explainer(id: string): Explainer | undefined {
  return EXPLAINERS_BY_ID.get(id);
}

export { HANDBOOK, HANDBOOK_INTRO, handbookChapter, chapterForExplainer, type HandbookChapter } from "./handbook.js";
