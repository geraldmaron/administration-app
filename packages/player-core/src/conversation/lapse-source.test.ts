import { describe, expect, it } from "vitest";
import {
  addDays,
  flagMarker,
  makeCampaignSeed,
  sealFounding,
  selectTurnOfDate,
  type ActionRecord,
  type Campaign,
  type DocketEntry,
  type GameDate,
} from "@admin/engine";
import { scenarioUnansweredFlag } from "@admin/content";
import { worldDataset } from "@admin/world";
import { createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { deskMatterSource, matterFor, presentedItems } from "../desk/attention";
import { foundingOptions, openingChoices } from "../campaign/founding-options";
import { createCampaignStore } from "../campaign/store";
import { deferMatterPacket } from "../campaign/stop-brief";
import { chargedThisWeek, docketSilenceFlag, scenarioLapseSource } from "./lapse-source";
import { pendingConversations, scenarioMatterId, scenarioMatterSource } from "./scripts";

// The clock's lapse source, tested directly against a constructed campaign: the
// Desk clock closing a document Continue already walked past. `chargedSinceArrival`
// (the cross-turn guard) has no other caller, and the durable `docket-silence`
// flag must not, on its own, turn a later holding's own close into a skip.

function foundedCampaign(): Campaign {
  const seed = makeCampaignSeed("surface-audit-a");
  const choices = openingChoices(foundingOptions(seed));
  return sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
}

/**
 * A real campaign at a turn late enough to sit a holding's arrival a whole turn
 * behind it, with one pending cast the docket could have held. Reached the way
 * `docket-store.test.ts` reaches its casts, then read off the live store.
 */
/**
 * Clears the Desk's presented rows the way a player does.
 *
 * Continue does not put a Desk matter off for the President, so a run that means
 * to reach a later week has to dispose what is waiting first — and a matter that
 * arrives while the world is running is deferred by nothing, so this runs before
 * every press, not once.
 */
async function disposePresented(store: ReturnType<typeof createCampaignStore>): Promise<void> {
  const ready = (): Campaign => {
    const state = store.getState();
    if (state.status !== "ready") throw new Error("expected a ready campaign");
    return state.campaign;
  };
  for (const item of presentedItems(ready(), {})) {
    const basis = ready();
    await store.commit(deferMatterPacket(basis, matterFor(item, basis.calendar)), { basis });
  }
}

async function pendingCastAtLaterTurn(): Promise<{ readonly campaign: Campaign; readonly scenarioId: string }> {
  const store = createCampaignStore({
    saves: createSaveStore(createMemoryStorage()),
    matterSources: [deskMatterSource, scenarioMatterSource],
  });
  await store.begin(foundedCampaign());
  for (let press = 0; press < 15; press += 1) {
    await disposePresented(store);
    const state = store.getState();
    if (state.status !== "ready") throw new Error("expected a ready campaign");
    const cast = pendingConversations(state.campaign)[0];
    if (cast && state.campaign.turn >= 5) return { campaign: state.campaign, scenarioId: cast.def.id };
    await store.continueUntilAttention(undefined, { basis: state.campaign });
  }
  throw new Error("no pending cast reached a late enough turn");
}

function omitFlag(flags: Readonly<Record<string, boolean>>, key: string): Record<string, boolean> {
  const { [key]: _drop, ...rest } = flags;
  return rest;
}

/** A ledger entry standing for a silence Continue billed on `turn`, with the mark the guard reads. */
function silenceMark(turn: number, scenarioId: string, date: GameDate): ActionRecord {
  return {
    turn,
    actor: "world",
    description: "A prior week's silence on this document.",
    background: true,
    causal: { origin: "scenario", marks: [scenarioUnansweredFlag(scenarioId)], eventId: `ev-${turn}-0`, createdDate: date },
  };
}

function closingEntry(scenarioId: string, arrives: GameDate, closes: GameDate): DocketEntry {
  return { id: scenarioMatterId(scenarioId), ref: { scenario: scenarioId }, arrives, closes };
}

describe("the clock's lapse source", () => {
  it("does not charge again at the close when Continue already priced this holding an earlier turn (Desk clock close of a walked-past document)", async () => {
    const { campaign: base, scenarioId } = await pendingCastAtLaterTurn();
    const arrives = addDays(base.calendar, -14);
    const arrivalTurn = selectTurnOfDate(base, arrives);
    expect(arrivalTurn).toBeGreaterThanOrEqual(2);
    expect(base.turn).toBeGreaterThan(arrivalTurn);

    // The window opened `arrivalTurn` and Continue priced its silence that turn;
    // this turn carries no `flagset:` marker, so `chargedThisWeek` is blind to it.
    const campaign: Campaign = {
      ...base,
      ledger: [silenceMark(arrivalTurn, scenarioId, arrives)],
      player: {
        ...base.player,
        flags: omitFlag(
          omitFlag(base.player.flags, flagMarker(scenarioUnansweredFlag(scenarioId), base.turn)),
          docketSilenceFlag(scenarioId),
        ),
      },
    };
    // The cast is genuinely on the desk, so an empty result is the skip and not a miss.
    expect(pendingConversations(campaign).some((cast) => cast.def.id === scenarioId)).toBe(true);
    expect(chargedThisWeek(campaign, scenarioId)).toBe(false);

    const entry = closingEntry(scenarioId, arrives, campaign.calendar);
    const packets = scenarioLapseSource()(campaign, [entry], campaign.calendar);
    expect(packets).toEqual([]);
  }, 30_000);

  it("still charges a later holding of the same scenario at its own close, though docket-silence is already set (Desk clock close)", async () => {
    const { campaign: base, scenarioId } = await pendingCastAtLaterTurn();
    const arrives = addDays(base.calendar, -14);
    const arrivalTurn = selectTurnOfDate(base, arrives);
    expect(arrivalTurn).toBeGreaterThanOrEqual(2);
    expect(base.turn).toBeGreaterThan(arrivalTurn);
    const priorTurn = arrivalTurn - 1;

    // The only unanswered mark is on a turn strictly before this holding arrived,
    // and the durable docket-silence flag is set from an earlier holding. Neither
    // may excuse this holding's own close from charging.
    const campaign: Campaign = {
      ...base,
      ledger: [silenceMark(priorTurn, scenarioId, addDays(arrives, -7))],
      player: {
        ...base.player,
        flags: {
          ...omitFlag(base.player.flags, flagMarker(scenarioUnansweredFlag(scenarioId), base.turn)),
          [docketSilenceFlag(scenarioId)]: true,
        },
      },
    };
    expect(pendingConversations(campaign).some((cast) => cast.def.id === scenarioId)).toBe(true);
    expect(chargedThisWeek(campaign, scenarioId)).toBe(false);
    expect(campaign.player.flags[docketSilenceFlag(scenarioId)]).toBe(true);

    const entry = closingEntry(scenarioId, arrives, campaign.calendar);
    const packets = scenarioLapseSource()(campaign, [entry], campaign.calendar);
    expect(packets).toHaveLength(1);
    const set = packets[0]!.effects.flatMap((effect) => (effect.kind === "flag" ? effect.set ?? [] : []));
    expect(set).toContain(docketSilenceFlag(scenarioId));
  }, 30_000);
});
