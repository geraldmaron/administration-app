import { describe, expect, it } from "vitest";
import {
  INSTITUTION_CATALOG,
  apply,
  dismissMinister,
  confirmationVote,
  projectDismissal,
  openNomination,
  selectAppointableFor,
  withdrawNomination,
  type Campaign,
  type EffectPacket,
  type RemovalConstraint,
} from "@admin/engine";
import type { RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { appointmentLever, personLever, withdrawalLever } from "./person-lever";

const LABOR = "role-labor-secretary" as RoleId;

function metricSum(packet: EffectPacket): Record<string, number> {
  const total: Record<string, number> = {};
  for (const effect of packet.effects) {
    if (effect.kind !== "metric") continue;
    for (const [key, delta] of Object.entries(effect.deltas)) total[key] = (total[key] ?? 0) + (delta ?? 0);
  }
  return total;
}

function withAmbition(campaign: Campaign, role: RoleId, ambition: number): Campaign {
  const id = campaign.player.cabinet[role]!;
  const runtime = campaign.people[id]!;
  return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ambition } } } };
}

/** The first body below the cabinet whose office is held under this removal rule. */
function officerSeat(campaign: Campaign, removal: RemovalConstraint) {
  const def = INSTITUTION_CATALOG.find(
    (entry) => !entry.cabinetRole && entry.offices[0]?.removal === removal && campaign.institutions[entry.id]?.leader !== undefined,
  )!;
  return { kind: "officer" as const, institution: def.id, title: def.offices[0]!.title, body: def.abbr, removal };
}

describe("the dismissal lever", () => {
  const campaign = openingCampaign();

  it("quotes exactly what the dismissal spends", () => {
    const lever = personLever(campaign, { kind: "cabinet", role: LABOR, title: "Secretary of Labor" });
    const projection = projectDismissal(campaign, LABOR);
    const dismissal = dismissMinister(campaign, LABOR);
    if (lever.kind !== "available" || !projection.ok || !dismissal.ok) throw new Error("Labor should be dismissible at the oath");
    expect(lever.cost).toEqual(projection.cost);
    expect(lever.cost).toEqual(metricSum(dismissal.packet));
  });

  it("says whether they leave quietly or as a rival faction, the way the dismissal decides it", () => {
    const quiet = personLever(withAmbition(campaign, LABOR, 0.1), { kind: "cabinet", role: LABOR, title: "Secretary of Labor" });
    const rival = personLever(withAmbition(campaign, LABOR, 0.95), { kind: "cabinet", role: LABOR, title: "Secretary of Labor" });
    expect(quiet.kind === "available" && quiet.departure).toBe("quiet");
    expect(quiet.kind === "available" && quiet.risks).toEqual([]);
    expect(rival.kind === "available" && rival.departure).toBe("faction");
    expect(rival.kind === "available" && rival.risks.map((risk) => risk.id)).toEqual(["dismissal-faction"]);
    expect(rival.kind === "available" && rival.cost.stability).toBeLessThan(0);
  });

  it("repeats the engine's refusal for a chair that is already empty", () => {
    const dismissal = dismissMinister(campaign, LABOR);
    if (!dismissal.ok) throw new Error(dismissal.reason);
    const empty = apply(campaign, dismissal.packet);
    const lever = personLever(empty, { kind: "cabinet", role: LABOR, title: "Secretary of Labor" });
    expect(lever).toEqual({ kind: "refused", rule: expect.any(String), refusal: "That chair is already empty." });
  });

  it("has nothing to offer on a person who holds no chair", () => {
    expect(personLever(campaign, undefined).kind).toBe("none");
  });
});

describe("the removal lever below the cabinet", () => {
  const campaign = openingCampaign();

  it("prices an at-will removal as costing no reading this week", () => {
    const lever = personLever(campaign, officerSeat(campaign, "at-will"));
    expect(lever).toMatchObject({ kind: "available", cost: {}, risks: [] });
  });

  it("names the politicization a for-cause removal brings, off the packet it would commit", () => {
    const lever = personLever(campaign, officerSeat(campaign, "for-cause"));
    expect(lever.kind === "available" && lever.risks.map((risk) => risk.id)).toEqual(["removal-politicized"]);
  });

  it("refuses a term-protected office in the engine's words", () => {
    const lever = personLever(campaign, officerSeat(campaign, "term-protected"));
    expect(lever.kind).toBe("refused");
    expect(lever.kind === "refused" && lever.refusal).toContain("fixed term");
  });
});

describe("the appointment lever", () => {
  it("quotes exactly what the nomination spends, and today's count", () => {
    const dismissal = dismissMinister(openingCampaign(), LABOR);
    if (!dismissal.ok) throw new Error(dismissal.reason);
    const open = apply(openingCampaign(), dismissal.packet);
    const candidate = selectAppointableFor(open, LABOR)[0]!.base.id;
    const lever = appointmentLever(open, LABOR, candidate);
    const nomination = openNomination(open, "OFF-LABOR-SEC", candidate);
    if (lever.kind !== "available" || !nomination.ok) throw new Error("the bench should take a Secretary of Labor");
    expect(lever.cost).toEqual(metricSum(nomination.packet));
    expect(lever.confirms).toBe(confirmationVote(open, candidate).passed);
  });

  it("repeats the refusal for a chair somebody sits in", () => {
    const campaign = openingCampaign();
    const candidate = selectAppointableFor(campaign, LABOR)[0]!.base.id;
    expect(appointmentLever(campaign, LABOR, candidate).kind).toBe("refused");
  });
});

describe("the withdrawal lever", () => {
  it("quotes what pulling the name back costs, and nothing for a nomination that is not running", () => {
    const dismissal = dismissMinister(openingCampaign(), LABOR);
    if (!dismissal.ok) throw new Error(dismissal.reason);
    const open = apply(openingCampaign(), dismissal.packet);
    const opened = openNomination(open, "OFF-LABOR-SEC", selectAppointableFor(open, LABOR)[0]!.base.id);
    if (!opened.ok) throw new Error(opened.reason);
    const pending = apply(open, opened.packet);
    const id = Object.keys(pending.nominations)[0]!;
    const withdrawal = withdrawNomination(pending, id);
    if (!withdrawal.ok) throw new Error(withdrawal.reason);
    expect(withdrawalLever(pending, id)).toEqual({ cost: metricSum(withdrawal.packet), risks: [] });
    expect(withdrawalLever(pending, "OFF-NOWHERE:1")).toBeUndefined();
  });
});
