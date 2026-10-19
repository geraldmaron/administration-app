import type { Discipline } from "./ic-elements.js";
import type { CollectionFinding, TaskingTargetKind } from "./intelligence.js";

/** A scoped collection request. Assessment questions use broader intent/capability/stability judgments. */
export type CollectionFocus = "overview" | "external-intent" | "force-posture" | "economic-pressure" | "domestic-public-conditions";
export type CollectionTopic = CollectionFinding["topic"];

export const COLLECTION_FOCUS_QUESTIONS: Readonly<Record<CollectionFocus, string>> = {
  overview: "What does current collection show across this government's activities and conditions?",
  "external-intent": "What does current collection show about this government's external intentions and actions?",
  "force-posture": "What does current collection show about this government's forces and readiness?",
  "economic-pressure": "What does current collection show about this government's economic pressure?",
  "domestic-public-conditions": "What do public state records show about current conditions and governor requests?",
};

export const COLLECTION_FOCUS_LABELS: Readonly<Record<CollectionFocus, string>> = {
  overview: "General reporting",
  "external-intent": "External intentions and actions",
  "force-posture": "Forces and readiness",
  "economic-pressure": "Economic pressure",
  "domestic-public-conditions": "Public state conditions",
};

export const DISCIPLINE_TOPICS: Readonly<Record<Discipline, readonly CollectionTopic[]>> = {
  humint: ["external-intent", "stability"], sigint: ["external-intent", "military-readiness"],
  geoint: ["military-readiness"], masint: ["military-readiness"],
  osint: ["stability", "financial-pressure"], finint: ["financial-pressure"],
  "all-source": ["external-intent", "military-readiness", "financial-pressure", "stability"],
};

const FOCUS_TOPICS: Readonly<Record<CollectionFocus, readonly CollectionTopic[]>> = {
  overview: ["external-intent", "military-readiness", "financial-pressure", "stability"],
  "external-intent": ["external-intent"],
  "force-posture": ["military-readiness"],
  "economic-pressure": ["financial-pressure"],
  "domestic-public-conditions": ["domestic-security"],
};

export function collectionTopics(discipline: Discipline, focus: CollectionFocus | undefined, kind: TaskingTargetKind): readonly CollectionTopic[] {
  if (kind === "domestic-state") return focus === undefined || focus === "domestic-public-conditions" ? ["domestic-security"] : [];
  const available = DISCIPLINE_TOPICS[discipline];
  return focus === undefined ? available : FOCUS_TOPICS[focus].filter((topic) => available.includes(topic));
}

export function collectionFocusUnavailable(discipline: Discipline, focus: CollectionFocus | undefined, kind: TaskingTargetKind): string | undefined {
  if (focus === undefined) return undefined; // Existing saves and callers remain general reporting.
  if (kind === "domestic-state") return focus === "domestic-public-conditions" ? undefined : "Choose public state conditions for a domestic-state tasking.";
  if (focus === "domestic-public-conditions") return "Public state conditions can be tasked only against a state through DHS I&A open sources.";
  if (collectionTopics(discipline, focus, kind).length === 0) return `${discipline.toUpperCase()} cannot obtain ${COLLECTION_FOCUS_LABELS[focus].toLowerCase()} through this desk. Choose a compatible discipline or focus.`;
  return undefined;
}
