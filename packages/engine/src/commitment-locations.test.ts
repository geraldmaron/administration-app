import { describe, expect, it } from "vitest";
import { BASING_SPLIT_FROM, maritimeZone, type NationId, type ZoneId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { BASING_LINES, BOARD_DEPLOYMENTS, baseCommitmentId, openingBaseCommitments, selectBases } from "./basing.js";
import { deploymentLocation, withTypedLocations } from "./commitment-locations.js";
import { joinerCommitment, openCommitment } from "./commitments.js";
import { openConflict } from "./conflicts.js";
import { createSave, loadSave } from "./save.js";
import type { Campaign, Commitment } from "./state.js";

const { campaign: sealed } = foundedForBalance("commitment-locations", "democrat", {}, { openingPreset: "world-2026" });

/** The sealed board with the Gulf front's two deployments on it, whether or not this seed carried the front. */
function withGulf(campaign: Campaign): Campaign {
  const deployments = openingBaseCommitments(campaign.nations, true).filter((commitment) => commitment.kind === "deployment");
  return { ...campaign, commitments: { ...campaign.commitments, ...Object.fromEntries(deployments.map((commitment) => [commitment.id, commitment])) } };
}

const UNPLACED = "commitment:deployment:USA:POL:3";
const COMPOSITE = "Yokosuka, Camp Zama and Yokota";
const PARTS = BASING_SPLIT_FROM[COMPOSITE]!;

/**
 * The same campaign as a v55 build would have written it: the Gulf posture
 * under its free-text theater, Japan's three installations as the one composite
 * row, and a deployment to Poland saved with no location.
 */
function asWrittenAtV55(campaign: Campaign): unknown {
  const partIds = new Set(PARTS.map((part) => baseCommitmentId("basing", "JPN", part)));
  const first = campaign.commitments[baseCommitmentId("basing", "JPN", PARTS[0]!)]!;
  const composite: Commitment = {
    ...first,
    id: baseCommitmentId("basing", "JPN", COMPOSITE),
    location: { base: COMPOSITE },
    rationale: BASING_LINES.stationed(COMPOSITE),
  };
  const gulfId = baseCommitmentId("deployment", "BHR", BOARD_DEPLOYMENTS[0]!.installation);
  const legacy = Object.fromEntries(
    Object.entries(campaign.commitments)
      .filter(([id]) => !partIds.has(id))
      .map(([id, commitment]) => {
        if (id === gulfId) return [id, { ...commitment, location: { theater: "Persian Gulf" } }];
        return [id, commitment];
      }),
  );
  const { location: _location, ...unplaced } = { ...campaign.commitments[gulfId]!, id: UNPLACED, target: { kind: "nation" as const, id: "POL" } };
  return JSON.parse(JSON.stringify({ schemaVersion: 55, campaign: { ...campaign, commitments: { ...legacy, [composite.id]: composite, [UNPLACED]: unplaced } } }));
}

describe("a typed theater", () => {
  it("writes the board's deployments into maritime zones the world names, and reads them back by name", () => {
    for (const posture of BOARD_DEPLOYMENTS) expect(maritimeZone(posture.theater), posture.theater).toBeDefined();
    const deployed = selectBases(withGulf(sealed)).filter((base) => base.kind === "deployment");
    expect(deployed.map((base) => base.theater).sort()).toEqual(["Persian Gulf and Gulf of Oman", "Red Sea and Gulf of Aden"]);
  });
});

describe("a deployment's location, written when it is committed", () => {
  it("stands a deployment to a government in its territory, and places nothing that is not a deployment", () => {
    const us = sealed.founding.nation;
    const draft = {
      kind: "deployment" as const,
      actor: us,
      target: { kind: "nation" as const, id: "POL" },
      resource: { spec: { kind: "currency" as const, scale: 6, suffix: "USD" }, amountPerTurn: 0 },
      source: { kind: "budgetLine" as const, line: "defense" as const },
      review: "standing" as const,
      rationale: "A deployment the administration chose.",
    };
    const opened = openCommitment(sealed, draft);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const set = opened.packet.effects.find((effect) => effect.kind === "commitment");
    expect(set && "set" in set ? set.set.location : undefined).toEqual({ theater: "POL" });
    expect(deploymentLocation(sealed, "aid", us, draft.target)).toBeUndefined();
    expect(deploymentLocation(sealed, "deployment", us, { kind: "org", id: "ORG-NATO" })).toBeUndefined();
  });

  it("stands a joiner's forces on the defender's ground, and the defender's own on the aggressor's", () => {
    const war = { ...openConflict("RUS" as NationId, "EST" as NationId, sealed.turn, "The border is crossed."), joined: { aggressor: [], defender: ["NLD" as NationId] } };
    const campaign = { ...sealed, conflicts: { ...sealed.conflicts, [war.id]: war } };
    expect(joinerCommitment(campaign, "NLD" as NationId, war.id)?.location).toEqual({ theater: "EST" });
    expect(deploymentLocation(campaign, "deployment", "EST" as NationId, { kind: "conflict", id: war.id })).toEqual({ theater: "RUS" });
    expect(deploymentLocation(campaign, "deployment", "NLD" as NationId, { kind: "conflict", id: "war:none" })).toBeUndefined();
  });
});

describe("the v56 load step", () => {
  const current = withGulf(sealed);
  const migrated = loadSave(asWrittenAtV55(current));

  it("maps a free-text theater to its zone and places a deployment saved with none", () => {
    expect(migrated.commitments[baseCommitmentId("deployment", "BHR", BOARD_DEPLOYMENTS[0]!.installation)]?.location).toEqual({ theater: "SEA-persian-gulf" });
    expect(migrated.commitments[UNPLACED]?.location).toEqual({ theater: "POL" });
  });

  it("splits a composite base into its installations, the stored commitment keeping its id", () => {
    const kept = migrated.commitments[baseCommitmentId("basing", "JPN", COMPOSITE)]!;
    expect(kept.location).toEqual({ base: PARTS[0] });
    expect(kept.rationale).toBe(BASING_LINES.stationed(PARTS[0]!));
    for (const part of PARTS.slice(1)) expect(migrated.commitments[baseCommitmentId("basing", "JPN", part)]?.location).toEqual({ base: part });
  });

  it("keeps every installation the current board reads, so selectBases sees the same bases", () => {
    const labels = (campaign: Campaign) => selectBases(campaign).map((base) => `${base.country}:${base.installation}`).sort();
    expect(labels(migrated)).toEqual(labels(current));
  });

  it("is idempotent and deterministic: a second load changes nothing, and the same file loads the same way", () => {
    expect(withTypedLocations(migrated)).toBe(migrated);
    expect(loadSave(JSON.parse(JSON.stringify(createSave(migrated))))).toEqual(migrated);
    expect(loadSave(asWrittenAtV55(current))).toEqual(migrated);
  });

  it("drops a theater no table names rather than keep a string the type does not describe", () => {
    const base = Object.values(current.commitments).find((commitment) => commitment.kind === "basing")!;
    const stray = { ...base, location: { base: base.location!.base!, theater: "somewhere at sea" as ZoneId } };
    const loaded = withTypedLocations({ ...current, commitments: { ...current.commitments, [stray.id]: stray } });
    expect(loaded.commitments[stray.id]?.location).toEqual({ base: base.location!.base });
  });
});
