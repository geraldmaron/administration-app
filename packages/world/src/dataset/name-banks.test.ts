import { describe, expect, it } from "vitest";
import { NAME_BANKS } from "./name-banks.js";
import type { NameBank } from "../schemas/people-pool.js";

// A leader drawn as "Hoàng Lap" should have read "Hoàng Lập": the vietnamese
// bank carried both spellings as separate entries, so the ASCII-stripped one
// drew half the time and doubled "Lập"'s weight into the bargain. Folding
// every entry the same way — NFD-normalize, drop the combining marks that
// carries both tone and vowel quality, lowercase — turns that class of bug
// into two entries that land on the same key.
function fold(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type Collision = { readonly culture: string; readonly groupIndex: number; readonly list: string; readonly entries: readonly string[] };

/** Every (culture, group, list) location where two distinct spellings fold to the same letters. */
function foldCollisions(banks: Readonly<Record<string, NameBank>>): readonly Collision[] {
  const found: Collision[] = [];
  for (const [culture, bank] of Object.entries(banks)) {
    bank.groups.forEach((group, groupIndex) => {
      const lists: Readonly<Record<string, readonly string[]>> = {
        "given.masculine": group.given.masculine,
        "given.feminine": group.given.feminine,
        "given.neutral": group.given.neutral,
        surname: group.surname,
      };
      for (const [list, entries] of Object.entries(lists)) {
        const byFold = new Map<string, string[]>();
        for (const entry of entries) {
          const key = fold(entry);
          const bucket = byFold.get(key);
          if (bucket) bucket.push(entry);
          else byFold.set(key, [entry]);
        }
        for (const bucket of byFold.values()) {
          if (bucket.length > 1) found.push({ culture, groupIndex, list, entries: bucket });
        }
      }
    });
  }
  return found;
}

/**
 * Fold collisions that are two real names, not a stripped twin, each with the
 * one-line reason a reviewer can check. Keyed by culture/list/folded form.
 */
const ALLOWED_FOLD_COLLISIONS: ReadonlySet<string> = new Set([
  // "Thúy" (sắc tone: bright, pretty) and "Thuỷ" (hỏi tone: water) are
  // different words carrying different tones, not one name missing marks —
  // both are common Vietnamese feminine given names.
  "vietnamese|given.feminine|thuy",
]);

describe("name bank spellings", () => {
  it("carries no diacritic-stripped twin of a real entry", () => {
    const collisions = foldCollisions(NAME_BANKS).filter(
      (collision) => !ALLOWED_FOLD_COLLISIONS.has(`${collision.culture}|${collision.list}|${fold(collision.entries[0]!)}`),
    );
    expect(collisions, JSON.stringify(collisions, null, 2)).toEqual([]);
  });

  // Proves the detector on a bank the test builds by hand, so a change that
  // stops `foldCollisions` from catching a stripped twin fails here first
  // rather than silently going quiet on the real data.
  it("catches a stripped twin planted in a fixture bank", () => {
    const plantedBank: Record<string, NameBank> = {
      fixture: {
        groups: [
          {
            given: {
              masculine: ["Nam", "Lap", "Lập", "Duc"],
              feminine: ["Lan", "Mai"],
              neutral: ["An"],
            },
            surname: ["Nguyen", "Tran"],
            weight: 1,
          },
        ],
      },
    };
    const collisions = foldCollisions(plantedBank);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toMatchObject({ culture: "fixture", groupIndex: 0, list: "given.masculine" });
    expect([...collisions[0]!.entries].sort()).toEqual(["Lap", "Lập"]);
  });
});
