import { STANDARD_DASH, type KeyEntry } from "../data/key-entries";
import { PARTY_INK, type Party, type PartySeats } from "./types";

const PARTY_ORDER: readonly Party[] = ["democrat", "independent", "republican"];
const PARTY_WORD: Readonly<Record<Party, string>> = { democrat: "Democrats", independent: "Independents", republican: "Republicans" };

export type SeatMarkings = {
  /** The chart shows a recorded vote: a yea filled, a nay ringed, no vote faint. */
  readonly votes?: boolean;
  readonly leaders?: boolean;
  readonly selected?: boolean;
  readonly vacant?: boolean;
  /** The seats a majority needs, drawn as the dashed spoke. */
  readonly majority?: number;
};

/** The chamber chart's key: each party with its seats, then only the markings this chart draws. */
export function seatKeyEntries(parties: readonly PartySeats[], marks: SeatMarkings = {}): readonly KeyEntry[] {
  return [
    ...parties.map((party): KeyEntry => ({ id: `party:${party.party}`, kind: "dot", label: party.label, ink: PARTY_INK[party.party], figure: party.seats })),
    ...(marks.votes
      ? ([
          { id: "yea", kind: "dot", label: "Voted yes", ink: "color" },
          { id: "nay", kind: "ring", label: "Voted no", ink: "color" },
          { id: "none", kind: "dot", label: "No recorded vote", ink: "color", faint: true },
        ] as const)
      : []),
    ...(marks.vacant ? [{ id: "vacant", kind: "ring" as const, label: "Empty seat", ink: "borderColorStrong" as const }] : []),
    ...(marks.leaders ? [{ id: "leader", kind: "ring" as const, label: "Party leader", ink: "gold" as const, weight: 1.5 }] : []),
    ...(marks.selected ? [{ id: "selected", kind: "ring" as const, label: "Selected", ink: "gold" as const, weight: 3 }] : []),
    ...(marks.majority ? [{ id: "majority", kind: "dash" as const, label: `${marks.majority} needed for a majority`, ink: "color" as const, dash: "3 2" }] : []),
  ];
}

export type RollKeyInput = { readonly byParty?: Readonly<Record<Party, unknown>> };

/** The roll-call chart's key: the parties it splits by, yeas above and nays below the line, the gold line a question needed, and a pale column kept only as a total. */
export function rollKeyEntries(entries: readonly RollKeyInput[]): readonly KeyEntry[] {
  const split = entries.some((entry) => entry.byParty);
  const totalOnly = entries.some((entry) => !entry.byParty);
  return [
    ...(split ? PARTY_ORDER.map((party): KeyEntry => ({ id: `party:${party}`, kind: "swatch", label: PARTY_WORD[party], ink: PARTY_INK[party] })) : []),
    { id: "yea", kind: "shape", shape: "triangleUp", label: "Yes votes rise above the line", ink: "color" },
    { id: "nay", kind: "shape", shape: "triangleDown", label: "No votes fall below it", ink: "color" },
    { id: "needed", kind: "line", label: "Votes the question needed", ink: "gold", weight: 2 },
    ...(totalOnly ? [{ id: "total", kind: "swatch" as const, label: "Only the totals were recorded", ink: "colorTertiary" as const }] : []),
  ];
}

/** The position landscape's key: each party's ridge, its middle member dashed, the President's gold line, and the band being listed. */
export function ridgeKeyEntries(parties: readonly Party[], band: boolean): readonly KeyEntry[] {
  return [
    ...PARTY_ORDER.filter((party) => parties.includes(party)).map((party): KeyEntry => ({ id: `party:${party}`, kind: "swatch", label: PARTY_WORD[party], ink: PARTY_INK[party] })),
    { id: "median", kind: "dash", label: "The party's middle member", ink: "color", weight: 2, dash: "4 3" },
    { id: "you", kind: "line", label: "Your position", ink: "gold", weight: 4 },
    ...(band ? [{ id: "band", kind: "swatch" as const, label: "The part of the scale being listed", ink: "gold" as const, hollow: true }] : []),
  ];
}

/** The bench's key: lean is a judgment from recorded votes, drawn filled when clear and ringed when slight, never a party. */
export function benchKeyEntries(marks: { readonly chief?: boolean; readonly open?: boolean } = {}): readonly KeyEntry[] {
  return [
    { id: "left-clear", kind: "dot", label: "Votes lean clearly left", ink: "divergeCool" },
    { id: "left-slight", kind: "ring", label: "Lean slightly left", ink: "divergeCool", weight: 2 },
    { id: "right-slight", kind: "ring", label: "Lean slightly right", ink: "divergeWarm", weight: 2 },
    { id: "right-clear", kind: "dot", label: "Votes lean clearly right", ink: "divergeWarm" },
    { id: "unrecorded", kind: "ring", label: "No record yet", ink: "borderColorStrong", dash: STANDARD_DASH },
    ...(marks.open ? [{ id: "open", kind: "ring" as const, label: "Open seat", ink: "borderColorStrong" as const, dash: STANDARD_DASH }] : []),
    ...(marks.chief ? [{ id: "chief", kind: "ring" as const, label: "Chief Justice", ink: "gold" as const, weight: 2.5 }] : []),
  ];
}

