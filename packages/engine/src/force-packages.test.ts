import { issueAction, outstandingInstrumentActs, withdrawInstrumentAct } from "./instrument-issued.js";
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { apply, type Effect } from "./effects.js";
import { availableUnitsOfType, readyShare } from "./capacity.js";
import { composeForcePackages, forceScale, packageForce } from "./force-packages.js";
import { resolvePackageCount, type CommitmentLevel } from "./force-package-brief.js";
import { projectAction, resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed, type RngStreams } from "./rng.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { Nation, type Nation as NationT } from "@admin/world";
import type { Campaign } from "./state.js";

const USA = "USA" as NationId;
const ALP = "ALP" as NationId;

function alwaysLands(label: string): RngStreams {
  const inner = createRngStreams(makeCampaignSeed(label));
  return {
    stream(...keyParts) {
      const stream = inner.stream(...keyParts);
      if (keyParts[0] === "resolution") return { ...stream, next: () => 0 };
      return stream;
    },
  };
}

function withCorps(campaign: Campaign, brigades: number): Campaign {
  const runtime = campaign.nations[campaign.founding.nation]!;
  const base = Nation.parse({
    ...runtime.base,
    stats: {
      ...runtime.base.stats,
      military: {
        ...runtime.base.stats.military,
        readiness: 0.8,
        airliftCapacity: 0.9,
        sealiftCapacity: 0.9,
        branchStrength: { ...runtime.base.stats.military.branchStrength, land: 0.8, air: 0.8, naval: 0.8 },
        orderOfBattle: {
          army: {
            headcount: runtime.base.stats.military.activeHeadcount,
            capabilities: [{ name: "army.division", count: 4 }],
            units: [{ type: "army.brigade-combat-team", count: brigades, readiness: 0.8 }],
          },
          navy: {
            headcount: 0,
            capabilities: [{ name: "navy.carrier-strike-group", count: 1 }],
            units: [
              { type: "navy.surface-combatant", count: 20, readiness: 0.8 },
              { type: "navy.aircraft-carrier", count: 11, readiness: 0.8 },
            ],
          },
          air: { headcount: 0, capabilities: [{ name: "air.fighter-squadron", count: 1 }], units: [{ type: "air.fighter", count: 400, readiness: 0.8 }] },
          marines: { headcount: 0, capabilities: [{ name: "marines.infantry-regiment", count: 1 }], units: [{ type: "marines.infantry-regiment", count: 2, readiness: 0.8 }] },
          space: { headcount: 0, capabilities: [{ name: "space.delta", count: 1 }], units: [{ type: "space.missile-warning-constellation", count: 1, readiness: 0.8 }] },
          cyber: { headcount: 0, capabilities: [{ name: "cyber.mission-force-team", count: 1 }], units: [{ type: "cyber.national-mission-team", count: 1, readiness: 0.8 }] },
        },
      },
    },
  }) as NationT;
  const stats = { ...base.stats, military: { ...base.stats.military, readiness: 0.8, airliftCapacity: 0.9, sealiftCapacity: 0.9, branchStrength: base.stats.military.branchStrength } };
  // Force acts are priced in real dollars now, and a year of a real corps does
  // not fit in the fixture's toy budget authority, so the commitment would be
  // refused before the count could be read. A founding's authority stands in.
  return {
    ...campaign,
    player: { ...campaign.player, metrics: { ...campaign.player.metrics, treasury: 357_485 } },
    nations: {
      ...campaign.nations,
      [campaign.founding.nation]: { ...runtime, base, stats },
    },
  };
}

function weeklyAmount(effects: readonly Effect[]): number | undefined {
  const effect = effects.find((entry) => entry.kind === "commitment");
  return effect?.kind === "commitment" ? effect.set.resource.amountPerTurn : undefined;
}

function standingWeekly(campaign: Campaign): number {
  return Object.values(campaign.commitments)
    .filter((commitment) => commitment.status === "active")
    .reduce((total, commitment) => total + commitment.resource.amountPerTurn, 0);
}

describe("force packages", () => {
  it("composes an expeditionary corps from uncommitted brigades", () => {
    const campaign = withCorps(buildCampaign(), 31);
    const composed = composeForcePackages(campaign, USA).find((entry) => entry.spec.id === "expeditionary-corps");
    expect(composed?.closedReason).toBeUndefined();
    // Thirty-one free, but a corps is billed at most half again its preferred eight, so twelve is the most it can be sent at.
    expect(composed?.max).toBe(12);
    expect(composed?.defaultCount).toBe(8);
  });

  it("closes a package the bench cannot fill", () => {
    const campaign = withCorps(buildCampaign(), 1);
    const composed = composeForcePackages(campaign, USA).find((entry) => entry.spec.id === "expeditionary-corps");
    expect(composed?.closedReason).toMatch(/short of the 2/);
  });

  it("refuses a scale above what is free", () => {
    const campaign = withCorps(buildCampaign(), 10);
    const streams = createRngStreams(campaign.seed);
    const result = projectAction(
      campaign,
      { actor: USA, target: ALP, instrument: "military", rung: 5, force: { branch: "army", unitType: "army.brigade-combat-team", count: 12 } },
      streams,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missingCapability).toMatch(/uncommitted ground formations|Brigade combat teams|12/);
  });

  it("prices a thinner corps below a full one on the same invasion rung", () => {
    const campaign = withCorps(buildCampaign(), 31);
    const streams = alwaysLands("scale-money");
    const corps = (count: number) => ({
      actor: USA,
      target: ALP,
      instrument: "military" as const,
      rung: 5 as const,
      force: { branch: "army" as const, unitType: "army.brigade-combat-team" as const, count },
    });
    const thinProject = projectAction(campaign, corps(2), streams);
    const fullProject = projectAction(campaign, corps(8), streams);
    expect(thinProject.ok && fullProject.ok).toBe(true);
    if (!thinProject.ok || !fullProject.ok) return;
    expect(Math.abs(fullProject.projection.cost.treasury ?? 0)).toBeGreaterThan(
      Math.abs(thinProject.projection.cost.treasury ?? 0),
    );

    const thinResolved = resolveAction(campaign, corps(2), streams);
    const fullResolved = resolveAction(campaign, corps(8), streams);
    expect(thinResolved.ok && fullResolved.ok).toBe(true);
    if (!thinResolved.ok || !fullResolved.ok) return;
    expect(thinResolved.packet.effects).not.toEqual(fullResolved.packet.effects);
    expect(weeklyAmount(fullResolved.packet.effects)!).toBeGreaterThan(weeklyAmount(thinResolved.packet.effects)!);

    const afterThin = apply(campaign, thinResolved.packet);
    const afterFull = apply(campaign, fullResolved.packet);
    expect(standingWeekly(afterThin)).toBeLessThan(standingWeekly(afterFull));
  });

  it("bills carrier presence differently from an expeditionary corps", () => {
    const campaign = withCorps(buildCampaign(), 31);
    const streams = alwaysLands("named-packages");
    const presence = projectAction(
      campaign,
      { actor: USA, target: ALP, instrument: "military", rung: 2, force: { branch: "navy", unitType: "navy.aircraft-carrier", count: 1 } },
      streams,
    );
    const invasion = projectAction(
      campaign,
      { actor: USA, target: ALP, instrument: "military", rung: 5, force: { branch: "army", unitType: "army.brigade-combat-team", count: 8 } },
      streams,
    );
    expect(presence.ok && invasion.ok).toBe(true);
    if (!presence.ok || !invasion.ok) return;
    expect(presence.projection.cost.treasury).not.toEqual(invasion.projection.cost.treasury);
  });

  it("leaves a thinner bench after a smaller corps than a larger one", () => {
    const seeded = withCorps(buildCampaign(), 31);
    const small = resolveAction(
      seeded,
      { actor: USA, target: ALP, instrument: "military", rung: 5, force: { branch: "army", unitType: "army.brigade-combat-team", count: 2 } },
      alwaysLands("scale-a"),
    );
    const large = resolveAction(
      seeded,
      { actor: USA, target: ALP, instrument: "military", rung: 5, force: { branch: "army", unitType: "army.brigade-combat-team", count: 8 } },
      alwaysLands("scale-b"),
    );
    expect(small.ok && large.ok).toBe(true);
    if (!small.ok || !large.ok) return;
    const afterSmall = apply(seeded, small.packet);
    const afterLarge = apply(seeded, large.packet);
    const leftSmall = availableUnitsOfType(afterSmall, USA, "army", "army.brigade-combat-team");
    const leftLarge = availableUnitsOfType(afterLarge, USA, "army", "army.brigade-combat-team");
    // What is left is the corps not sent, at the share of it the readiness the
    // invasion spent can still field: the larger corps spends more of both.
    const bench = (after: Campaign, sent: number) => Math.floor(31 * readyShare(after, USA) + 1e-9) - sent;
    expect(leftSmall).toBe(bench(afterSmall, 2));
    expect(leftLarge).toBe(bench(afterLarge, 8));
    expect(leftSmall!).toBeGreaterThan(leftLarge!);
    expect(small.packet.effects).not.toEqual(large.packet.effects);
  });

  it("clamps a chosen count onto the live remainder", () => {
    const composed = composeForcePackages(withCorps(buildCampaign(), 10), USA).find((entry) => entry.spec.id === "expeditionary-corps");
    expect(packageForce(composed!, 8)?.count).toBe(8);
    expect(packageForce(composed!, 40)?.count).toBe(10);
  });
});

function committedCount(effects: readonly Effect[]): number | undefined {
  const effect = effects.find((entry) => entry.kind === "commitment");
  return effect?.kind === "commitment" && effect.set.source.kind === "orderOfBattle" ? effect.set.source.count : undefined;
}

describe("one count for a package, wherever it is read", () => {
  const campaign = withCorps(buildCampaign(), 31);
  const levels: readonly CommitmentLevel[] = ["limited", "standard", "reinforced"];
  for (const composed of composeForcePackages(campaign, USA)) {
    for (const level of levels) {
      it(`${composed.spec.name} at ${level}: the count shown is the count committed and the count billed`, () => {
        const shown = resolvePackageCount(composed, level);
        const force = packageForce(composed, shown);
        expect(force?.count).toBe(shown);
        if (!force) return;
        expect(forceScale(composed.spec.rung, force) * composed.spec.preferred).toBeCloseTo(shown, 9);
        const request = { actor: USA, target: ALP, instrument: "military" as const, rung: composed.spec.rung, force };
        const result = resolveAction(campaign, request, alwaysLands(`${composed.spec.id}-${level}`));
        expect(result.ok, result.ok ? "" : result.missingCapability).toBe(true);
        if (!result.ok) return;
        expect(committedCount(result.packet.effects)).toBe(shown);
      });
    }
  }
});


it("holds a preparing package out of the shared bench and releases it on recall", () => {
  const campaign = withCorps(buildCampaign(), 20);
  const request = { actor: USA, target: ALP, instrument: "military" as const, rung: 2 as const, force: { branch: "navy" as const, unitType: "navy.aircraft-carrier" as const, count: 1 } };
  const before = availableUnitsOfType(campaign, USA, "navy", "navy.aircraft-carrier")!;
  const issued = issueAction(campaign, request, createRngStreams(campaign.seed));
  expect(issued.ok).toBe(true);
  if (!issued.ok) return;
  const pending = apply(campaign, issued.packet);
  expect(availableUnitsOfType(pending, USA, "navy", "navy.aircraft-carrier")).toBe(before - 1);
  const canceled = withdrawInstrumentAct(pending, outstandingInstrumentActs(pending)[0]!.id);
  expect(canceled.ok).toBe(true);
  if (canceled.ok) expect(availableUnitsOfType(apply(pending, canceled.packet), USA, "navy", "navy.aircraft-carrier")).toBe(before);
});
