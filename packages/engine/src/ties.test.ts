import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply, type EffectPacket } from "./effects.js";
import { CURRENT_SCHEMA_VERSION, createSave, loadSave } from "./save.js";
import { EMPTY_TIE, figureRapport, openFavorsOwedByPresident, rapportOf, tieOf, type TieEffect } from "./ties.js";
import type { PersonId } from "@admin/world";
import type { Campaign, Favor } from "./state.js";

const { campaign } = foundedForBalance("ties", "democrat");

/** Someone the founding left with no tie, so every test starts from the neutral reading. */
const stranger = Object.values(campaign.people).find((runtime) => runtime.tie === undefined)!.base.id;

function packet(...effects: TieEffect[]): EffectPacket {
  return { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "A test of the ledger." }, effects };
}

const favor = (id: string, billId = "bill:test"): Favor => ({
  id,
  direction: "owed-by-president",
  what: "A place in the appropriation path for a test bill",
  openedTurn: campaign.turn,
  status: "open",
  billId,
  reservedTreasury: 0,
});

describe("the tie effect", () => {
  it("reads a person nobody has dealt with as neutral", () => {
    expect(tieOf(campaign.people, stranger)).toBeUndefined();
    expect(rapportOf(campaign.people, stranger)).toBe(0.5);
  });

  it("sets and moves rapport, clamped to the scale and kept to three places", () => {
    const set = apply(campaign, packet({ kind: "tie", person: stranger, cause: "A good meeting.", rapport: { set: 0.7 } }));
    expect(rapportOf(set.people, stranger)).toBe(0.7);
    const moved = apply(set, packet({ kind: "tie", person: stranger, cause: "Another.", rapport: { delta: 0.12345 } }));
    expect(rapportOf(moved.people, stranger)).toBe(0.823);
    const capped = apply(moved, packet({ kind: "tie", person: stranger, cause: "Too much.", rapport: { delta: 5 } }));
    expect(rapportOf(capped.people, stranger)).toBe(1);
  });

  it("moves trust without touching rapport", () => {
    const after = apply(campaign, packet({ kind: "tie", person: stranger, cause: "Kept their word.", trust: { delta: 0.2 } }));
    expect(tieOf(after.people, stranger)).toEqual({ ...EMPTY_TIE, trust: 0.7 });
  });

  it("opens a favor, then settles it, keeping the turn it was settled on", () => {
    const opened = apply(campaign, packet({ kind: "tie", person: stranger, cause: "A trade.", openFavor: favor("favor:a") }));
    expect(openFavorsOwedByPresident(opened).map((held) => [held.id, held.holder])).toEqual([["favor:a", stranger]]);
    const settled = apply(
      opened,
      packet({ kind: "tie", person: stranger, cause: "Called in.", settleFavor: { id: "favor:a", status: "called", turn: 9 } }),
    );
    expect(openFavorsOwedByPresident(settled)).toEqual([]);
    expect(tieOf(settled.people, stranger)!.favors).toEqual([{ ...favor("favor:a"), status: "called", settledTurn: 9 }]);
  });

  it("adds a grudge with its cause", () => {
    const grudge = { cause: "Attacked in their own state.", weight: 0.4, turn: campaign.turn };
    const after = apply(campaign, packet({ kind: "tie", person: stranger, cause: grudge.cause, grudge }));
    expect(tieOf(after.people, stranger)!.grudges).toEqual([grudge]);
  });

  it("refuses a change with no cause, a person who does not exist, and a favor nobody holds", () => {
    expect(() => apply(campaign, packet({ kind: "tie", person: stranger, cause: "  ", rapport: { set: 1 } }))).toThrow(/cause/);
    expect(() => apply(campaign, packet({ kind: "tie", person: "PER-NOBODY" as PersonId, cause: "x", rapport: { set: 1 } }))).toThrow(/no person/);
    expect(() =>
      apply(campaign, packet({ kind: "tie", person: stranger, cause: "x", settleFavor: { id: "favor:none", status: "repaid", turn: 1 } })),
    ).toThrow(/no favor/);
  });
});

// --- Bringing a v62 save forward --------------------------------------------

type LegacyPromise = {
  readonly id: string;
  readonly post: string;
  readonly billId: string;
  readonly title: string;
  readonly actId: string;
  readonly openedTurn: number;
  readonly lobbyId: string;
  readonly status: "open" | "kept" | "broken";
  readonly reservedTreasury: number;
  readonly settledTurn?: number;
};

/** The campaign as a v62 build wrote it: warmth on the figure, promises on the Congress, no ties anywhere. */
function asV62(current: Campaign, promises: readonly LegacyPromise[]): unknown {
  const people = Object.fromEntries(
    Object.entries(current.people).map(([id, runtime]) => {
      const { tie: _tie, ...rest } = runtime;
      return [id, rest];
    }),
  );
  const leadership = current.congress.leadership.map((figure) => ({ ...figure, disposition: figureRapport(current.people, figure) }));
  return JSON.parse(JSON.stringify({ ...current, people, congress: { ...current.congress, leadership, promises } }));
}

describe("a v62 save", () => {
  const [speaker, leader] = campaign.congress.leadership;
  const promises: readonly LegacyPromise[] = [
    { id: "promise:lobby:a", post: speaker!.post, billId: "bill:a", title: "Bill A", actId: "act-a", openedTurn: 3, lobbyId: "lobby:a", status: "open", reservedTreasury: 120 },
    { id: "promise:lobby:b", post: leader!.post, billId: "bill:b", title: "Bill B", actId: "act-b", openedTurn: 2, lobbyId: "lobby:b", status: "kept", reservedTreasury: 0, settledTurn: 5 },
    { id: "promise:lobby:c", post: leader!.post, billId: "bill:c", title: "Bill C", actId: "act-c", openedTurn: 1, lobbyId: "lobby:c", status: "broken", reservedTreasury: 0, settledTurn: 4 },
  ];
  const loaded = loadSave({ schemaVersion: 62, campaign: asV62(campaign, promises) });

  it("moves each figure's disposition onto its holder's rapport unchanged", () => {
    for (const figure of campaign.congress.leadership) {
      expect(rapportOf(loaded.people, figure.person)).toBe(figureRapport(campaign.people, figure));
      expect("disposition" in figure).toBe(false);
    }
    expect(loaded.congress.leadership).toEqual(campaign.congress.leadership);
    expect("promises" in loaded.congress).toBe(false);
  });

  it("turns each promise into a favor owed to the member holding that post, settled the same way", () => {
    const favors = (person: PersonId) => tieOf(loaded.people, person)!.favors.map((entry) => [entry.id, entry.status, entry.settledTurn]);
    expect(favors(speaker!.person)).toEqual([["promise:lobby:a", "open", undefined]]);
    expect(favors(leader!.person)).toEqual([
      ["promise:lobby:b", "repaid", 5],
      ["promise:lobby:c", "defaulted", 4],
    ]);
    const open = openFavorsOwedByPresident(loaded);
    expect(open.map((entry) => [entry.id, entry.billId, entry.reservedTreasury, entry.post])).toEqual([["promise:lobby:a", "bill:a", 120, speaker!.post]]);
  });

  it("round-trips at the current version without gaining or losing a tie", () => {
    const save = createSave(loaded);
    expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe(67);
    const again = loadSave(JSON.parse(JSON.stringify(save)) as unknown);
    const ties = (state: Campaign) =>
      Object.fromEntries(Object.entries(state.people).flatMap(([id, runtime]) => (runtime.tie ? [[id, runtime.tie]] : [])));
    expect(Object.keys(ties(loaded))).toHaveLength(campaign.congress.leadership.length);
    expect(ties(again)).toEqual(ties(loaded));
    expect(Object.keys(ties(again)).sort()).toEqual(Object.keys(ties(campaign)).sort());
  });
});
