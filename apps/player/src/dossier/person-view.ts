import { selectHill, type Campaign } from "@admin/engine";
import { SEAL_HOUSE, SEAL_SENATE, SEAL_SUPREME_COURT, SEAL_WHITE_HOUSE, caucusParty, type PersonFile, type PersonStanding } from "@admin/player-core";
import type { IconName } from "@admin/ui";
import type { CareerBandView } from "@admin/ui/dossier";

/** One fact on the file, with the mark it is drawn with. */
export type Vital = { readonly icon: IconName; readonly label: string; readonly value: string };

export const PERSON_VIEWS = ["overview", "network", "career"] as const;
export type PersonView = (typeof PERSON_VIEWS)[number];

export function personViewOf(value: unknown): PersonView {
  const raw = Array.isArray(value) ? value[0] : value;
  return PERSON_VIEWS.find((view) => view === raw) ?? "overview";
}

/** The house that keeps a person's file: where they serve, or the government they answer to. */
export function houseOf(standing: PersonStanding): string {
  switch (standing.kind) {
    case "cabinet":
      return standing.institution?.name ?? "The White House";
    case "agency":
      return standing.institution.name;
    case "hill":
      return `United States ${standing.chamber}`;
    case "justice":
      return "Supreme Court of the United States";
    case "mayor":
      return `City of ${standing.cityName}`;
    case "governor":
      return `State of ${standing.stateName}`;
    case "foreign-leader":
    case "foreign":
      return standing.nationName;
    default:
      return "The White House";
  }
}

/** The seal the file's banner carries: the institution's own, a chamber's, the Court's, or the White House's for everyone else it keeps. */
export function houseSeal(standing: PersonStanding): { readonly id: string; readonly name: string } | undefined {
  switch (standing.kind) {
    case "cabinet":
      return standing.institution ? { id: standing.institution.id as string, name: standing.institution.name } : { id: SEAL_WHITE_HOUSE, name: "The White House" };
    case "agency":
      return { id: standing.institution.id as string, name: standing.institution.name };
    case "hill":
      return { id: standing.chamber === "House" ? SEAL_HOUSE : SEAL_SENATE, name: `United States ${standing.chamber}` };
    case "justice":
      return { id: SEAL_SUPREME_COURT, name: "Supreme Court of the United States" };
    case "foreign-leader":
    case "foreign":
    case "governor":
    case "mayor":
      return undefined;
    default:
      return { id: SEAL_WHITE_HOUSE, name: "The White House" };
  }
}

export type StandingTag = { readonly label: string; readonly icon: IconName; readonly status: "info" | "outline" | "gold" };

const STANDING_TAG: Partial<Record<PersonStanding["kind"], StandingTag>> = {
  cabinet: { label: "Cabinet", icon: "westWing", status: "gold" },
  agency: { label: "Agency head", icon: "building", status: "gold" },
  hill: { label: "Congress", icon: "subjectCapitol", status: "outline" },
  justice: { label: "Justice", icon: "court", status: "gold" },
  governor: { label: "Governor", icon: "mapPin", status: "outline" },
  "foreign-leader": { label: "Head of government", icon: "world", status: "info" },
  foreign: { label: "Foreign official", icon: "world", status: "outline" },
  former: { label: "Former official", icon: "archive", status: "outline" },
  available: { label: "Available", icon: "appoint", status: "info" },
  deceased: { label: "Deceased", icon: "neutral", status: "outline" },
};

export function standingTag(standing: PersonStanding): StandingTag | undefined {
  if (standing.kind === "agency" && standing.circuit) return { label: "Circuit judge", icon: "court", status: "gold" };
  return STANDING_TAG[standing.kind];
}

const PARTY_NAME = { democrat: "Democratic Party", republican: "Republican Party", independent: "Independent" } as const;
type Party = keyof typeof PARTY_NAME;
const isParty = (value: unknown): value is Party => value === "democrat" || value === "republican" || value === "independent";

/** The party a person's tag names: a member's seat, their caucus, a governor's party, or their own. */
export function partyOf(campaign: Campaign, file: PersonFile): { readonly party: Party; readonly name: string } | undefined {
  const role = file.dossier.standing;
  const member = campaign.congress.members?.find((entry) => entry.person === file.person.id)?.party;
  const hill = role.kind === "hill" ? selectHill(campaign).find((entry) => entry.person?.id === file.person.id) : undefined;
  const party: unknown = role.kind === "hill" ? (member ?? (hill ? caucusParty(campaign, hill.figure.caucus) : undefined)) : role.kind === "governor" ? role.party : file.person.party;
  return isParty(party) ? { party, name: PARTY_NAME[party] } : undefined;
}

/** A field of study as a reader writes it: "international-relations" is "International relations". */
export function fieldWords(field: string): string {
  const words = field.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function vitalsOf(file: PersonFile): readonly Vital[] {
  const education = file.dossier.education;
  const standing = file.dossier.standing;
  const nomination = file.dossier.nomination;
  return [
    { icon: "subjectPerson", label: "Age", value: String(file.age) },
    ...(file.person.birthplace ? [{ icon: "mapPin" as const, label: "From", value: file.person.birthplace }] : []),
    ...(education ? [{ icon: "dossier" as const, label: education.postgraduate ? "Postgraduate" : "Studied", value: `${fieldWords(education.field)}, ${education.school}` }] : []),
    ...(standing.kind === "hill" ? [{ icon: "subjectChamber" as const, label: "Caucus", value: standing.caucus }] : []),
    ...(nomination ? [{ icon: "appoint" as const, label: "Nominated for", value: `${nomination.officeTitle} (${nomination.standing.toLowerCase()})` }] : []),
    ...(file.dossier.faction ? [{ icon: "layerBlocs" as const, label: "Faction", value: file.dossier.faction.name }] : []),
  ];
}

/** Pending matters on the person, kept apart from the staff's qualitative assessments. */
export function personAttention(file: PersonFile): readonly string[] {
  const trend = file.dossier.loyaltyTrend;
  return [
    ...(file.dossier.nomination ? [`Their nomination for ${file.dossier.nomination.officeTitle} is still open. Current step: ${file.dossier.nomination.standing}.`] : []),
    ...(trend && trend.movedPoints < 0 ? ["Their loyalty to you has dropped since you appointed them."] : []),
  ];
}

type CareerPost = PersonFile["person"]["career"][number];

const CAREER_MARK: Readonly<Record<CareerPost["archetype"], IconName>> = {
  "civil-service": "building",
  "military-command": "instrumentMilitary",
  "intelligence-service": "intel",
  "diplomatic-corps": "instrumentDiplomatic",
  "private-law": "gavel",
  business: "sectorFinance",
  academia: "dossier",
  "party-organizing": "ballot",
  "local-government": "mapPin",
  "state-media": "formatRadio",
  "independent-press": "press",
  activism: "eventUnrest",
  medicine: "sectorHealthcare",
  "labor-union": "sectorSteelHeavy",
  judiciary: "court",
};

/** A working life as bands along the years, each as long as the stint, ending at today's age. */
export function careerBands(file: PersonFile): readonly CareerBandView[] {
  const posts = file.person.career;
  if (posts.length === 0) return [];
  const labels = file.career.filter((entry) => entry.key.startsWith("career:")).map((entry) => entry.text);
  const start = Math.min(...posts.map((post) => post.startAge));
  const span = Math.max(1, file.age - start);
  return posts.map((post, index) => {
    const from = ((post.startAge - start) / span) * 100;
    return { key: `${index}:${post.archetype}`, label: labels[index] ?? post.archetype, icon: CAREER_MARK[post.archetype], from, width: Math.min(Math.max(4, (post.years / span) * 100), 100 - from), years: `${post.startAge} to ${post.startAge + post.years}` };
  });
}

/** Whether the person file carries an act the President can take on them. */
export function hasPersonActs(campaign: Campaign, file: PersonFile): boolean {
  return personActs(campaign, file).length > 0;
}

export type PersonActKind = "dismiss" | "remove" | "withdraw" | "outreach";

/** The acts this file offers, in the order the header draws them; each is offered only where its own act would render. */
export function personActs(campaign: Campaign, file: PersonFile): readonly PersonActKind[] {
  const member = campaign.congress.members?.some((entry) => entry.person === file.person.id) ?? false;
  const alive = campaign.people[file.person.id]?.alive ?? false;
  return [
    ...(file.seat?.kind === "cabinet" ? (["dismiss"] as const) : []),
    ...(file.seat?.kind === "officer" ? (["remove"] as const) : []),
    ...(file.dossier.nomination ? (["withdraw"] as const) : []),
    ...(member && alive ? (["outreach"] as const) : []),
  ];
}
