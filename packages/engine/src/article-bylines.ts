/**
 * The reporters a desk puts on a story.
 *
 * Three per desk, drawn from the country's own name bank through the same
 * drawer that names every person in the game, so the real-name guard and the
 * leaders' surnames are refused here exactly as they are for a cabinet. A
 * byline is a name, not a character: reporters are never stored, and the same
 * campaign seed always staffs the same desk with the same three people.
 */
import { nameCultureFor } from "@admin/world";
import type { FeedItem } from "./state.js";
import { PRESS_OUTLETS } from "./press-outlets.js";
import { drawName, newNameLedger } from "./naming.js";
import { createRngStreams, hashIndex, makeCampaignSeed } from "./rng.js";

export const REPORTERS_PER_DESK = 3;

// Whose name bank the corps is staffed from. The press that covers an American
// President is American, including the desks that cover the world for it.
const PRESS_NATION = "USA";

// Read-time composition has no campaign to hand, so an item filed before its
// desk was stored draws from a fixed staff rather than an arbitrary one.
const UNSEEDED = "press-corps";

const staffBySeed = new Map<string, Readonly<Record<string, readonly string[]>>>();

function staffCorps(seed: string): Readonly<Record<string, readonly string[]>> {
  const streams = createRngStreams(makeCampaignSeed(seed));
  const culture = nameCultureFor(PRESS_NATION);
  // One ledger across the whole corps, so no two reporters anywhere share a name.
  const taken = newNameLedger();
  return Object.fromEntries(
    PRESS_OUTLETS.map((outlet) => [
      outlet.id,
      Array.from({ length: REPORTERS_PER_DESK }, (_, index) => {
        const stream = streams.stream("reporter", outlet.id, index);
        const gender = stream.next() < 0.5 ? "feminine" : "masculine";
        return drawName(stream, { nation: PRESS_NATION, culture, gender }, taken);
      }),
    ]),
  );
}

/** Every desk's staff under one seed, drawn once and kept, since drawing a name bank is not free. */
export function deskStaff(seed: string = UNSEEDED): Readonly<Record<string, readonly string[]>> {
  const cached = staffBySeed.get(seed);
  if (cached) return cached;
  const staff = staffCorps(seed);
  staffBySeed.set(seed, staff);
  return staff;
}

/** Every name the desks use under one seed, so a test can hold them against the real-name guard. */
export function reporterRoster(seed?: string): readonly string[] {
  return Object.values(deskStaff(seed)).flat();
}

/** Which of a desk's three reporters files this item: the same item always draws the same one. */
export function reporterFor(outletId: string, item: FeedItem, seed?: string): string | undefined {
  const staff = deskStaff(seed)[outletId];
  if (!staff) return undefined;
  return staff[hashIndex(`${item.turn}:${item.headline}:${outletId}`, staff.length)];
}
