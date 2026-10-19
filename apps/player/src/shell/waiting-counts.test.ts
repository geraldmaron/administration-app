import { describe, expect, it } from "vitest";
import { campaignDay, sealFounding, type Bill, type Campaign } from "@admin/engine";
import { DEFAULT_SEED, buildInbox, foundingOptions, openingChoices, waitingOnYou } from "@admin/player-core";
import { worldDataset } from "@admin/world";
import type { NationId } from "@admin/world";
import { mattersByPlace } from "./nav";

const options = foundingOptions(DEFAULT_SEED);
const choices = openingChoices(options);
const base = sealFounding(DEFAULT_SEED, worldDataset, { ...choices, leader: { ...choices.leader, name: "Ilsabet Ferran" } });

const deskBill: Bill = {
  id: "bill:act-tax-relief-and-growth:1",
  act: "act-tax-relief-and-growth",
  title: "Tax Relief and Growth Act",
  sponsor: "bipartisan",
  introducedTurn: base.turn,
  status: "on-the-desk",
  presentedOn: base.calendar,
  passage: [],
};

// A desk with a bill to sign and a War Powers report owed, beside whatever the opening already holds.
const loaded: Campaign = {
  ...base,
  bills: { ...base.bills, [deskBill.id]: deskBill },
  security: {
    ...base.security,
    warPowers: {
      obligations: [{
        id: "wpr:FRA:1", target: "FRA" as NationId, kind: "hostilities", rung: 4,
        openedDay: campaignDay(base), openedDate: base.calendar, dueDay: campaignDay(base) + 2, description: "Forces introduced.",
      }],
    },
  },
};

describe("every count of what waits on the President", () => {
  for (const [name, campaign] of [["the opening", base], ["a loaded desk", loaded]] as const) {
    it(`names one number on the rail, the bar, the Brief and the bell for ${name}`, () => {
      const desk = waitingOnYou(campaign);
      const rail = mattersByPlace(desk.matters);
      const bell = buildInbox(campaign, new Set()).items.filter((item) => item.source === "desk");
      expect(rail.brief?.waiting ?? 0).toBe(desk.count);
      expect(bell).toHaveLength(desk.count);
      expect(desk.count).toBe(desk.matters.length);
    });
  }

});
