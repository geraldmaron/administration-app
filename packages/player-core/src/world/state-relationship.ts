import { underDeclaredEmergency, projectGovernorWillingness, type Campaign, type UsParty, type WillingnessForecast } from "@admin/engine";
import type { StateId } from "@admin/world";
import { PARTY_WORDS, governorDispositionWord } from "./state-dossier";
import { localeMatters, localeMissions, openLocaleActCount, type LocaleMissionView } from "./locale-act-options";

// The President's standing with one state, read off what the engine already
// holds: the governor's disposition toward the administration, the matters
// the state has put in front of Washington, and whether a declaration is over
// it. Nothing here is a new rule; a state with no governor reads as such.

export type RelationshipBand = "allied" | "cooperative" | "guarded" | "opposed";

export type StateRelationship = {
  readonly id: StateId;
  readonly governor?: { readonly person: string; readonly name: string; readonly party: UsParty; readonly partyWord: string };
  /** 0..1 toward the administration; absent when no governor is seated. */
  readonly disposition?: number;
  readonly band?: RelationshipBand;
  /** The ordinal word: Allied, Cooperative, Guarded or Opposed; absent with no governor. */
  readonly word: string;
  /** What the standing means for an ask such as deploying the Guard. */
  readonly meaning: string;
  /** Whether the governor is below the line at which they go along with an ask. */
  readonly leansAgainst: boolean;
  readonly termEnds?: string;
  /** Requests and running conditions that call for a federal answer, requests first. */
  readonly needs: readonly { readonly cause: string; readonly title: string; readonly requested: boolean }[];
  readonly needsCount: number;
  readonly declared: boolean;
  /** Acts open against the lead matter this week; zero when there is nothing to answer. */
  readonly actCount: number;
  /** Federal missions running in the state, newest first. */
  readonly missions: readonly LocaleMissionView[];
};

const MEANING: Readonly<Record<WillingnessForecast, string>> = {
  likely: "Likely to agree to sending in the National Guard.",
  close: "Could go either way on sending in the National Guard.",
  unlikely: "Unlikely to agree to sending in the National Guard.",
};

const BAND_OF: Readonly<Record<string, RelationshipBand>> = { Allied: "allied", Cooperative: "cooperative", Guarded: "guarded", Opposed: "opposed" };

/** Where the President stands with one state: its governor, what it needs from Washington, and what can be done about it. */
export function stateRelationship(campaign: Campaign, id: StateId): StateRelationship | undefined {
  const runtime = campaign.states[id];
  if (!runtime) return undefined;
  const matters = localeMatters(campaign, id);
  const lead = matters[0];
  const standing = runtime.governor;
  const word = standing ? governorDispositionWord(standing.disposition) : undefined;
  const forecast = standing ? projectGovernorWillingness(campaign, id, { severity: lead?.severity ?? 0, of: "national-guard" }).forecast : undefined;
  return {
    id,
    ...(standing ? { governor: { person: standing.person, name: campaign.people[standing.person]?.base.name ?? "The governor", party: standing.party, partyWord: PARTY_WORDS[standing.party] } } : {}),
    ...(standing ? { disposition: standing.disposition } : {}),
    ...(word ? { band: BAND_OF[word]! } : {}),
    word: word ?? "No governor",
    meaning: forecast ? MEANING[forecast] : id === "DC" ? "Washington, D.C., has no governor, so federal actions there don't need a state's approval." : "There's no governor in office right now, so there's no relationship to show.",
    leansAgainst: word === "Guarded" || word === "Opposed",
    ...(standing?.termEnds ? { termEnds: standing.termEnds } : {}),
    needs: matters.map((matter) => ({ cause: matter.cause, title: matter.title, requested: matter.request !== undefined })),
    needsCount: matters.length,
    declared: underDeclaredEmergency(campaign, id),
    actCount: lead ? openLocaleActCount(campaign, id, lead.cause) : 0,
    missions: localeMissions(campaign, id),
  };
}
