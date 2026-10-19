import { knownPersonContacts, legislativeAct, personNetworkFor, selectPerson, type Campaign, type GameDate } from "@admin/engine";
import type { PersonConnection, PersonId, PersonTieKind, TieProvenance } from "@admin/world";

/**
 * Which end of a tie the file's subject is standing at.
 *
 * `mentor` is the one kind that runs in a direction — `from` is the senior
 * figure and `to` the junior one — so a single edge is two different words
 * depending on whose file it is drawn on. Every other kind is symmetric and
 * ignores this.
 */
export type TieEnd = "from" | "to";

export type PersonConnectionRow = {
  readonly edge: PersonConnection;
  readonly otherId: PersonId;
  readonly otherName: string;
  readonly subjectEnd: TieEnd;
  readonly observed?: { readonly date: GameDate; readonly actId: string; readonly direction: "outgoing" | "incoming" };
};

/**
 * What the other person is, said about the subject of this file.
 *
 * The word for a mentorship is decided from the end it is read at rather than
 * from a second member of the enum, so a junior half of a mentorship reads
 * "Mentor" about the person who formed them and the senior half reads the
 * matching "Protégé" back — one tie, named right on both files it appears on.
 * The rule lives here rather than at a call site so the circle and the rows
 * beneath it cannot end up saying different words about one edge.
 */
const KIND_LABEL: Readonly<Record<PersonTieKind, string>> = {
  mentor: "Mentor",
  peer: "Peer",
  ally: "Ally",
  rival: "Rival",
  "former-colleague": "Former colleague",
  "prior-counterpart": "Prior counterpart",
};

export function connectionKindLabel(kind: PersonTieKind, subjectEnd: TieEnd): string {
  // A subject at the `from` end is the senior one, so the other party is whoever they formed.
  if (kind === "mentor" && subjectEnd === "from") return "Protégé";
  return KIND_LABEL[kind];
}

/**
 * Where the tie came from: the working world, school or party ticket the two
 * people actually shared, never inferred from what the tie is.
 *
 * The reason sentence names that world too, so the head of a row repeats it —
 * deliberately. A file carrying several former colleagues differs only in
 * where each one came from, and a reader running down the column needs that
 * word before the sentence rather than a clause into it.
 */
const PROVENANCE_LABEL: Readonly<Record<TieProvenance, string>> = {
  education: "Same school",
  party: "Party",
  "civil-service": "Civil service",
  military: "Military",
  intelligence: "Intelligence service",
  diplomatic: "Diplomatic corps",
  law: "Private practice",
  business: "Business",
  academia: "Academic life",
  "local-government": "Local government",
  press: "Press",
  activism: "Campaigning",
  medicine: "Medicine",
  labor: "Labor movement",
};

export function connectionProvenanceLabel(provenance: TieProvenance): string {
  return PROVENANCE_LABEL[provenance];
}

/**
 * Everything one tie says, composed once.
 *
 * The row draws this and the row's spoken label carries it. Assembled
 * separately out of the same facts, a screen reader can end up announcing
 * stale copy after the drawn line is rewritten; composed once, it cannot.
 */
export function connectionLine(row: PersonConnectionRow): string {
  const kind = connectionKindLabel(row.edge.kind, row.subjectEnd);
  if (row.observed) return `${row.observed.direction === "outgoing" ? "They reached out" : "They were approached"} to work on an issue together, and it's on record. ${row.edge.reason}`;
  return `A likely contact from their past, not proof of trust. ${kind}. ${connectionProvenanceLabel(row.edge.provenance)}. ${row.edge.reason}`;
}

export function connectionsForPerson(campaign: Campaign, personId: PersonId): readonly PersonConnectionRow[] {
  const network = personNetworkFor(campaign.people, campaign.seed, true);
  const rows: PersonConnectionRow[] = [];
  for (const edge of network) {
    if (edge.from !== personId && edge.to !== personId) continue;
    const subjectEnd: TieEnd = edge.from === personId ? "from" : "to";
    const otherId = subjectEnd === "from" ? edge.to : edge.from;
    const other = selectPerson(campaign, otherId);
    if (!other) continue;
    rows.push({ edge, otherId, otherName: other.base.name, subjectEnd });
  }
  for (const edge of knownPersonContacts(campaign)) {
    if (edge.from !== personId && edge.to !== personId) continue;
    const otherId = edge.from === personId ? edge.to : edge.from;
    const other = selectPerson(campaign, otherId);
    if (!other) continue;
    const index = rows.findIndex((row) => row.otherId === otherId);
    if (index >= 0) rows.splice(index, 1);
    rows.push({ otherId, otherName: other.base.name, subjectEnd: edge.from === personId ? "from" : "to",
      observed: { date: edge.date, actId: edge.actId, direction: edge.from === personId ? "outgoing" : "incoming" },
      edge: { from: edge.from, to: edge.to, kind: "peer", provenance: "civil-service", strength: 0.5, reason: `${edge.account} Issue: ${legislativeAct(edge.actId)?.title ?? "a bill in Congress"}.` } });
  }
  return rows.sort((left, right) => left.otherName.localeCompare(right.otherName));
}

/**
 * How a tie reads about the person whose file this is.
 *
 * Not a verdict on the other person — a mentor is not "good news" — but a
 * verdict on the tie: a rival is a liability on this file and an ally is not,
 * and a circle drawn in one ink would say the two were the same thing. A
 * mentorship is favorable read from either end, because having been formed by
 * somebody and having formed them are both a claim on them. The kinds that are
 * neither — a decade in the same service, a year in the same lecture hall, a
 * counterpart across a table — stay neutral rather than being flattered into
 * an alliance.
 */
const KIND_TONE: Readonly<Record<PersonTieKind, "favorable" | "adverse" | "neutral">> = {
  mentor: "favorable",
  ally: "favorable",
  rival: "adverse",
  peer: "neutral",
  "former-colleague": "neutral",
  "prior-counterpart": "neutral",
};

export function connectionTone(kind: PersonTieKind): "favorable" | "adverse" | "neutral" {
  return KIND_TONE[kind];
}

/**
 * The circle, ordered so the ties that change what a President does come
 * first: whoever formed this person or was formed by them, then who is
 * against them, then who is with them.
 *
 * `former-colleague` sorts last because most of the graph the engine draws is
 * that one kind — ranked any higher it would push the rare tie off the top of
 * a file that shows only a handful of them, behind a disclosure. Within a rank
 * the order stays alphabetical, because among ties of the same weight the
 * only useful order is a findable one.
 */
const KIND_RANK: Readonly<Record<PersonTieKind, number>> = {
  mentor: 0,
  rival: 1,
  ally: 2,
  "prior-counterpart": 3,
  peer: 4,
  "former-colleague": 5,
};

export function circleOrder(rows: readonly PersonConnectionRow[]): readonly PersonConnectionRow[] {
  return [...rows].sort((left, right) => {
    const rank = KIND_RANK[left.edge.kind] - KIND_RANK[right.edge.kind];
    if (rank !== 0) return rank;
    return left.otherName.localeCompare(right.otherName);
  });
}

/**
 * The circle in one sentence, for the file's own meta: how many ties, and how
 * many of them are against this person. A count of edges alone would be the
 * same number for a person with four patrons and one with four rivals.
 */
export function circleSummary(rows: readonly PersonConnectionRow[]): string {
  if (rows.length === 0) return "No known relationships";
  const recorded = rows.filter((row) => row.observed).length;
  return `${recorded} on-record working ties · ${rows.length - recorded} likely contacts from their past`;
}
