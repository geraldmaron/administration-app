import { TARIFF_STATUTE_AUTHORITY, authorityById, type ActFamily, type ActOption, type Authority } from "@admin/player-core";

// The law each foreign act rests on, as registry records.
// Only ids are written here; the citation, title and summary come from
// player-core's authority registry, so a screen can never print a citation
// the registry does not hold. An id that stops resolving fails the paired test.

/** Each instrument rung and kind of act to the authorities that grant or govern it, most specific first. */
const BY_OPTION: Readonly<Record<string, readonly string[]>> = {
  "diplomatic-1": ["const-art2-s3"],
  "diplomatic-2": ["const-art2-s3"],
  "diplomatic-3": ["const-art2-s2-cl2", "const-art2-s3"],
  "diplomatic-4": ["const-art2-s3"],
  "diplomatic-5": ["const-art2-s3"],
  "economic-1": ["const-art2-s1"],
  "economic-3": ["ieepa", "national-emergencies-act"],
  "economic-4": ["ieepa", "national-emergencies-act"],
  "economic-5": ["ieepa", "national-emergencies-act"],
  "covert-1": ["eo-12333", "fisa"],
  "covert-2": ["covert-action-findings", "eo-12333"],
  "covert-3": ["covert-action-findings", "eo-12333"],
  "covert-4": ["covert-action-findings", "eo-12333"],
  "covert-5": ["covert-action-findings", "eo-12333"],
  "military-1": ["const-art2-s2-cl1", "combatant-commands"],
  "military-2": ["const-art2-s2-cl1", "war-powers-resolution"],
  "military-3": ["const-art2-s2-cl1", "war-powers-resolution"],
  "military-4": ["const-art2-s2-cl1", "war-powers-resolution"],
  "military-5": ["const-art2-s2-cl1", "war-powers-resolution", "const-art1-s8-cl11"],
  "assistance-1": ["const-art1-s9-cl7"],
  "assistance-2": ["const-art1-s9-cl7"],
  "assistance-3": ["const-art1-s9-cl7"],
  "assistance-4": ["arms-export-notification"],
  "assistance-5": ["const-art2-s2-cl2", "case-zablocki"],
  indict: ["attorney-general-functions"],
  capture: ["attorney-general-functions", "const-art2-s2-cl1", "war-powers-resolution"],
  tariff: ["trade-act-301"],
  authorization: ["const-art1-s8-cl11", "war-powers-resolution"],
};

/** Kinds of act the catalogue builds from engine tables, so a new kind still finds its law. */
const BY_FAMILY: Readonly<Record<ActFamily, readonly string[]>> = {
  meet: ["const-art2-s3"],
  sign: ["const-art2-s2-cl2", "case-zablocki"],
  assist: ["const-art1-s9-cl7"],
  tariff: ["trade-act-301"],
  diplomatic: ["const-art2-s3"],
  justice: ["attorney-general-functions"],
  economic: ["ieepa", "national-emergencies-act"],
  covert: ["covert-action-findings", "eo-12333"],
  military: ["const-art2-s2-cl1", "war-powers-resolution"],
  congress: ["const-art1-s8-cl11", "war-powers-resolution"],
};

/** The topics a screen's contextual help names, each the records behind it. */
export const LAW_TOPICS = {
  "war-powers": ["war-powers-resolution", "const-art2-s2-cl1", "const-art1-s8-cl11"],
  tariffs: ["trade-expansion-232", "trade-act-301", "trade-act-201", "trade-act-122", "tariff-act-338"],
  sanctions: ["ieepa", "national-emergencies-act"],
  treaties: ["const-art2-s2-cl2", "case-zablocki"],
  "intelligence-collection": ["eo-12333", "fisa"],
  "intelligence-findings": ["covert-action-findings"],
  classification: ["eo-13526"],
  commands: ["combatant-commands", "const-art2-s2-cl1"],
  arms: ["arms-export-notification"],
  diplomacy: ["const-art2-s3", "const-art2-s2-cl2"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type LawTopic = keyof typeof LAW_TOPICS;

function resolved(ids: readonly string[]): readonly Authority[] {
  return ids.flatMap((id) => {
    const authority = authorityById(id);
    return authority ? [authority] : [];
  });
}

/** Each tariff statute's registry record, keyed loosely so a measure's optional statute can index it. */
export const TARIFF_LAW: Readonly<Record<string, string>> = TARIFF_STATUTE_AUTHORITY;

/** The authorities an act on a foreign government rests on; a tariff rests on the law chosen for it. Engagement and treaty kinds fall to their family. */
export function actAuthorities(option: Pick<ActOption, "id" | "family">, statute?: string): readonly Authority[] {
  const chosen = statute ? TARIFF_LAW[statute] : undefined;
  if (option.family === "tariff" && chosen) return resolved([chosen]);
  return resolved(BY_OPTION[option.id] ?? BY_FAMILY[option.family]);
}

export function topicAuthorities(topic: LawTopic): readonly Authority[] {
  return resolved(LAW_TOPICS[topic]);
}

/**
 * The authority each War Powers report option claims. Written out because the
 * registry's free-text resolver reads "Article II, as Commander in Chief" as
 * Article II, Section 1, and the clause the report claims is Section 2.
 */
const REPORT_LAW: Readonly<Record<string, string>> = {
  "Article II, as Commander in Chief": "const-art2-s2-cl1",
  "the authorization for the use of military force in effect": "war-powers-resolution",
  "the collective self-defense of an ally": "un-charter-art51",
};

export function reportAuthority(claim: string): Authority | undefined {
  const id = REPORT_LAW[claim];
  return id ? authorityById(id) : undefined;
}

/** The law over each kind of standing commitment abroad: money on appropriation, arms on notice to Congress, forces on the War Powers clocks. */
const COMMITMENT_LAW: Readonly<Record<string, readonly string[]>> = {
  aid: ["const-art1-s9-cl7"],
  program: ["const-art1-s9-cl7"],
  arms: ["arms-export-notification"],
  deployment: ["const-art2-s2-cl1", "war-powers-resolution"],
  basing: ["const-art2-s2-cl1", "combatant-commands"],
  sustainment: ["const-art2-s2-cl1", "war-powers-resolution"],
};

export function commitmentAuthorities(kind: string): readonly Authority[] {
  return resolved(COMMITMENT_LAW[kind] ?? ["const-art2-s2-cl1"]);
}

/** The emblem of the department that carries out each kind of act: the institution the act is done through. */
const FAMILY_SEAL: Readonly<Record<ActFamily, string>> = {
  meet: "INST-STATE",
  sign: "INST-STATE",
  assist: "INST-STATE",
  tariff: "INST-USTR",
  diplomatic: "INST-STATE",
  justice: "INST-DOJ",
  economic: "INST-TREASURY",
  covert: "INST-CIA",
  military: "INST-DOD",
  congress: "INST-CONGRESS",
};

export function familySeal(family: ActFamily): string {
  return FAMILY_SEAL[family];
}

/** The department each military service sits in, for the service's own emblem where it has none. */
const SERVICE_SEAL: Readonly<Record<string, string>> = {
  army: "INST-ARMY",
  navy: "INST-NAVY",
  marines: "INST-NAVY",
  air: "INST-AIRFORCE",
  space: "INST-AIRFORCE",
  cyber: "INST-DOD",
};

/** A service's emblem from its branch or institution id; a service id already names its seal. */
export function serviceSeal(id: string): string {
  return SERVICE_SEAL[id] ?? (id.startsWith("INST-") ? id : "INST-DOD");
}
