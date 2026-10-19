import type { EntityRef, EntityRefKind } from "../calendar/types";

/**
 * The subjects a door names, read back off the route tree's own patterns.
 *
 * A desk row carries its door and not a typed subject list; every dossier
 * route in `navigation/places.ts` spells its subject as the last path segment,
 * so the door is enough to say which person, government, bill or case a row
 * is about.
 */
const DOOR_PATTERNS: readonly { readonly kind: EntityRefKind; readonly pattern: RegExp }[] = [
  { kind: "person", pattern: /^\/washington\/person\/([^/?#]+)/ },
  { kind: "bill", pattern: /^\/washington\/congress\/bill\/([^/?#]+)/ },
  { kind: "case", pattern: /^\/washington\/courts\/case\/([^/?#]+)/ },
  { kind: "state", pattern: /^\/nation\/state\/([^/?#]+)/ },
  { kind: "order", pattern: /^\/nation\/policy\/order\/([^/?#]+)/ },
  { kind: "nation", pattern: /^\/world\/nation\/([^/?#]+)/ },
  { kind: "war", pattern: /^\/world\/war\/([^/?#]+)/ },
];

export function refsFromHref(href: string | undefined): readonly EntityRef[] {
  if (href === undefined) return [];
  return DOOR_PATTERNS.flatMap(({ kind, pattern }) => {
    const id = pattern.exec(href)?.[1];
    return id === undefined ? [] : [{ kind, id: decodeURIComponent(id) }];
  });
}
