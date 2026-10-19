import { describe, expect, it } from "vitest";
import { advanceTurn, apply, campaignTurnPhases, createSave, dismissMinister, loadSave,
  tariffPacket, liftMeasure, openNomination, selectFormerService, selectLiveMeasures, selectNominableFor,
  tradeEdge, TRADE_SECTORS, type Campaign, type EffectPacket } from "@admin/engine";
import type { RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { headlineOf, readingMoves, recordEntry, recordRows } from "./record-entry";

function act(campaign: Campaign, summary: string, stability: number): EffectPacket {
  return { source: "action", actor: "player", turn: campaign.turn, narration: { summary }, effects: [{ kind: "metric", deltas: { stability } }] };
}

function weeksOn(campaign: Campaign, weeks: number): Campaign {
  const phases = campaignTurnPhases(charterOf(campaign));
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) working = advanceTurn(working, phases);
  return working;
}

const opening = openingCampaign();
const acted = apply(opening, act(opening, "Ordered the review.", -0.02));
const later = weeksOn(apply(acted, act(acted, "Signed the second order.", 0.01)), 3);
const firstId = acted.ledger.at(-1)!.causal!.eventId;

describe("a Record entry's readings", () => {
  it("states each reading the act moved as it stood before and after, however much has happened since", () => {
    const entry = recordEntry(later, firstId)!;
    const stability = entry.moves.find((move) => move.key === "stability")!;
    expect(stability.after).toBeCloseTo(acted.player.metrics.stability, 9);
    expect(stability.before).toBeCloseTo(opening.player.metrics.stability, 9);
    expect(stability.delta).toBeCloseTo(-0.02, 9);
    expect(stability.text).toBe("−2 points");
  });

  it("names its actor and leaves the world's bookkeeping off the timeline", () => {
    const rows = recordRows(later);
    expect(rows.map((row) => row.description)).toContain("Ordered the review.");
    expect(rows.find((row) => row.id === firstId)?.actorWord).toBe("Your administration");
    const background = new Set(later.ledger.filter((row) => row.background).map((row) => row.causal?.eventId));
    expect(rows.some((row) => background.has(row.id))).toBe(false);
    expect(recordRows(later, "player").every((row) => row.actor === "player")).toBe(true);
  });

  it("says what one act did between the campaign before it and the campaign after it", () => {
    const moves = readingMoves(opening, acted);
    expect(moves.map((move) => move.key)).toContain("stability");
    const stability = moves.find((move) => move.key === "stability")!;
    expect(stability.delta).toBeCloseTo(-0.02, 9);
    expect(stability.beforeText).toMatch(/%$/);
    expect(readingMoves(acted, acted)).toEqual([]);
  });

  it("carries the subsystems an entry moved and the foreign governments it names, once each, for the timeline's mark and flags", () => {
    const stamped = apply(acted, { ...act(acted, "Recalled the ambassador.", 0), provenance: { origin: "decision", systems: ["statecraft", "diplomatic"], entities: ["USA", "CAN", "MEX", "CAN"] } });
    const row = recordRows(stamped)[0]!;
    expect(row.systems).toEqual(["statecraft", "diplomatic"]);
    expect(row.nations).toEqual(["CAN", "MEX"]);
    expect(recordRows(acted).find((entry) => entry.id === firstId)?.nations).toEqual([]);
  });

  it("titles an entry by its first sentence", () => {
    expect(headlineOf("Forward Deploy · Iran ordered. Preparation is underway; no outcome yet.")).toBe("Forward Deploy · Iran ordered.");
    expect(headlineOf("Ordered the review.")).toBe("Ordered the review.");
    expect(headlineOf("The President proposes raising U.S. tariffs on steel. Congress has 30 days.")).toBe("The President proposes raising U.S. tariffs on steel.");
    expect(headlineOf("Raised $1.2B. More follows.")).toBe("Raised $1.2B.");
  });

  it("is newest first, and answers nothing for an id the ledger does not hold", () => {
    const rows = recordRows(later);
    const first = rows.findIndex((row) => row.id === firstId);
    const second = rows.findIndex((row) => row.description === "Signed the second order.");
    expect(second).toBeLessThan(first);
    expect(recordEntry(later, "no-such-event")).toBeUndefined();
  });
});

it("keeps the original cabinet departure on the Record after a successor is nominated and the save reloads", () => {
  const role = "role-defense-minister" as RoleId;
  const founded = openingCampaign({ seedText: "record-cabinet-succession" });
  const incumbent = founded.player.cabinet[role];
  if (!incumbent) throw new Error("the founding did not seat Defense");
  const dismissal = dismissMinister(founded, role);
  if (!dismissal.ok) throw new Error(dismissal.reason);
  const emptied = apply(founded, dismissal.packet);
  const departureId = emptied.ledger.at(-1)?.causal?.eventId;
  if (!departureId) throw new Error("dismissal left no Record event");
  const departure = recordEntry(emptied, departureId);
  expect(departure?.description).toContain(founded.people[incumbent]!.base.name);

  const successor = selectNominableFor(emptied, "OFF-DEFENSE-SEC")[0];
  if (!successor) throw new Error("nobody can be sent up for Defense");
  const nomination = openNomination(emptied, "OFF-DEFENSE-SEC", successor.base.id);
  if (!nomination.ok) throw new Error(nomination.reason);
  const sent = apply(emptied, nomination.packet);
  const nominationId = sent.ledger.at(-1)?.causal?.eventId;
  if (!nominationId) throw new Error("the nomination left no Record event");
  const restored = loadSave(JSON.parse(JSON.stringify(createSave(sent))));

  expect(Object.values(restored.nominations).some((entry) => entry.nominee === successor.base.id)).toBe(true);
  expect(selectFormerService(restored, incumbent)?.person).toBe(incumbent);
  expect(recordEntry(restored, departureId)?.description).toBe(departure?.description);
  expect(recordEntry(restored, departureId)?.actorWord).toBe(departure?.actorWord);
  expect(recordEntry(restored, departureId)?.date).toEqual(departure?.date);
  expect(restored.ledger.find((entry) => entry.causal?.eventId === departureId))
    .toEqual(emptied.ledger.find((entry) => entry.causal?.eventId === departureId));
  expect(recordEntry(restored, nominationId)?.description).toContain(successor.base.name);
  expect(recordEntry(restored, nominationId)?.actorWord).toBe("Your administration");
});

it("keeps a real tariff-to-lift cause readable on the Record after reload", () => {
  const founded = openingCampaign({ seedText: "record-tariff-cause" });
  let chosen: ReturnType<typeof tariffPacket> | undefined;
  for (const nation of Object.values(founded.nations)) {
    if (nation.base.id === founded.founding.nation) continue;
    for (const sector of TRADE_SECTORS) {
      if (sector.instrument !== "tariff" || !tradeEdge(founded, nation.base.id, sector.id)) continue;
      const result = tariffPacket(founded, nation.base.id, sector.id, 0.35, "s301");
      if (result.ok) { chosen = result; break; }
    }
    if (chosen) break;
  }
  if (!chosen?.ok) throw new Error("no trade partner accepted a tariff");
  const signed = apply(founded, chosen.packet);
  const tariffId = signed.ledger.at(-1)?.causal?.eventId;
  const measure = selectLiveMeasures(signed).find((item) => item.origin === "us" && !(item.id in founded.trade.measures));
  if (!tariffId || !measure) throw new Error("tariff left no linked measure");
  const lifted = liftMeasure(signed, measure.id);
  if (!lifted.ok) throw new Error(lifted.reason);
  const ended = apply(signed, lifted.packet);
  const liftId = ended.ledger.at(-1)?.causal?.eventId;
  if (!liftId) throw new Error("lift left no Record event");
  expect(recordEntry(ended, liftId)?.causes.map((cause) => cause.id)).toContain(tariffId);

  const restored = loadSave(JSON.parse(JSON.stringify(createSave(ended))));
  expect(restored.ledger).toEqual(ended.ledger);
  expect(recordEntry(restored, liftId)?.causes.map((cause) => cause.id)).toContain(tariffId);
  expect(recordEntry(restored, tariffId)?.consequences.map((effect) => effect.id)).toContain(liftId);
});
