import { describe, expect, it } from "vitest";
import type { BudgetDraftInput, Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { tariffableSectors, tariffDraft } from "../act/preview";
import { budgetDraftReading } from "../budget/appropriation-draft";
import { STALE_ACT_MESSAGE, createCampaignStore } from "../campaign/store";
import { createMemoryStorage, createSaveStore, type StoragePort } from "../persistence/save-store";
import { campaignStamp, draftSubject } from "./price";
import { ALREADY_SIGNED, MARK_UNSAVED, REVISED_DRAFT, createDraftStore, draftGroups, isStale, reconcileDrafts, type DraftEntry, type DraftStore, type OpenReview } from "./store";
import type { DraftSpec } from "./types";

const campaign = openingCampaign({ seedText: "drafts" });

/** A budget that moves one line up a fifth of a point, inside its cap. */
function budgetSpec(at: Campaign): DraftSpec {
  const reading = budgetDraftReading(at, {});
  if (!reading.ok) throw new Error(reading.reason);
  const row = reading.accounts.find((entry) => entry.inForce + 0.002 <= entry.cap);
  if (!row) throw new Error("no budget line has room to grow");
  const lines: BudgetDraftInput = { [row.account]: row.inForce + 0.002 };
  return { kind: "budget", lines };
}

/** A tariff order on one good from the first partner whose law at hand orders one. */
function tariffSpec(at: Campaign): DraftSpec {
  for (const nation of Object.keys(at.nations) as NationId[]) {
    if (nation === at.founding.nation) continue;
    const sector = tariffableSectors(at, nation).find((edge) => tariffDraft(at, nation, edge.sector, 5)?.law.orders === "tariff");
    if (sector) return { kind: "tariff", nation, goods: [{ sector: sector.sector, rate: 5 }] };
  }
  throw new Error("no partner takes a tariff");
}

/** Memory storage whose campaign writes can be refused while the drafts' own key still writes. */
function flakyStorage(): { readonly storage: StoragePort; readonly refuse: (on: boolean) => void; readonly refuseDrafts: (on: boolean) => void } {
  const inner = createMemoryStorage();
  let refusing = false;
  let refusingDrafts = false;
  const refused = (key: string) => (key.includes(":drafts:") ? refusingDrafts : refusing);
  return {
    refuse: (on) => (refusing = on),
    refuseDrafts: (on) => (refusingDrafts = on),
    storage: {
      getItem: (key) => inner.getItem(key),
      removeItem: (key) => inner.removeItem(key),
      setItem: (key, value) => (refused(key) ? Promise.reject(new Error("QuotaExceededError")) : inner.setItem(key, value)),
    },
  };
}

function open(drafts: DraftStore, subject: string): OpenReview {
  const review = drafts.review(subject);
  if (!review.ok) throw new Error(review.reason);
  return review;
}

async function desk(storage: StoragePort = createMemoryStorage()) {
  const campaigns = createCampaignStore({ saves: createSaveStore(storage) });
  await campaigns.begin(campaign);
  const drafts = createDraftStore({ campaigns });
  const ready = (): Campaign => {
    const state = campaigns.getState();
    if (state.status !== "ready") throw new Error("expected a ready campaign");
    return state.campaign;
  };
  return { campaigns, drafts, ready, storage };
}

describe("the draft model", () => {
  it("groups drafts by the authority that would act on them, executive first", async () => {
    const { drafts, ready } = await desk();
    expect((await drafts.put(budgetSpec(ready()))).ok).toBe(true);
    expect((await drafts.put(tariffSpec(ready()))).ok).toBe(true);
    const groups = draftGroups(drafts.getState().drafts, ready());
    expect(groups.map((group) => group.label)).toEqual(["Takes effect on signing", "Sent to Congress"]);
    expect(groups.map((group) => group.items.length)).toEqual([1, 1]);
    expect(groups[0]!.items[0]!.preview.verb).toBe("Sign the order");
    expect(groups[1]!.items[0]!.preview.verb).toBe("Send to Congress");
    expect(groups.every((group) => group.items.every((item) => item.preview.citation?.cite))).toBe(true);
  });

  it("keys a draft by its subject, so a second edit revises it, and an edit back to today removes it", async () => {
    const { drafts, ready } = await desk();
    const spec = budgetSpec(ready());
    await drafts.put(spec);
    await drafts.put(spec);
    expect(drafts.getState().drafts).toHaveLength(1);
    expect((await drafts.put({ kind: "budget", lines: {} })).ok).toBe(false);
    expect(drafts.getState().drafts).toHaveLength(0);
  });

  it("signs one draft at a time, and the other goes stale and is priced again on review", async () => {
    const { drafts, ready } = await desk();
    await drafts.put(budgetSpec(ready()));
    await drafts.put(tariffSpec(ready()));
    const tariff = draftSubject(tariffSpec(ready()));
    const before = ready();
    const review = open(drafts, tariff);
    expect(review.stale).toBe(false);
    const budgetBefore = open(drafts, "budget");
    const receipt = await drafts.sign(review);
    expect(receipt.persisted).toBe(true);
    expect(ready().ledger.length).toBeGreaterThan(before.ledger.length);
    expect(drafts.getState().drafts.map((draft) => draft.subject)).toEqual(["budget"]);

    const budget = drafts.getState().drafts[0]!;
    expect(isStale(budget, ready())).toBe(true);
    expect(draftGroups(drafts.getState().drafts, ready())[0]!.items[0]!.stale).toBe(true);
    // The basis the budget was drafted on is gone; signing on it applies nothing.
    expect(budgetBefore.basis).toBe(before);
    await expect(drafts.sign(budgetBefore)).rejects.toThrow(STALE_ACT_MESSAGE);
    const again = open(drafts, "budget");
    expect(again.stale).toBe(true);
    const ledger = ready().ledger.length;
    expect((await drafts.sign(again)).persisted).toBe(true);
    expect(ready().ledger.length).toBe(ledger + 1);
    expect(drafts.getState().drafts).toHaveLength(0);
  });

  it("persists drafts beside the save and reads them back after a reload", async () => {
    const storage = createMemoryStorage();
    const first = await desk(storage);
    await first.drafts.put(budgetSpec(first.ready()));
    await first.drafts.put(tariffSpec(first.ready()));

    const campaigns = createCampaignStore({ saves: createSaveStore(storage) });
    await campaigns.restore();
    const reloaded = createDraftStore({ campaigns });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const state = campaigns.getState();
    if (state.status !== "ready") throw new Error("expected a ready campaign");
    expect(reloaded.getState().drafts.map((draft) => draft.subject).sort()).toEqual(["budget", draftSubject(tariffSpec(state.campaign))].sort());
    expect(reloaded.getState().drafts.every((draft) => !isStale(draft, state.campaign))).toBe(true);
  });

  it("drops another administration's drafts when they are read back", () => {
    const other = openingCampaign({ seedText: "drafts-elsewhere" });
    const entry: DraftEntry = { subject: "budget", revision: 1, spec: budgetSpec(campaign), authority: "congress", basis: campaignStamp(other), preview: { subject: "", was: "", now: "", effect: "", effectTone: "neutral", title: "", steps: [], verb: "", route: "" } };
    expect(reconcileDrafts([entry], campaign)).toEqual([]);
    expect(reconcileDrafts("not a list", campaign)).toEqual([]);
  });

  it("keeps a draft whose save failed, refuses to sign it twice, and lets the save be retried", async () => {
    const flaky = flakyStorage();
    const { drafts, ready } = await desk(flaky.storage);
    await drafts.put(tariffSpec(ready()));
    const subject = draftSubject(tariffSpec(ready()));
    const review = open(drafts, subject);
    flaky.refuse(true);
    const receipt = await drafts.sign(review);
    expect(receipt.persisted).toBe(false);
    const kept = drafts.getState().drafts.find((draft) => draft.subject === subject);
    expect(kept?.signing?.saveError).toBeTruthy();
    await expect(drafts.sign(review)).rejects.toThrow(ALREADY_SIGNED);
    expect(drafts.review(subject).ok).toBe(false);

    expect((await drafts.retrySave(subject)).persisted).toBe(false);
    expect(drafts.getState().drafts).toHaveLength(1);
    flaky.refuse(false);
    expect((await drafts.retrySave(subject)).persisted).toBe(true);
    expect(drafts.getState().drafts).toHaveLength(0);
  });

  it("brings a signed draft back as pending when the reload lost its act, and drops it when the reload kept it", async () => {
    const flaky = flakyStorage();
    const { drafts, ready } = await desk(flaky.storage);
    const pricedOn = ready();
    await drafts.put(tariffSpec(pricedOn));
    const subject = draftSubject(tariffSpec(pricedOn));
    const review = open(drafts, subject);
    flaky.refuse(true);
    await drafts.sign(review);
    const stored = drafts.getState().drafts;
    const lost = reconcileDrafts(stored, pricedOn);
    expect(lost).toHaveLength(1);
    expect(lost[0]!.signing).toBeUndefined();
    expect(isStale(lost[0]!, pricedOn)).toBe(false);
    expect(reconcileDrafts(stored, ready())).toEqual([]);
  });

  it("refuses to sign terms revised after the sign-off opened, and applies nothing", async () => {
    const { drafts, ready } = await desk();
    const spec = tariffSpec(ready());
    if (spec.kind !== "tariff") throw new Error("expected a tariff");
    await drafts.put(spec);
    const review = open(drafts, draftSubject(spec));
    await drafts.put({ ...spec, goods: spec.goods.map((good) => ({ ...good, rate: good.rate + 1 })) });
    const ledger = ready().ledger.length;
    await expect(drafts.sign(review)).rejects.toThrow(REVISED_DRAFT);
    expect(ready().ledger.length).toBe(ledger);
  });

  it("writes a draft only to the administration it belongs to", async () => {
    const storage = createMemoryStorage();
    const { drafts, ready, campaigns } = await desk(storage);
    await drafts.put(budgetSpec(ready()));
    const firstSlot = campaigns.saves.getSaveState().activeCampaignId!;
    await campaigns.begin(openingCampaign({ seedText: "drafts-second" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(drafts.getState().drafts).toEqual([]);
    expect(await campaigns.saves.readDrafts(firstSlot)).toHaveLength(1);
  });

  it("signs nothing when the signing mark cannot be kept, so a kept act can never be signed twice", async () => {
    const flaky = flakyStorage();
    const { drafts, ready } = await desk(flaky.storage);
    const spec = tariffSpec(ready());
    await drafts.put(spec);
    const review = open(drafts, draftSubject(spec));
    flaky.refuseDrafts(true);
    const ledger = ready().ledger.length;
    await expect(drafts.sign(review)).rejects.toThrow(MARK_UNSAVED);
    expect(ready().ledger.length).toBe(ledger);
    expect(drafts.getState().drafts.find((draft) => draft.subject === draftSubject(spec))?.signing).toBeUndefined();
  });

  it("makes a signed draft pending again when the campaign is reopened without its act", async () => {
    const flaky = flakyStorage();
    const { drafts, ready, campaigns } = await desk(flaky.storage);
    const spec = tariffSpec(ready());
    await drafts.put(spec);
    const pricedOn = ready();
    flaky.refuse(true);
    await drafts.sign(open(drafts, draftSubject(spec)));
    flaky.refuse(false);
    await campaigns.restore();
    const entry = drafts.getState().drafts.find((draft) => draft.subject === draftSubject(spec));
    expect(entry?.signing).toBeUndefined();
    expect(ready().ledger.length).toBe(pricedOn.ledger.length);
    expect(isStale(entry!, ready())).toBe(false);
  });

  it("keeps each administration's drafts when the player switches between them", async () => {
    const storage = createMemoryStorage();
    const { drafts, ready, campaigns } = await desk(storage);
    await drafts.put(budgetSpec(ready()));
    const first = campaigns.saves.getSaveState().activeCampaignId!;
    await campaigns.begin(openingCampaign({ seedText: "drafts-second" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await drafts.put(budgetSpec(ready()));
    const second = campaigns.saves.getSaveState().activeCampaignId!;
    await campaigns.saves.load(first);
    await campaigns.restore();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(drafts.getState().drafts).toHaveLength(1);
    expect(await campaigns.saves.readDrafts(second)).toHaveLength(1);
    expect(await campaigns.saves.readDrafts(first)).toHaveLength(1);
  });

  it("keeps a standing draft when a revision of it is refused", async () => {
    const { drafts, ready } = await desk();
    const spec = tariffSpec(ready());
    if (spec.kind !== "tariff") throw new Error("expected a tariff");
    await drafts.put(spec);
    expect((await drafts.put({ ...spec, goods: spec.goods.map((good) => ({ ...good, rate: 1000 })) })).ok).toBe(false);
    expect(drafts.getState().drafts).toHaveLength(1);
  });
});
