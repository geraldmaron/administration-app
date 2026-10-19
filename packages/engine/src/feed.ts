// Presentation readings for a feed item: its topic slugs, and the scene class,
// register and facet hints an image is chosen by. Authored values on the item
// always win; the tables here only supply a default from the item's kind.
import type { FeedItem, SceneClass, SceneFacetHint, SceneRegister } from "./state.js";

const TOPIC_BY_KIND: Readonly<Record<FeedItem["kind"], readonly string[]>> = {
  "player-action": ["Foreign policy", "Washington"],
  "npc-action": ["World", "Diplomacy"],
  operator: ["Security", "Covert"],
  drift: ["Economy", "Markets"],
  press: ["Politics", "Media"],
  conflict: ["Security", "Defense"],
  condition: ["Domestic", "Crisis"],
  governance: ["Congress", "Law"],
  pursuit: ["Justice", "Investigation"],
  bloc: ["Alliances", "Trade"],
};

const KIND_SCENE_CLASS: Readonly<Record<FeedItem["kind"], SceneClass>> = {
  "player-action": "foreign-crisis",
  "npc-action": "foreign-crisis",
  operator: "espionage",
  drift: "economy",
  press: "scandal",
  conflict: "war",
  condition: "disaster",
  governance: "institution",
  pursuit: "justice",
  bloc: "foreign-crisis",
};

const KIND_SCENE_REGISTER: Readonly<Partial<Record<FeedItem["kind"], SceneRegister>>> = {
  conflict: "damaged",
  condition: "strained",
  operator: "intact",
  press: "intact",
  governance: "intact",
  pursuit: "strained",
};

/** Topic slugs for the wire header. Authored tags win; kind defaults when absent. */
export function feedTopics(item: FeedItem): readonly string[] {
  const tags = item.facts?.topicTags;
  if (tags !== undefined && tags.length > 0) return tags.slice(0, 2);
  return TOPIC_BY_KIND[item.kind].slice(0, 2);
}

/** Resolved scene facet for hero photography: authored hint merged with kind defaults. */
export function feedSceneFacet(item: FeedItem): SceneFacetHint {
  const hint = item.facts?.sceneFacet ?? {};
  return {
    kind: hint.kind ?? KIND_SCENE_CLASS[item.kind],
    register: hint.register ?? KIND_SCENE_REGISTER[item.kind],
  };
}
