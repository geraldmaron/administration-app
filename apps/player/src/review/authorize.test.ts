import { describe, expect, it } from "vitest";
import type { Campaign, EffectPacket } from "@admin/engine";
import { STALE_ACT_MESSAGE, type ActReceipt, type CampaignState, type CampaignStore } from "@admin/player-core";
import { NOT_READY_WORDS, NO_REVIEW_WORDS, UNREAD_WORDS, authorizeAct, type ReviewerPort, type ReviewSpec } from "./authorize";
import { fileForecastAfterAct, hasPendingForecast } from "./file-forecast";
import type { ReviewResult, ReviewTerms } from "./review-machine";

const PACKET = { kind: "test" } as unknown as EffectPacket;
const FULL: ReviewSpec = { tier: "full", title: "Answer: Firm", lines: [{ label: "Matter", value: "A test matter" }], verb: "Give this answer", danger: true };
// A stand-in holding only what the path reads off a campaign: the turn, the date and the Record's length.
const basis = { turn: 3, calendar: { year: 2029, month: 2, day: 10 }, ledger: [] } as unknown as Campaign;

/** A store double that, like the real one, refuses a packet whose basis is no longer the campaign in play. */
function fakeStore(initial: CampaignState, persisted = true) {
  let state = initial;
  let commits = 0;
  async function commit(_packet: unknown, options?: { readonly basis?: Campaign }): Promise<ActReceipt> {
    if (state.status !== "ready") throw new Error("No campaign is in play.");
    if (options?.basis && options.basis !== state.campaign) throw new Error(STALE_ACT_MESSAGE);
    commits += 1;
    state = { status: "ready", campaign: { ...state.campaign, calendar: { ...state.campaign.calendar } } };
    return persisted ? { eventIds: ["evt-1"], persisted: true } : { eventIds: ["evt-1"], persisted: false, saveError: "The device's storage is full." };
  }
  const store = { getState: () => state, subscribe: () => () => undefined, commit, commitAll: (packets: unknown, _progress: unknown, options?: { readonly basis?: Campaign }) => commit(packets, options) };
  return { store: store as unknown as CampaignStore, commits: () => commits, setState: (next: CampaignState) => (state = next) };
}

/** A reviewer that answers as scripted and keeps what it was shown and told. */
function scriptedReviewer(confirm: boolean) {
  const opened: ReviewTerms[] = [];
  const settled: ReviewResult[] = [];
  const reviewer: ReviewerPort = {
    open: (terms) => {
      opened.push(terms);
      return { decision: Promise.resolve(confirm), settle: (result) => settled.push(result) };
    },
  };
  return { reviewer, opened, settled };
}

const deps = (store: CampaignStore, reviewer: ReviewerPort | null) => ({ store, reviewer, basis, onBusy: () => undefined });

describe("the authorize path", () => {
  it("commits exactly once, after the named confirmation, and settles the review with the date and the Record entry", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const review = scriptedReviewer(true);
    const outcome = await authorizeAct(deps(fake.store, review.reviewer), () => ({ packet: PACKET }), FULL);
    expect(outcome.ok).toBe(true);
    expect(fake.commits()).toBe(1);
    expect(review.opened[0]).toEqual({ tier: "full", title: "Answer: Firm", lines: FULL.lines, verb: "Give this answer", danger: true });
    expect(review.settled).toEqual([{ kind: "applied", date: "February 10, 2029", eventId: "evt-1" }]);
  });

  it("commits nothing when the review is canceled, and says nothing", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const outcome = await authorizeAct(deps(fake.store, scriptedReviewer(false).reviewer), () => ({ packet: PACKET }), FULL);
    expect(outcome).toEqual({ ok: false, problem: "" });
    expect(fake.commits()).toBe(0);
  });

  it("refuses a stale press with what moved, and settles the review as refused", async () => {
    const later = { ...basis, turn: 4, calendar: { year: 2029, month: 2, day: 17 } } as unknown as Campaign;
    const fake = fakeStore({ status: "ready", campaign: later });
    const review = scriptedReviewer(true);
    const outcome = await authorizeAct(deps(fake.store, review.reviewer), () => ({ packet: PACKET }), FULL);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.problem).toMatch(/^Time moved on to February 17, 2029/);
    expect(review.settled[0]?.kind).toBe("refused");
    expect(fake.commits()).toBe(0);
  });

  it("says the engine's own refusal before any review opens", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const review = scriptedReviewer(true);
    const outcome = await authorizeAct(deps(fake.store, review.reviewer), () => {
      throw new Error("The forces are not available.");
    }, FULL);
    expect(outcome).toEqual({ ok: false, problem: "The forces are not available." });
    expect(review.opened).toHaveLength(0);
  });

  it("refuses with no review mounted and with no administration open", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    expect(await authorizeAct(deps(fake.store, null), () => ({ packet: PACKET }), FULL)).toEqual({ ok: false, problem: NO_REVIEW_WORDS });
    fake.setState({ status: "empty" } as CampaignState);
    expect(await authorizeAct(deps(fake.store, null), () => ({ packet: PACKET }), { tier: "none", title: "Filing" })).toEqual({ ok: false, problem: NOT_READY_WORDS });
  });

  it("reports a write the device did not keep without running the act again", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis }, false);
    const review = scriptedReviewer(true);
    const outcome = await authorizeAct(deps(fake.store, review.reviewer), () => ({ packet: PACKET }), FULL);
    expect(outcome.ok && outcome.authorized.saveError).toBe("The device's storage is full.");
    expect(review.settled[0]).toMatchObject({ kind: "applied", saveError: "The device's storage is full." });
    expect(fake.commits()).toBe(1);
  });

  it("says the act applied when the administration cannot be read back", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const store = { ...fake.store, commit: async (packet: EffectPacket, options?: { readonly basis?: Campaign }) => {
      const receipt = await fake.store.commit(packet, options);
      fake.setState({ status: "empty" } as CampaignState);
      return receipt;
    } } as unknown as CampaignStore;
    const review = scriptedReviewer(true);
    expect(await authorizeAct(deps(store, review.reviewer), () => ({ packet: PACKET }), FULL)).toEqual({ ok: false, problem: UNREAD_WORDS });
    expect(review.settled[0]).toEqual({ kind: "unread", words: UNREAD_WORDS });
  });

  it("drops a forecast held for an act that never landed", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    fileForecastAfterAct(fake.store, basis, PACKET);
    expect(hasPendingForecast()).toBe(true);
    await authorizeAct(deps(fake.store, scriptedReviewer(false).reviewer), () => ({ packet: PACKET }), FULL);
    expect(hasPendingForecast()).toBe(false);
  });
});
