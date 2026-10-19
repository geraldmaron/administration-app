import { selectDateOfTurn, selectPerson, type Campaign, type Confidence } from "@admin/engine";
import type { CareerArchetype, Person, PersonId } from "@admin/world";
import { charterOf } from "../campaign/founding-options.js";
import { formatDate } from "../format/figures.js";
import { judgeAttribute, type JudgedAttribute } from "../government/machine-readings.js";
import { whiteHouseSeatOf } from "../government/machine-white-house.js";
import { assessmentProfile, type AssessmentReading, type AssessmentWatch } from "./assessment-profile.js";
import { currentAge } from "./person-age.js";
import { personDossier, type PersonDossier, type PersonStanding } from "./person-dossier.js";
import { circleOrder, connectionsForPerson, type PersonConnectionRow } from "./person-network.js";
import type { LeverSeat } from "./person-lever.js";

// A person's whole file as the Washington dossier reads it: who they are and
// where they stand, the five readings drawn as bands with what each one moves
// and which way loyalty is heading, their career and their record in this
// administration in one timeline, the people around them, and the one lever
// the President holds over their chair. Nothing here is a figure: a reading is
// a band of four and a word, because nothing in the office hands a President a
// number for a person.

export type ReadingTrend = "rising" | "falling";

export type PersonReading = AssessmentReading & {
  /** Which of four bands it falls in, lowest 0; for ambition, where it sits against the mark. */
  readonly band: 0 | 1 | 2 | 3;
  readonly confidence?: Confidence;
  readonly basis?: string;
  readonly trend?: ReadingTrend;
  readonly trendText?: string;
};

export type CareerEntry = {
  readonly key: string;
  readonly when: string;
  readonly text: string;
  /** A Record entry the line opens, for what happened in this administration. */
  readonly eventId?: string;
};

export type PersonFile = {
  readonly person: Person;
  readonly age: number;
  readonly dossier: PersonDossier;
  /** Their chair or station, in one line under the name. */
  readonly role: string;
  /** Where the map frames them: their office's headquarters, their state or their capital. */
  readonly camera: string;
  readonly readings: readonly PersonReading[];
  readonly watch?: AssessmentWatch;
  readonly career: readonly CareerEntry[];
  readonly circle: readonly PersonConnectionRow[];
  /** The chair the President could empty, where there is one. */
  readonly seat?: LeverSeat;
};

const CAREER_LABEL: Readonly<Record<CareerArchetype, string>> = {
  "civil-service": "Civil service",
  "military-command": "Military command",
  "intelligence-service": "Intelligence service",
  "diplomatic-corps": "Diplomatic corps",
  "private-law": "Private law practice",
  business: "Business",
  academia: "Academic life",
  "party-organizing": "Party organizing",
  "local-government": "Local government",
  "state-media": "State media",
  "independent-press": "Independent press",
  activism: "Activism",
  medicine: "Medicine",
  "labor-union": "Labor union",
  judiciary: "Judge",
};

const PRESSURE_BAND: Readonly<Record<string, 0 | 1 | 2 | 3>> = { "Below the danger point": 1, "Near the danger point": 2, "Past the danger point": 3 };

function roleLine(standing: PersonStanding): string {
  switch (standing.kind) {
    case "president":
      return "President of the United States";
    case "cabinet":
    case "agency":
      return standing.title;
    case "justice":
      return standing.chief ? "Chief Justice of the United States" : "Associate Justice of the Supreme Court";
    case "hill":
      return `${standing.title}, ${standing.chamber}`;
    case "mayor":
      return `Mayor of ${standing.cityName}`;
    case "governor":
      return `Governor of ${standing.stateName}`;
    case "foreign-leader":
      return `${standing.title ?? "Head of government"}, ${standing.nationName}`;
    case "foreign":
      return `A national of ${standing.nationName}`;
    case "former":
      return `Former ${standing.title}, ${standing.departure}`;
    case "deceased":
      return "Deceased";
    case "available":
      return "Holds no office";
  }
}

function cameraOf(campaign: Campaign, standing: PersonStanding, person: Person): string {
  switch (standing.kind) {
    case "cabinet":
      return standing.institution ? `office:${standing.institution.id as string}` : "dc";
    case "agency":
      return `office:${standing.institution.id as string}`;
    case "mayor":
      return standing.state ? `state:${standing.state}` : "dc";
    case "governor":
      return `state:${standing.state as string}`;
    case "foreign-leader":
    case "foreign":
      return `nation:${standing.nation as string}`;
    default:
      return whiteHouseSeatOf(campaign, person.id as string) || standing.kind === "president" ? "office:INST-PRESIDENCY" : "dc";
  }
}

function readingsOf(campaign: Campaign, person: Person, dossier: PersonDossier, role: string | undefined): { readonly readings: readonly PersonReading[]; readonly watch?: AssessmentWatch } {
  const subject = dossier.standing.kind;
  const profile = assessmentProfile(person, { subject, ...(role ? { role } : {}), titles: charterOf(campaign).roleTitles });
  const calls = dossier.counsel.length;
  const readings = profile.readings.map((reading): PersonReading => {
    if (reading.kind === "pressure") return { ...reading, band: PRESSURE_BAND[reading.word] ?? 1 };
    const judgment = judgeAttribute(reading.key as JudgedAttribute, reading.value, calls);
    const moved = reading.key === "loyalty" ? dossier.loyaltyTrend?.movedPoints : undefined;
    return {
      ...reading,
      band: judgment.band,
      confidence: judgment.confidence,
      basis: judgment.basis,
      ...(moved !== undefined && moved !== 0
        ? { trend: moved > 0 ? ("rising" as const) : ("falling" as const), trendText: moved > 0 ? "Warmer since you appointed them" : "Cooler since you appointed them" }
        : {}),
    };
  });
  return { readings, ...(profile.watch ? { watch: profile.watch } : {}) };
}

/** Their working life before this administration, then what the Record says they did in it, oldest first. */
function careerOf(campaign: Campaign, person: Person, dossier: PersonDossier): readonly CareerEntry[] {
  const before = person.career.map((post, index) => ({
    key: `career:${index}`,
    when: `Age ${post.startAge} to ${post.startAge + post.years}`,
    text: CAREER_LABEL[post.archetype],
  }));
  const entries = [...dossier.counsel.map((row) => row.entry), ...dossier.namedIn].filter((entry) => entry.causal);
  const during = [...new Set(entries)]
    .sort((a, b) => a.turn - b.turn)
    .map((entry) => ({
      key: `record:${entry.causal!.eventId}`,
      when: formatDate(entry.causal!.createdDate ?? selectDateOfTurn(campaign, entry.turn)),
      text: entry.description,
      eventId: entry.causal!.eventId,
    }));
  return [...before, ...during];
}

function seatOf(standing: PersonStanding): LeverSeat | undefined {
  if (standing.kind === "cabinet") return { kind: "cabinet", role: standing.role, title: standing.title };
  if (standing.kind === "agency") {
    return { kind: "officer", institution: standing.institution.id, title: standing.title, body: standing.institution.name, removal: standing.removal };
  }
  return undefined;
}

/** A person's whole file, or undefined for an id this campaign does not know. */
export function personFile(campaign: Campaign, personId: string): PersonFile | undefined {
  const runtime = selectPerson(campaign, personId as PersonId);
  const dossier = personDossier(campaign, personId);
  if (!runtime || !dossier) return undefined;
  const person = runtime.base;
  const role = dossier.standing.kind === "cabinet" ? (dossier.standing.role as string) : (whiteHouseSeatOf(campaign, personId)?.role as string | undefined);
  const { readings, watch } = readingsOf(campaign, person, dossier, role);
  const seat = seatOf(dossier.standing);
  return {
    person,
    age: currentAge(person, campaign),
    dossier,
    role: whiteHouseSeatOf(campaign, personId)?.title ?? roleLine(dossier.standing),
    camera: cameraOf(campaign, dossier.standing, person),
    readings,
    ...(watch ? { watch } : {}),
    career: careerOf(campaign, person, dossier),
    circle: circleOrder(connectionsForPerson(campaign, person.id)),
    ...(seat ? { seat } : {}),
  };
}
