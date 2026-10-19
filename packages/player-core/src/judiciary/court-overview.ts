import { CIRCUIT_SEAT_SOURCE, DISTRICT_FORUM_READINGS, type Campaign, type CourtProceeding } from "@admin/engine";
import { stateById, type PersonId } from "@admin/world";
import { benchReading, courtDocket, type DocketCase } from "./courts";

export type CircuitOverview = {
  readonly name: string;
  readonly states: readonly string[];
  readonly republican: number;
  readonly democratic: number;
  readonly vacant: number;
  readonly judges: readonly { readonly name: string; readonly lean: number }[];
  readonly cases: readonly { readonly title: string; readonly href: string; readonly forum: string; readonly state?: string }[];
};
export type CircuitCase = CircuitOverview["cases"][number];

export type CourtPipeline = Readonly<Record<"filed" | "injunction" | "circuit" | "emergency" | "review" | "decision", number>>;

export type SupremeAgreement = {
  readonly justices: readonly { readonly id: PersonId; readonly name: string; readonly lean?: number; readonly age?: number; readonly tenure?: number }[];
  readonly pairs: readonly { readonly first: string; readonly second: string; readonly together: number; readonly shared: number }[];
};

/** The one step a live proceeding counts at; the pipeline and the court-system view both read it. */
export function currentStage(row: CourtProceeding): keyof CourtPipeline {
  if (row.stayApplication?.status === "pending") return "emergency";
  switch (row.stage) {
    case "interim": return "injunction";
    case "circuit-merits": return "circuit";
    case "appeal":
    case "supreme-merits": return "review";
    case "final": return "decision";
    case "threshold":
    case "lower-merits":
    case "remand": return "filed";
  }
}

function pipelineOf(campaign: Campaign): CourtPipeline {
  const proceedings = campaign.judiciary.proceedings ?? [];
  const decided = new Set(campaign.judiciary.cases.map((entry) => entry.id));
  const seen = new Set(decided);
  const counts: Record<keyof CourtPipeline, number> = { filed: 0, injunction: 0, circuit: 0, emergency: 0, review: 0, decision: decided.size };
  for (const row of proceedings) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    counts[currentStage(row)] += 1;
  }
  return counts;
}

function circuitsOf(campaign: Campaign, pending: readonly DocketCase[]): readonly CircuitOverview[] {
  const idsByName = new Map([...stateById.values()].map((state) => [state.name, state.id as string]));
  idsByName.set("District of Columbia", "DC");
  idsByName.set("Puerto Rico", "PR");
  return CIRCUIT_SEAT_SOURCE.map((source) => {
    const seats = Object.values(campaign.institutions).filter((seat) => seat.lowerBenchSeat?.circuit === source.court);
    const judges = seats.flatMap((seat) => {
      const person = seat.leader && !seat.vacancy ? campaign.people[seat.leader] : undefined;
      return person?.alive ? [{ name: person.base.name, lean: person.base.ideology.economicLeftRight }] : [];
    });
    const states = [...new Set(DISTRICT_FORUM_READINGS.filter((forum) => forum.circuit === source.court)
      .map((forum) => idsByName.get(forum.state)).filter((id): id is string => id !== undefined))];
    const cases = pending.filter((row) => row.lowerForum?.circuit === source.court)
      .map((row) => ({ title: row.orderName, href: row.href, forum: row.lowerForum?.court ?? "District court",
        state: idsByName.get(DISTRICT_FORUM_READINGS.find((forum) => forum.id === row.lowerForum?.id)?.state ?? "") }));
    return { name: source.court, states,
      republican: seats.filter((seat) => !seat.vacancy && seat.lowerBenchSeat?.appointingParty === "republican").length,
      democratic: seats.filter((seat) => !seat.vacancy && seat.lowerBenchSeat?.appointingParty === "democrat").length,
      vacant: seats.filter((seat) => seat.vacancy).length, judges, cases };
  });
}

function agreementOf(campaign: Campaign): SupremeAgreement {
  const seated = benchReading(campaign).seats.filter((seat) => !seat.vacant && seat.personId);
  const justices = seated.flatMap((seat) => {
    const personId = campaign.institutions[seat.institution]?.leader;
    if (!personId) return [];
    const person = campaign.people[personId];
    const provenance = campaign.institutions[seat.institution]?.judicialProvenance;
    return [{ id: personId, name: seat.name,
      ...(seat.lean !== undefined ? { lean: seat.lean } : {}),
      ...(person ? { age: person.base.age + campaign.calendar.year - (campaign.foundingDate?.year ?? campaign.calendar.year) } : {}),
      ...(provenance ? { tenure: Math.max(0, campaign.calendar.year - provenance.serviceStartYear) } : {}) }];
  });
  const pairs = justices.flatMap((first, index) => justices.slice(index + 1).map((second) => {
    const shared = campaign.judiciary.cases.flatMap((courtCase) => {
      const a = courtCase.votes.find((vote) => vote.justice === first.id);
      const b = courtCase.votes.find((vote) => vote.justice === second.id);
      return a && b ? [a.vote === b.vote] : [];
    });
    return { first: first.id, second: second.id, together: shared.filter(Boolean).length, shared: shared.length };
  }));
  return { justices, pairs };
}

export function courtOverview(campaign: Campaign) {
  const pending = courtDocket(campaign).pending;
  const knownCircuits = new Set(CIRCUIT_SEAT_SOURCE.map((source) => source.court));
  const unassignedCases: readonly CircuitCase[] = pending.filter((row) =>
    !row.lowerForum?.circuit || !knownCircuits.has(row.lowerForum.circuit))
    .map((row) => ({ title: row.orderName, href: row.href, forum: "Court not recorded yet" }));
  return { circuits: circuitsOf(campaign, pending), unassignedCases, pipeline: pipelineOf(campaign), agreement: agreementOf(campaign) };
}
