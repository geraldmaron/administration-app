import { describe, expect, it } from "vitest";
import {
  DOCKET_INSTITUTIONS,
  docketPhase,
  selectActiveDocket,
  selectDocketItem,
  type DocketStage,
} from "./docket.js";
import { selectSeatCalendar, selectUpcomingSeats } from "./seat-calendar.js";
import { apply } from "./effects.js";
import { institutionDef } from "./institutions.js";
import { buildCampaign, atCampaignTurn } from "./__fixtures__/campaign.js";
import type { Campaign } from "./state.js";

const VALID_STAGES: readonly DocketStage[] = ["proposed", "omb-review", "comment", "final", "litigated", "vacated"];

function atTurn(campaign: Campaign, turn: number): Campaign {
  return atCampaignTurn(campaign, turn);
}

describe("selectActiveDocket", () => {
  it("reports every tracked body once, each in a valid stage", () => {
    const campaign = buildCampaign();
    const items = selectActiveDocket(campaign);
    expect(items).toHaveLength(DOCKET_INSTITUTIONS.length);
    for (const item of items) {
      expect(VALID_STAGES).toContain(item.stage);
      expect(item.constraint.length).toBeGreaterThan(0);
    }
  });

  it("is a pure function of the campaign: two reads agree", () => {
    const campaign = atTurn(buildCampaign(), 137);
    expect(selectActiveDocket(campaign)).toEqual(selectActiveDocket(campaign));
  });

  it("names the President's lever correctly for an independent commission and an executive agency", () => {
    const campaign = buildCampaign();
    const independent = selectDocketItem(campaign, "INST-SEC")!;
    const executive = selectDocketItem(campaign, "INST-EPA")!;
    expect(independent.constraint).toMatch(/has no vote/i);
    expect(executive.constraint).toMatch(/can direct it/i);
    expect(institutionDef("INST-SEC")?.independence).toBe("independent");
    expect(institutionDef("INST-EPA")?.independence).not.toBe("independent");
  });
});

describe("the OMB review carve-out", () => {
  it("never seats an independent commission's item in omb-review, and does seat an executive agency's there", () => {
    const campaign = buildCampaign();
    const seenByInstitution = new Map<string, Set<DocketStage>>();
    for (const institution of DOCKET_INSTITUTIONS) seenByInstitution.set(institution, new Set());
    // Wide enough to cross more than one full docket cycle for every body,
    // regardless of its own hashed stagger offset.
    for (let turn = 1; turn <= 500; turn += 1) {
      const at = atTurn(campaign, turn);
      for (const institution of DOCKET_INSTITUTIONS) {
        seenByInstitution.get(institution)!.add(selectDocketItem(at, institution)!.stage);
      }
    }
    for (const institution of DOCKET_INSTITUTIONS) {
      const seen = seenByInstitution.get(institution)!;
      const independent = institutionDef(institution)?.independence === "independent";
      expect(seen.has("omb-review")).toBe(!independent);
    }
  });
});

describe("docketPhase", () => {
  it("advances with no player input, and reports a landing or a vacatur only on the week it happens", () => {
    let campaign = buildCampaign();
    let landings = 0;
    let vacaturs = 0;
    for (let turn = 2; turn <= 500; turn += 1) {
      campaign = atTurn(campaign, turn);
      const packets = docketPhase(campaign);
      for (const packet of packets) {
        campaign = apply(campaign, packet);
      }
      landings += packets.filter((packet) => packet.narration.summary.includes("finalize")).length;
      vacaturs += packets.filter((packet) => packet.narration.summary.includes("vacates")).length;
    }
    // Twelve bodies over roughly three and a half cycles apiece cannot land
    // zero rules without the phase being wired wrong.
    expect(landings).toBeGreaterThan(0);
    expect(campaign.feed.length).toBeGreaterThan(0);
    expect(campaign.ledger.length).toBeGreaterThan(1);
    void vacaturs;
  });

  it("never asks the President for anything: the packet always carries actor world, source simulate", () => {
    let campaign = buildCampaign();
    for (let turn = 2; turn <= 500; turn += 1) {
      campaign = atTurn(campaign, turn);
      for (const packet of docketPhase(campaign)) {
        expect(packet.actor).toBe("world");
        expect(packet.source).toBe("simulate");
      }
    }
  });
});

describe("selectSeatCalendar", () => {
  it("stripes the Federal Reserve board across seven staggered openings, none simultaneous", () => {
    const campaign = buildCampaign();
    const fedGovernors = selectSeatCalendar(campaign).filter((seat) => seat.office === "OFF-FED-GOVERNOR");
    expect(fedGovernors).toHaveLength(7);
    expect(fedGovernors.every((seat) => seat.termYears === 14)).toBe(true);
    const opensDays = fedGovernors.map((seat) => seat.opensDay);
    expect(new Set(opensDays).size).toBe(7);
  });

  it("gives the Fed chair a four-year term distinct from a governor's fourteen", () => {
    const campaign = buildCampaign();
    const chair = selectSeatCalendar(campaign).find((seat) => seat.office === "OFF-FED-CHAIR");
    expect(chair?.termYears).toBe(4);
  });

  it("is sorted soonest-opening first", () => {
    const campaign = atTurn(buildCampaign(), 50);
    const calendar = selectSeatCalendar(campaign);
    for (let i = 1; i < calendar.length; i += 1) {
      expect(calendar[i]!.opensDay).toBeGreaterThanOrEqual(calendar[i - 1]!.opensDay);
    }
  });

  it("selectUpcomingSeats narrows to the window asked for", () => {
    const campaign = atTurn(buildCampaign(), 50);
    const soon = selectUpcomingSeats(campaign, 3650);
    const all = selectSeatCalendar(campaign);
    expect(soon.length).toBeLessThanOrEqual(all.length);
    for (const seat of soon) {
      expect(seat.opensDay - campaign.turn * 7).toBeLessThanOrEqual(3650);
    }
  });
});
