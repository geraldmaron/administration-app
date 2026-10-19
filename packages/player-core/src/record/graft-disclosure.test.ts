import { describe, expect, it } from "vitest";
import type { ActionRecord, Campaign, OversightMatter } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { personDossier } from "../dossier/person-dossier";
import { officeFile } from "../government/office-file";
import { inquiryPipeline } from "../oversight/oversight-board";
import { recordEntry, recordRows } from "./record-entry";

const OFFICE = "INST-DOD";
const OFFICE_SEAT = "OFF-DEFENSE-SEC";
const ROLE = "role-defense-minister";
const EVENT = "ev-500-1";

function hiddenCase(): { campaign: Campaign; person: string; successor: string; event: ActionRecord } {
  const base = openingCampaign();
  const person = base.player.cabinet[ROLE as never]! as string;
  const successor = Object.keys(base.people).find((id) => id !== person)!;
  const event: ActionRecord = {
    turn: 500, actor: "world", description: "A procurement decision is diverted inside Defense.", background: true,
    causal: { origin: "world", eventId: EVENT as never, createdDate: base.calendar, visibility: "internal",
      systems: ["cabinet", "graft"], entities: [person, OFFICE],
      decision: { question: "steer-contracts", actor: person, subject: ROLE, acts: true,
        terms: [{ key: "principle", source: "trait", value: 0.5 }], score: 0.5,
        threshold: 0.35, close: false, visibility: "intelligence" },
      graft: { person, role: ROLE, institution: OFFICE, fiscalYear: 2030, account: "military",
        annualShare: 0.04, departmentShare: 1, annualPurchasing: 1000,
        purchasingReach: 1, oversightPressure: 0 } },
  };
  return { campaign: { ...base, player: { ...base.player, cabinet: { ...base.player.cabinet, [ROLE as never]: successor as never } },
    ledger: [...base.ledger, event] }, person, successor, event };
}

describe("concealed graft on player-facing history", () => {
  it("keeps the act out of the former holder, office and Record until the IG reports, then names the original holder", () => {
    const { campaign, person, successor } = hiddenCase();
    const priorDossier = personDossier(campaign, person)!;
    expect(priorDossier.namedIn.some((entry) => entry.causal?.eventId === EVENT)).toBe(false);
    expect(officeFile(campaign, OFFICE_SEAT)!.record.some((row) => row.id === EVENT)).toBe(false);
    expect(recordRows(campaign).some((row) => row.id === EVENT)).toBe(false);
    expect(recordEntry(campaign, EVENT)).toBeUndefined();

    const matter: OversightMatter = { id: `matter:ig:${OFFICE}:graft:${EVENT}`, causeId: EVENT,
      origin: { kind: "inspector-general", institution: OFFICE as never }, direction: "received",
      subject: "suspected irregularities in purchasing at Defense",
      openedTurn: 540, stage: "opened", public: false, obstructed: false,
      beats: [{ turn: 540, description: "The Defense inspector general opens an audit into suspected irregularities in purchasing at Defense." }] };
    const audit: ActionRecord = { turn: 540, actor: "world", description: matter.beats[0]!.description,
      causal: { origin: "world", eventId: "ev-540-1" as never, createdDate: campaign.calendar,
        causeIds: [EVENT as never], systems: ["oversight"] } };
    const investigating = { ...campaign, ledger: [...campaign.ledger, audit], oversight: { ...campaign.oversight, matters: [...campaign.oversight.matters, matter] } };
    expect(personDossier(investigating, person)!.namedIn.some((entry) => entry.causal?.eventId === EVENT)).toBe(false);
    expect(inquiryPipeline(investigating).stages.flatMap((stage) => stage.matters).find((row) => row.id === matter.id)?.latest).not.toContain(campaign.people[person as never]!.base.name);
    expect(recordRows(investigating).find((row) => row.id === audit.causal?.eventId)?.description).not.toContain(campaign.people[person as never]!.base.name);
    expect(recordEntry(investigating, audit.causal!.eventId)!.causes).toEqual([]);
    const reported = { ...investigating, oversight: { ...investigating.oversight, matters: [
      ...campaign.oversight.matters, { ...matter, stage: "reported" as const, public: true,
        finding: `The inspector general reports that ${campaign.people[person as never]!.base.name} steered contracts under the military purchasing appropriation at Defense.`,
        beats: [...matter.beats, { turn: 550, description: `The inspector general reports that ${campaign.people[person as never]!.base.name} steered contracts at Defense.` }] },
    ] } };
    expect(personDossier(reported, person)!.namedIn.some((entry) => entry.causal?.eventId === EVENT)).toBe(true);
    const disclosed = personDossier(reported, person)!.namedIn.find((entry) => entry.causal?.eventId === EVENT)!;
    expect(disclosed.causal?.decision).toBeUndefined();
    expect(disclosed.causal?.graft?.account).toBe("military");
    expect(personDossier(reported, successor)!.namedIn.some((entry) => entry.causal?.eventId === EVENT)).toBe(false);
    expect(inquiryPipeline(reported).stages.flatMap((stage) => stage.matters).find((row) => row.id === matter.id)?.latest).toContain(campaign.people[person as never]!.base.name);
    expect(officeFile(reported, OFFICE_SEAT)!.record.some((row) => row.id === EVENT)).toBe(true);
    const recordRow = recordRows(reported).find((row) => row.id === EVENT);
    expect(recordRow?.actor).toBe("player");
    expect(recordRow?.actorWord).toBe(`${campaign.people[person as never]!.base.name}, Secretary of Defense`);
    expect(recordRows(reported, "player").some((row) => row.id === EVENT)).toBe(true);
    expect(recordRows(reported, "world").some((row) => row.id === EVENT)).toBe(false);
    expect(recordEntry(reported, EVENT)?.origin).toBe("Someone working in your administration");
  });
});
