// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Campaign, EffectPacket } from "@admin/engine";
import { STALE_ACT_MESSAGE, type ActReceipt, type CampaignState, type CampaignStore } from "@admin/player-core";
import { openingHarnessCampaign } from "../map/harness/fixture";
import { CampaignContext } from "./contexts";
import { setPendingForecastForTest, hasPendingForecast } from "../modeling/file-forecast";
import { ReviewerContext, type Reviewer } from "../review/PresidentialReview";
import type { ReviewResult, ReviewTerms } from "../review/review-machine";
import { NO_REVIEW_WORDS, NOT_READY_WORDS, useAuthorize, type AuthorizeHandle, type Authorized, type Preparation, type ReviewSpec } from "./use-authorize";

declare global {
  // React reads this to know act() is wrapping updates in a test.
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const PACKET = { kind: "test" } as unknown as EffectPacket;
/** The commit-path cases below run unreviewed, as filing does; the review cases name their own tier. */
const UNREVIEWED: ReviewSpec = { tier: "none", title: "A test act" };

/**
 * A store double holding only what the hook calls. Like the real store it
 * refuses a packet whose basis is no longer the campaign in play, and it can
 * hold a commit open or report a refused write.
 */
function fakeStore(initial: CampaignState) {
  let state = initial;
  let commits = 0;
  let release: (() => void) | undefined;
  const control = { hold: false, persisted: true };
  async function commit(_packet: EffectPacket | readonly EffectPacket[], options?: { readonly basis?: Campaign }): Promise<ActReceipt> {
    if (state.status !== "ready") throw new Error(`No campaign is in play: the store is "${state.status}".`);
    if (options?.basis && options.basis !== state.campaign) throw new Error(STALE_ACT_MESSAGE);
    commits += 1;
    state = { status: "ready", campaign: { ...state.campaign } };
    if (control.hold) await new Promise<void>((resolve) => (release = resolve));
    return control.persisted ? { eventIds: ["evt-1"], persisted: true } : { eventIds: ["evt-1"], persisted: false, saveError: "The device's storage is full." };
  }
  const store = {
    getState: () => state,
    subscribe: () => () => undefined,
    commit,
    commitAll: (packets: readonly EffectPacket[], _progress: unknown, options?: { readonly basis?: Campaign }) => commit(packets, options),
  };
  return {
    // A double, not a whole store: the hook reads getState, commit and commitAll only.
    store: store as unknown as CampaignStore,
    control,
    commits: () => commits,
    release: () => release?.(),
    setState: (next: CampaignState) => (state = next),
  };
}

let root: Root | undefined;
let container: HTMLElement | undefined;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
});

/** Mounts the hook against a store and hands back a reader for its latest render. */
function mount(store: CampaignStore, basis: Campaign, reviewer: Reviewer | null = null): () => AuthorizeHandle {
  let handle: AuthorizeHandle | undefined;
  function Probe() {
    handle = useAuthorize(basis);
    return null;
  }
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(createElement(CampaignContext.Provider, { value: store }, createElement(ReviewerContext.Provider, { value: reviewer }, createElement(Probe)))));
  return () => handle!;
}

describe("the one authorize hook", () => {
  const basis = openingHarnessCampaign("authorize-hook");

  it("takes one act per activation: a second press while the first is in flight commits nothing", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    fake.control.hold = true;
    const read = mount(fake.store, basis);
    let first: Promise<unknown> | undefined;
    let second: unknown;
    await act(async () => {
      first = read().authorize(() => ({ packet: PACKET }), UNREVIEWED);
      second = await read().authorize(() => ({ packet: PACKET }), UNREVIEWED);
    });
    expect(second).toBeUndefined();
    expect(read().busy).toBe(true);
    await act(async () => {
      fake.release();
      await first;
    });
    expect(fake.commits()).toBe(1);
    expect(read().busy).toBe(false);
  });

  it("says time moved when the campaign in play is on a later turn and date", async () => {
    const fake = fakeStore({ status: "ready", campaign: { ...basis, turn: basis.turn + 1, calendar: { ...basis.calendar, day: basis.calendar.day + 1 } } });
    const read = mount(fake.store, basis);
    let result: unknown;
    await act(async () => {
      result = await read().authorize(() => ({ packet: PACKET }), UNREVIEWED);
    });
    expect(result).toBeUndefined();
    expect(fake.commits()).toBe(0);
    expect(read().problem).toMatch(/^Time moved on to .+ in the meantime/);
    expect(read().problem).toContain("Nothing was applied");
  });

  it("says another act landed when the campaign moved without time moving", async () => {
    const fake = fakeStore({ status: "ready", campaign: { ...basis } });
    const read = mount(fake.store, basis);
    await act(async () => {
      await read().authorize(() => ({ packet: PACKET }), UNREVIEWED);
    });
    expect(read().problem).toMatch(/^Another act was taken in the meantime/);
    expect(read().problem).not.toContain("Time");
  });

  it("says the engine's own refusal when preparing the act throws", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const read = mount(fake.store, basis);
    await act(async () => {
      await read().authorize(() => {
        throw new Error("The Senate is not in session.");
      }, UNREVIEWED);
    });
    expect(read().problem).toBe("The Senate is not in session.");
    expect(fake.commits()).toBe(0);
  });

  it("keeps the receipt and flags the save error when the act applied but the device did not keep it", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    fake.control.persisted = false;
    const read = mount(fake.store, basis);
    let result: Authorized<{ readonly packet: EffectPacket; readonly title: string }> | undefined;
    await act(async () => {
      result = await read().authorize(() => ({ packet: PACKET, title: "Signed" }), UNREVIEWED);
    });
    expect(result!).toBeDefined();
    expect(result!.saveError).toBe("The device's storage is full.");
    expect(result!.eventId).toBe("evt-1");
    expect(result!.built.title).toBe("Signed");
    expect(result!.before).toBe(basis);
    expect(read().problem).toBe("");
    expect(fake.commits()).toBe(1);
  });

  it("returns a clean receipt with no save error when the act applied and saved", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const read = mount(fake.store, basis);
    let result: Authorized<Preparation> | undefined;
    await act(async () => {
      result = await read().authorize(() => ({ packet: [PACKET, PACKET] }), UNREVIEWED);
    });
    expect(result!.saveError).toBeUndefined();
    expect(result!.after).not.toBe(basis);
  });

  it("says plainly that nothing applied when no administration is open", async () => {
    const fake = fakeStore({ status: "loading" });
    const read = mount(fake.store, basis);
    let prepared = false;
    await act(async () => {
      await read().authorize(() => {
        prepared = true;
        return { packet: PACKET };
      }, UNREVIEWED);
    });
    expect(read().problem).toBe(NOT_READY_WORDS);
    expect(prepared).toBe(false);
    expect(fake.commits()).toBe(0);
  });
});

/** A reviewer that answers every review the same way and keeps what it was shown and told. */
function scriptedReviewer(confirm: boolean) {
  const opened: ReviewTerms[] = [];
  const settled: ReviewResult[] = [];
  const reviewer: Reviewer = {
    open: (terms) => {
      opened.push(terms);
      return { decision: Promise.resolve(confirm), settle: (result) => settled.push(result) };
    },
  };
  return { reviewer, opened, settled };
}

describe("the presidential review on the authorize path", () => {
  const basis = openingHarnessCampaign("authorize-review");
  const FULL: ReviewSpec = { tier: "full", title: "Sign the order", lines: [{ label: "Order", value: "Clean grid" }] };

  it("commits nothing when the President returns to the terms", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const script = scriptedReviewer(false);
    const read = mount(fake.store, basis, script.reviewer);
    let result: unknown;
    await act(async () => {
      result = await read().authorize(() => ({ packet: PACKET }), FULL);
    });
    expect(result).toBeUndefined();
    expect(fake.commits()).toBe(0);
    expect(script.opened).toHaveLength(1);
    expect(script.settled).toHaveLength(0);
    expect(read().problem).toBe("");
  });

  it("commits once on confirmation and reports the applied act back to the review", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const script = scriptedReviewer(true);
    const read = mount(fake.store, basis, script.reviewer);
    await act(async () => {
      await read().authorize(() => ({ packet: PACKET }), FULL);
    });
    expect(fake.commits()).toBe(1);
    expect(script.opened[0]).toMatchObject({ tier: "full", title: "Sign the order", verb: "Confirm", danger: false });
    expect(script.settled).toEqual([expect.objectContaining({ kind: "applied", eventId: "evt-1" })]);
  });

  it("shows only the terms the screen gave, never what the build decided", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const script = scriptedReviewer(false);
    const read = mount(fake.store, basis, script.reviewer);
    await act(async () => {
      await read().authorize(() => ({ packet: PACKET, title: "The Senate rejects the nominee" }), FULL);
    });
    expect(JSON.stringify(script.opened)).not.toContain("rejects");
  });

  it("refuses an act the engine refuses before any review opens", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const script = scriptedReviewer(true);
    const read = mount(fake.store, basis, script.reviewer);
    await act(async () => {
      await read().authorize(() => {
        throw new Error("The Senate is not in session.");
      }, FULL);
    });
    expect(script.opened).toHaveLength(0);
    expect(read().problem).toBe("The Senate is not in session.");
  });

  it("reports a stale confirmation to the review as refused, applying nothing", async () => {
    const fake = fakeStore({ status: "ready", campaign: { ...basis } });
    const script = scriptedReviewer(true);
    const read = mount(fake.store, basis, script.reviewer);
    await act(async () => {
      await read().authorize(() => ({ packet: PACKET }), FULL);
    });
    expect(fake.commits()).toBe(0);
    expect(script.settled).toEqual([expect.objectContaining({ kind: "refused" })]);
  });

  it("applies nothing unreviewed when an act needs a review and none is mounted", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const read = mount(fake.store, basis);
    await act(async () => {
      await read().authorize(() => ({ packet: PACKET }), { tier: "confirm", title: "Put it off" });
    });
    expect(fake.commits()).toBe(0);
    expect(read().problem).toBe(NO_REVIEW_WORDS);
  });

  it("drops a forecast held for an act that was canceled, and keeps one whose act applied", async () => {
    const fake = fakeStore({ status: "ready", campaign: basis });
    const canceled = mount(fake.store, basis, scriptedReviewer(false).reviewer);
    setPendingForecastForTest();
    await act(async () => {
      await canceled().authorize(() => ({ packet: PACKET }), FULL);
    });
    expect(hasPendingForecast()).toBe(false);
    act(() => root?.unmount());
    const confirmed = mount(fake.store, basis, scriptedReviewer(true).reviewer);
    setPendingForecastForTest();
    await act(async () => {
      await confirmed().authorize(() => ({ packet: PACKET }), FULL);
    });
    expect(hasPendingForecast()).toBe(true);
  });
});
