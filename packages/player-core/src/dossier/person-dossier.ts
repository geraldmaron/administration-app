import {
  foreignLeaderFor,
  graftDisclosed,
  institutionDef,
  institutionForRole,
  judiciaryBenchSeats,
  selectActiveNominations,
  selectFactions,
  selectFormerService,
  selectGovernor,
  figureRapport,
  selectHill,
  selectInstitutionLedBy,
  selectLoyaltyTrend,
  selectNation,
  selectPerson,
  type ActionRecord,
  type CabinetDeparture,
  type CabinetFaction,
  type Campaign,
  type CounselStance,
  type InstitutionDef,
  type LoyaltyTrend,
  type Nomination,
  type RemovalConstraint,
  type UsParty,
} from "@admin/engine";
import { worldCities, type CityId, worldDataset, type NationId, type RoleId, type StateId } from "@admin/world";
import { cabinetSeats } from "../cabinet/seats";
import { charterOf } from "../campaign/founding-options";
import { roleTitle } from "../format/figures";
import { leadTitle } from "../world/leaders";
import { nominationStanding } from "../government/machine";
import { caucusName, caucusParty } from "../congress/party-words";
import { personBackground, type PersonEducation, type PersonEligibility } from "./person-background";

export * from "./person-background";

/**
 * Where a person stands in this campaign's government, read from the engine's
 * own records: the chair they hold, the post on the Hill, the bench seat, the
 * state they govern, the agency they run — or, when none of those, what became
 * of them. One answer, in priority order, so a file never calls a sitting
 * justice "available" because the check for the bench came second.
 */
export type PersonStanding =
  | { readonly kind: "deceased" }
  | { readonly kind: "president" }
  | { readonly kind: "cabinet"; readonly role: RoleId; readonly title: string; readonly institution?: InstitutionDef }
  | { readonly kind: "justice"; readonly seat: number; readonly chief: boolean }
  | {
      readonly kind: "hill";
      readonly post: string;
      readonly title: string;
      readonly chamber: string;
      readonly caucus: string;
      readonly disposition?: number;
      readonly influence?: number;
    }
  | { readonly kind: "mayor"; readonly city: CityId; readonly cityName: string; readonly state?: StateId }
  | { readonly kind: "governor"; readonly state: StateId; readonly stateName: string; readonly party?: UsParty; readonly disposition?: number }
  | {
      readonly kind: "agency";
      readonly institution: InstitutionDef;
      readonly title: string;
      readonly removal: RemovalConstraint;
      /** Set when the seat is a federal appeals judgeship, which the engine keeps as an institution. */
      readonly circuit?: string;
    }
  | { readonly kind: "foreign-leader"; readonly nation: NationId; readonly nationName: string; readonly title?: string }
  | { readonly kind: "foreign"; readonly nation: NationId; readonly nationName: string }
  | { readonly kind: "former"; readonly role: RoleId; readonly title: string; readonly departure: CabinetDeparture }
  | { readonly kind: "available" };

export type CounselGiven = {
  readonly entry: ActionRecord;
  readonly stance: CounselStance;
  /** True when theirs was the chair the decision routed to, not one voice in the room. */
  readonly primary: boolean;
};

export type PersonDossier = {
  readonly standing: PersonStanding;
  readonly nomination?: { readonly nomination: Nomination; readonly officeTitle: string; readonly standing: string };
  readonly loyaltyTrend?: LoyaltyTrend;
  readonly faction?: CabinetFaction;
  /** Every time the ledger records their advice, newest first. */
  readonly counsel: readonly CounselGiven[];
  /** Entries that name them, newest first, other than the ones they advised on. */
  readonly namedIn: readonly ActionRecord[];
  readonly education?: PersonEducation;
  /** The chairs their record makes them eligible for, as this charter titles them. */
  readonly eligible: readonly PersonEligibility[];
};

function hillStanding(campaign: Campaign, personId: string): PersonStanding | undefined {
  const member = selectHill(campaign).find((entry) => (entry.person?.id as string | undefined) === personId);
  if (!member) {
    const seat = campaign.congress.members?.find((entry) => entry.person === personId);
    if (!seat) return undefined;
    return { kind: "hill", post: seat.seat, title: seat.chamber === "house" ? "Representative" : "Senator", chamber: seat.chamber === "house" ? "House" : "Senate", caucus: seat.party === "independent" ? "Independent" : caucusName(seat.party) };
  }
  return {
    kind: "hill",
    post: member.figure.post,
    title: member.post.title,
    chamber: member.post.chamber === "house" ? "House" : "Senate",
    caucus: caucusName(caucusParty(campaign, member.figure.caucus)),
    disposition: figureRapport(campaign.people, member.figure),
    influence: member.figure.influence,
  };
}

function officeStanding(campaign: Campaign, personId: string, titles: Readonly<Record<string, string>> | undefined): PersonStanding | undefined {
  const seat = cabinetSeats(campaign).find((row) => (row.holder?.id as string | undefined) === personId);
  if (seat?.isPlayer) return { kind: "president" };
  if (seat) {
    const institution = institutionForRole(seat.role as RoleId);
    return { kind: "cabinet", role: seat.role as RoleId, title: roleTitle(seat.role, titles), ...(institution ? { institution } : {}) };
  }
  const bench = judiciaryBenchSeats(campaign).find((row) => (row.personId as string | undefined) === personId);
  if (bench) return { kind: "justice", seat: bench.seat, chief: bench.senior };
  return undefined;
}

export function personStanding(campaign: Campaign, personId: string): PersonStanding {
  const runtime = selectPerson(campaign, personId as never);
  if (!runtime || !runtime.alive) return { kind: "deceased" };
  if (runtime.municipalCity && runtime.currentRole === "role-mayor") return { kind: "mayor", city: runtime.municipalCity, cityName: worldCities.find((city) => city.id === runtime.municipalCity)?.name ?? runtime.municipalCity, ...(runtime.state ? { state: runtime.state } : {}) };
  const titles = charterOf(campaign).roleTitles;
  const office = officeStanding(campaign, personId, titles) ?? hillStanding(campaign, personId);
  if (office) return office;
  if (runtime.state && runtime.currentRole === "role-governor") {
    const standing = selectGovernor(campaign, runtime.state);
    return {
      kind: "governor",
      state: runtime.state,
      stateName: campaign.states[runtime.state]?.base.name ?? runtime.state,
      ...(standing ? { party: standing.party, disposition: standing.disposition } : {}),
    };
  }
  const agency = selectInstitutionLedBy(campaign, personId as never);
  if (agency) {
    const office = agency.offices[0];
    const circuit = campaign.institutions[agency.id]?.lowerBenchSeat?.circuit;
    return { kind: "agency", institution: agency, title: office?.title ?? agency.name, removal: office?.removal ?? "at-will", ...(circuit ? { circuit } : {}) };
  }
  const nationality = runtime.base.nationality;
  if (nationality !== campaign.founding.nation) {
    const nationName = selectNation(campaign, nationality)?.base.identity.name ?? nationality;
    const leads = foreignLeaderFor(campaign, nationality);
    if (leads && (leads.person as string) === personId) {
      // Their own country's chair, titled the way that country titles it; the
      // campaign's charter is the player's, and a foreign national holds no
      // `currentRole` for it to name.
      const charter = worldDataset.charters.find((entry) => entry.id === selectNation(campaign, nationality)?.base.identity.government);
      const lead = charter?.cabinetRoles[0];
      return { kind: "foreign-leader", nation: nationality, nationName, ...(lead ? { title: leadTitle(campaign, nationality, lead, charter.roleTitles) } : {}) };
    }
    return { kind: "foreign", nation: nationality, nationName };
  }
  const former = selectFormerService(campaign, personId as never);
  if (former) return { kind: "former", role: former.role, title: roleTitle(former.role, titles), departure: former.departure };
  return { kind: "available" };
}

function counselOf(campaign: Campaign, personId: string): readonly CounselGiven[] {
  return campaign.ledger
    .flatMap((entry): CounselGiven[] => {
      const counsel = entry.counsel;
      if (!counsel) return [];
      if ((counsel.person as string) === personId) return [{ entry, stance: counsel.stance, primary: true }];
      const voice = counsel.room?.find((candidate) => (candidate.person as string) === personId);
      return voice ? [{ entry, stance: voice.stance, primary: false }] : [];
    })
    .reverse();
}

/** Internal recipient decisions are engine audit evidence, never dossier facts. */
function dossierRecord(entry: ActionRecord): ActionRecord {
  if (!entry.causal || (!("internalDecisions" in entry.causal) && !entry.causal.graft)) return entry;
  const causal = Object.fromEntries(Object.entries(entry.causal).filter(([key]) => key !== "internalDecisions" && (key !== "decision" || !entry.causal?.graft))) as NonNullable<ActionRecord["causal"]>;
  return { ...entry, causal };
}

export function personDossier(campaign: Campaign, personId: string): PersonDossier | undefined {
  const runtime = selectPerson(campaign, personId as never);
  if (!runtime) return undefined;
  const titles = charterOf(campaign).roleTitles;
  const counsel = counselOf(campaign, personId);
  const advised = new Set(counsel.map((row) => row.entry));
  const namedIn = campaign.ledger
    .filter((entry) => graftDisclosed(campaign, entry) && !advised.has(entry) && (entry.causal?.entities ?? []).includes(personId))
    .reverse();
  const nomination = selectActiveNominations(campaign).find((row) => (row.nominee as string) === personId);
  const trend = selectLoyaltyTrend(campaign, personId as never);
  const faction = runtime.affiliation ? selectFactions(campaign, titles).find((row) => row.id === runtime.affiliation) : undefined;
  const background = personBackground(runtime.base, titles);
  return {
    standing: personStanding(campaign, personId),
    ...(nomination
      ? {
          nomination: {
            nomination,
            officeTitle: institutionDef(nomination.institution)?.offices.find((office) => office.id === nomination.office)?.title ?? String(nomination.office),
            standing: nominationStanding(nomination),
          },
        }
      : {}),
    ...(trend ? { loyaltyTrend: trend } : {}),
    ...(faction ? { faction } : {}),
    counsel: counsel.map((row) => ({ ...row, entry: dossierRecord(row.entry) })),
    namedIn: namedIn.map(dossierRecord),
    education: background.education,
    eligible: background.eligible,
  };
}
