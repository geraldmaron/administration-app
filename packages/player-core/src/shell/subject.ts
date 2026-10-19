/**
 * Every durable player-facing object, and the one place each of them is inspected.
 *
 * Hrefs are ordinary pathnames. The web router and Electron host consume the
 * same strings; neither may assemble a subject URL by hand.
 */
import { place } from "../navigation/places";

export type SubjectRef =
  | { readonly kind: "person"; readonly id: string }
  | { readonly kind: "office"; readonly id: string }
  | { readonly kind: "nation"; readonly id: string }
  | { readonly kind: "nationAct"; readonly id: string }
  | { readonly kind: "state"; readonly id: string }
  | { readonly kind: "district"; readonly id: string }
  | { readonly kind: "bill"; readonly id: string }
  | { readonly kind: "order"; readonly id: string }
  | { readonly kind: "brief"; readonly id: string }
  | { readonly kind: "treaty"; readonly id: string }
  | { readonly kind: "war"; readonly id: string }
  | { readonly kind: "case"; readonly id: string }
  | { readonly kind: "summons"; readonly id: string }
  | { readonly kind: "metric"; readonly id: string }
  | { readonly kind: "service"; readonly id: string }
  | { readonly kind: "hillPost"; readonly id: string }
  | { readonly kind: "scandal"; readonly id: string }
  | { readonly kind: "dispatch"; readonly index: number };

export type SubjectKind = SubjectRef["kind"];

type SubjectSpec = {
  /** The name of the key that carries the subject's id, path segment or query, so extra query cannot overwrite it. */
  readonly key: string;
  readonly href: (id: string) => string;
  /** What a screen reader calls the place the subject opens on. */
  readonly noun: string;
};

export const SUBJECTS: Readonly<Record<SubjectKind, SubjectSpec>> = {
  person: { key: "id", href: place.person, noun: "profile" },
  office: { key: "id", href: place.office, noun: "office" },
  nation: { key: "id", href: place.country, noun: "country page" },
  nationAct: { key: "id", href: place.countryAct, noun: "actions page" },
  state: { key: "id", href: place.state, noun: "state page" },
  district: { key: "district", href: place.district, noun: "district page" },
  bill: { key: "id", href: place.bill, noun: "bill" },
  order: { key: "id", href: place.order, noun: "order" },
  brief: { key: "domain", href: place.policyDomain, noun: "policy page" },
  treaty: { key: "id", href: place.treaty, noun: "treaty" },
  war: { key: "id", href: place.war, noun: "war" },
  case: { key: "id", href: place.case, noun: "case" },
  summons: { key: "id", href: place.clock, noun: "summons" },
  metric: { key: "id", href: place.metric, noun: "measure" },
  service: { key: "service", href: place.service, noun: "service page" },
  dispatch: { key: "id", href: place.dispatch, noun: "dispatch" },
  hillPost: { key: "id", href: place.post, noun: "leadership post" },
  scandal: { key: "id", href: place.scandal, noun: "story" },
};

function subjectId(ref: SubjectRef): string {
  return ref.kind === "dispatch" ? String(ref.index) : ref.id;
}

function withQuery(href: string, query: Readonly<Record<string, string>>): string {
  const encoded = new URLSearchParams(query).toString();
  if (encoded.length === 0) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${encoded}`;
}

/** Where this subject is inspected. The one place a subject url is built. */
export function subjectHref(ref: SubjectRef): string {
  return SUBJECTS[ref.kind].href(subjectId(ref));
}

export function subjectHrefWith(ref: SubjectRef, query: Readonly<Record<string, string>>): string {
  const spec = SUBJECTS[ref.kind];
  if (spec.key in query) {
    throw new Error(`Query key "${spec.key}" carries ${ref.kind}'s own id and cannot be set as extra query.`);
  }
  return withQuery(subjectHref(ref), query);
}

export function subjectNoun(ref: SubjectRef): string {
  return SUBJECTS[ref.kind].noun;
}

export function subjectHint(ref: SubjectRef, name?: string): string {
  const noun = subjectNoun(ref);
  return name === undefined ? `Opens the ${noun}.` : `Opens ${name}'s ${noun}.`;
}
