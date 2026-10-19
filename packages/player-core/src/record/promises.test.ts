import { describe, expect, it } from "vitest";
import { addDays, sealFounding, sealPlatform, type Campaign, type Pledge } from "@admin/engine";
import { worldDataset, type PlankId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { DEFAULT_SEED, foundingOptions, openingChoices } from "../campaign/founding-options";
import { PLEDGE_WARNING_DAYS, selectDuePledges, selectPromises } from "./promises";

const plank = (id: string) => id as PlankId;
const PLATFORM = [plank("plank-fair-share"), plank("plank-secure-border"), plank("plank-reform-policing")];

const choices = openingChoices(foundingOptions(DEFAULT_SEED));
const sealed = sealFounding(DEFAULT_SEED, worldDataset, {
  ...choices,
  leader: { ...choices.leader, name: "Record Test" },
  platform: PLATFORM,
});

/** The same campaign with a ledger the test writes, for dates the seal alone cannot reach. */
function withLedger(pledges: readonly Pledge[]): Campaign {
  return { ...sealed, pledges };
}

describe("the Record's promises", () => {
  it("lists nothing for a President who ran on no platform", () => {
    expect(selectPromises(openingCampaign())).toEqual([]);
  });

  it("lists every pledge the seal made, titled by its plank, with what keeps and breaks it", () => {
    const rows = selectPromises(sealed);
    expect(rows.map((row) => row.plank)).toEqual(PLATFORM);
    expect(rows.map((row) => row.title)).toEqual(["Make the wealthiest pay their share", "Secure the border", "Reform policing"]);
    for (const row of rows) {
      expect(row.status).toBe("open");
      expect(row.settledDate).toBeUndefined();
      expect(row.keptWhen).toMatch(/^Kept /);
      expect(row.brokenWhen).toMatch(/^Broken /);
    }
    expect(rows[1]?.keptWhen).toBe("Kept the week the order to tighten border controls is signed.");
  });

  it("opens each promise where the act that keeps it is taken", () => {
    expect(selectPromises(sealed).map((row) => row.door)).toEqual([
      { href: "/nation/policy?domain=fiscal#policy-proposals", label: "Open the fiscal policy page" },
      { href: "/nation/policy/order/order-border-controls#order-status", label: "Open the order" },
      { href: "/nation/policy?domain=security#policy-proposals", label: "Open the security and intelligence policy page" },
    ]);
  });

  it("leads with the first hundred days and reads as the term's calendar", () => {
    const { pledges } = sealPlatform(PLATFORM, sealed.calendar, [plank("plank-reform-policing")]);
    const rows = selectPromises(withLedger(pledges));
    expect(rows.map((row) => row.plank)).toEqual(["plank-reform-policing", "plank-fair-share", "plank-secure-border"]);
    expect(rows[0]).toMatchObject({ firstHundredDays: true, dueDate: addDays(sealed.calendar, 100) });
  });

  it("shows a settled pledge with the day it was settled", () => {
    const [first, ...rest] = sealed.pledges ?? [];
    const kept = { ...first!, status: "kept" as const, settledDate: sealed.calendar };
    expect(selectPromises(withLedger([kept, ...rest]))[0]).toMatchObject({ status: "kept", settledDate: sealed.calendar });
  });

  it("refuses to render a pledge whose plank the catalog does not have", () => {
    const stray = { ...(sealed.pledges ?? [])[0]!, plank: plank("plank-nobody-drafted") };
    expect(() => selectPromises(withLedger([stray]))).toThrow(/plank-nobody-drafted/);
  });
});

describe("pledges falling due", () => {
  const [a, b, c] = sealed.pledges ?? [];
  const dueIn = (pledge: Pledge, days: number): Pledge => ({ ...pledge, dueDate: addDays(sealed.calendar, days) });

  it("needs nothing from the President on the day of the oath", () => {
    expect(selectDuePledges(sealed)).toEqual([]);
  });

  it("stops two weeks out, nearest first, and never for a settled pledge", () => {
    const ledger = [dueIn(a!, 10), dueIn(b!, PLEDGE_WARNING_DAYS), { ...dueIn(c!, 3), status: "kept" as const }];
    expect(selectDuePledges(withLedger(ledger)).map((pledge) => pledge.plank)).toEqual([a!.plank, b!.plank]);
    expect(selectDuePledges(withLedger([dueIn(a!, PLEDGE_WARNING_DAYS + 1)]))).toEqual([]);
  });

  it("keeps an overdue open pledge at the top, and honors a narrower window", () => {
    const ledger = [dueIn(a!, 6), dueIn(b!, -1)];
    expect(selectDuePledges(withLedger(ledger)).map((pledge) => pledge.plank)).toEqual([b!.plank, a!.plank]);
    expect(selectDuePledges(withLedger(ledger), 0).map((pledge) => pledge.plank)).toEqual([b!.plank]);
  });
});
