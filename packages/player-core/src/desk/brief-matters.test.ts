import { describe, expect, it } from "vitest";
import { addDays, apply, dismissMinister, flagMarker, makeCampaignSeed, scandalResponseFlag, sealFounding, type Campaign } from "@admin/engine";
import { worldDataset, type RoleId } from "@admin/world";
import { foundingOptions, openingChoices } from "../campaign/founding-options";
import { createCampaignStore } from "../campaign/store";
import { pendingConversations, scenarioMatterSource } from "../conversation/scripts";
import { createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { deskMatterSource, owedItems, presentedItems } from "./attention";
import type { CastScenario } from "@admin/content";
import { briefMatters, decisionCamera } from "./brief-matters";
import { runningClocks } from "../summons/running-index";

function founded(): Campaign {
  const seed = makeCampaignSeed("surface-audit-a");
  const choices = openingChoices(foundingOptions(seed));
  return sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
}

/** The same campaign after one Continue, so the desk carries the cases the run raised. */
async function afterOneRun(): Promise<Campaign> {
  const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()), matterSources: [deskMatterSource, scenarioMatterSource] });
  await store.begin(founded());
  const ready = store.getState();
  if (ready.status !== "ready") throw new Error("expected a ready campaign");
  await store.handOffAndContinue(undefined, { basis: ready.campaign });
  const after = store.getState();
  if (after.status !== "ready") throw new Error("expected a ready campaign");
  return after.campaign;
}

describe("where a decision is framed", () => {
  const cast = (locus: Partial<NonNullable<CastScenario["locus"]>> | undefined) => ({ counterpart: "FRA", ...(locus ? { locus } : {}) }) as unknown as CastScenario;

  it("frames its state at home, the government abroad, and the point where neither is known", () => {
    expect(decisionCamera(cast({ nation: "USA" as never, state: "OH" as never, lat: 40, lon: -83 }))).toEqual({ camera: "state:OH", selection: "state:OH" });
    expect(decisionCamera(cast({ nation: "IRN" as never, lat: 27, lon: 56 }))).toEqual({ camera: "nation:IRN", selection: "nation:IRN" });
    expect(decisionCamera(cast({ nation: "USA" as never, lat: 38.9, lon: -77.03 }))).toEqual({ camera: "point:-77.030,38.900" });
    expect(decisionCamera(cast(undefined))).toEqual({ camera: "nation:FRA", selection: "nation:FRA" });
  });
});

const STANDING = new Set(["cabinet-vacant", "executive-delivery"]);

describe("what needs the President on the Brief", () => {
  it("leads with the waiting decision, which holds the week and opens its own screen", () => {
    const campaign = founded();
    const [first] = briefMatters(campaign);
    const decision = pendingConversations(campaign)[0]!;
    expect(first).toMatchObject({ kind: "decision", holds: true, href: `/brief/decision/${decision.def.id}` });
  });

  it("lists every owed row and no ambient one but an unanswered story, the presented ones holding Continue", async () => {
    const campaign = await afterOneRun();
    const owed = new Set(owedItems(campaign).map((item) => item.id));
    const rows = briefMatters(campaign).filter((row) => row.kind !== "decision" && !row.id.startsWith("scandal:") && (owed.has(row.id) || !STANDING.has(row.id)));
    expect(rows.map((row) => row.id)).toEqual(owedItems(campaign).filter((item) => !item.id.startsWith("scandal:")).map((item) => item.id));
    expect(rows.every((row) => row.urgency !== "ambient")).toBe(true);
    const presented = new Set(presentedItems(campaign).map((item) => item.id));
    for (const row of rows) expect(row.holds, row.id).toBe(presented.has(row.id));
    const cases = rows.filter((entry) => entry.kind === "case");
    expect(cases.length).toBeGreaterThan(0);
    for (const row of cases) expect(row.href, row.id).toMatch(/^\/brief\/clock\//);
  });

  it("keeps a running story the President has not answered, without letting it hold the week", () => {
    const opening = founded();
    const flag = "scandal:missing-funds";
    // A press corps hostile enough to give the story legs past the week it broke.
    const hostile = { ...opening.press, standing: 0.05, dispositions: Object.fromEntries(Object.keys(opening.press.dispositions).map((id) => [id, 0.05])) };
    const stamped = { ...opening, press: hostile, player: { ...opening.player, flags: { ...opening.player.flags, [flag]: true, [flagMarker(flag, opening.turn)]: true } } };
    const later = { ...stamped, turn: stamped.turn + 2 };
    const row = briefMatters(later).find((matter) => matter.id.startsWith("scandal:"));
    expect(row).toMatchObject({ urgency: "ambient", holds: false, kindLabel: "Scandal" });
    expect(row?.href).toMatch(/^\/brief\/scandal\//);
    const id = row!.id.slice("scandal:".length);
    const answered = { ...later, player: { ...later.player, flags: { ...later.player.flags, [scandalResponseFlag(id, "come-clean")]: true } } };
    expect(briefMatters(answered).some((matter) => matter.id === row!.id)).toBe(false);
  });

  it("keeps an empty cabinet seat waiting on a nominee, opening the desk on that seat, without letting it hold the week", () => {
    const opening = founded();
    const dismissed = dismissMinister(opening, "role-treasury-minister" as RoleId);
    if (!dismissed.ok) throw new Error(dismissed.reason);
    const empty = apply(opening, dismissed.packet);
    const row = briefMatters(empty).find((matter) => matter.id === "cabinet-vacant");
    expect(row).toMatchObject({ title: "One cabinet seat is empty", holds: false, href: "/washington/oversight?view=appointments&seat=OFF-TREASURY-SEC" });
    expect(briefMatters(empty, { "agency-request": "log" }).some((matter) => matter.id === "cabinet-vacant")).toBe(false);
    const putOff = { ...empty, deferrals: { ...empty.deferrals, "cabinet-vacant": addDays(empty.calendar, 14) } };
    expect(briefMatters(putOff).some((matter) => matter.id === "cabinet-vacant")).toBe(false);
  });

  it("draws a countdown only where a real window runs", async () => {
    const campaign = await afterOneRun();
    for (const row of briefMatters(campaign)) {
      if (row.clock) {
        expect(row.clock.window, row.id).toBeGreaterThan(0);
        expect(row.clock.left, row.id).toBeLessThanOrEqual(row.clock.window);
      }
    }
    for (const clock of runningClocks(campaign).filter((row) => row.window)) {
      expect(clock.window!.length).toBeGreaterThan(0);
    }
  });
});
