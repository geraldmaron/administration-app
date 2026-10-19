import { documentMarking, institutionDef, institutionForRole, type Campaign, type ConversationBeat, type DocumentMarking } from "@admin/engine";
import { responsibleRole, type CastScenario } from "@admin/content";
import { SEAL_WHITE_HOUSE, formatDate, place, roleTitle, scenarioFiledDate, sealFor, type SealSpec } from "@admin/player-core";
import type { PersonId, RoleId } from "@admin/world";

// The paper a decision arrives on: the office that raises it, with its
// emblem, who prepared it, the date it was filed, and the marking the engine
// derives for a decision memorandum from the matter's severity (DECISIONS
// §8.11). The White House raises what no department speaks for.

export type Preparer = { readonly name: string; readonly role: string; readonly person?: PersonId };

export type Letterhead = {
  readonly issuer: string;
  readonly seal: SealSpec;
  /** The issuer's office page, where it is a department. */
  readonly office?: string;
  readonly preparedBy?: Preparer;
  readonly filed: string;
  readonly marking: DocumentMarking;
};

/** The office page a department is led from: its first, chair office. */
function officeOf(institution: Parameters<typeof institutionDef>[0]): { readonly office?: string } {
  const office = institutionDef(institution)?.offices[0]?.id;
  return office ? { office: place.office(office) } : {};
}

/** The office page a cabinet seat sits in, where the seat heads a department. */
export function officeHrefOfRole(role: string): string | undefined {
  const department = institutionForRole(role as RoleId);
  return department ? officeOf(department.id).office : undefined;
}

/** The first cabinet officer who speaks in the briefing: the chair whose matter it is. */
function firstOfficial(beats: readonly ConversationBeat[]): Extract<ConversationBeat["speaker"], { kind: "official" }> | undefined {
  for (const beat of beats) if (beat.speaker.kind === "official") return beat.speaker;
  return undefined;
}

export function decisionLetterhead(campaign: Campaign, cast: CastScenario, beats: readonly ConversationBeat[]): Letterhead {
  const named = responsibleRole(campaign, cast.def);
  const spoke = firstOfficial(beats);
  // The scenario's declared office briefs; speaker order only decides when none is declared.
  const official = named ? beats.map((beat) => beat.speaker).find((speaker): speaker is Extract<typeof speaker, { kind: "official" }> => speaker.kind === "official" && speaker.role === named) ?? spoke : spoke;
  const department = named ? institutionForRole(named) : official ? institutionForRole(official.role as RoleId) : undefined;
  const marking = documentMarking({ family: "presidential-decision-memo", severity: cast.def.severity });
  const filed = formatDate(scenarioFiledDate(campaign, cast.script.subject));
  const preparedBy = official ? { name: official.name, role: roleTitle(official.role), person: official.person } : undefined;
  if (department) return { issuer: department.name, seal: sealFor(department.id, department.name), ...officeOf(department.id), ...(preparedBy ? { preparedBy } : {}), filed, marking };
  return { issuer: "The White House", seal: sealFor(SEAL_WHITE_HOUSE, "The White House"), ...(preparedBy ? { preparedBy } : {}), filed, marking };
}
