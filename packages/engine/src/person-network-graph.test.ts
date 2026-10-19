import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { buildPersonNetwork } from "./person-network.js";

/**
 * Re-pinned 2026-09-24: the vietnamese and lusophone banks each carried a
 * diacritic-stripped twin of a real entry (e.g. "Lap" beside "Lập"), so a
 * quarter of their draws came out misspelled and doubled the correctly
 * marked entry's weight. Removing the 142 stripped twins reindexes both
 * banks, so every VNM, AGO, BRA, GNB, MOZ, PRT and STP name in the cast
 * shifted — 67 of 6,865 people. The cast and edge counts are the same; no
 * rule in `person-network-rules.ts` moved.
 *
 * The graph over a real cast, pinned.
 *
 * `buildPersonNetwork` walks its rules in score bands and only enumerates
 * pairs whose ends still have a seat open, which is an argument about what the
 * seating could have taken rather than a rule anyone can read off the output.
 * So the output is pinned. A change to the rules, the scores or the caps is
 * supposed to break this test — and then the new digests are recorded here
 * deliberately, with the content change that earned them, instead of arriving
 * as a silent redraw of everyone's social circle.
 *
 * Re-pinned 2026-09-23, second time: every foreign government now draws
 * against the leader table. The lead chair's presentation, the incumbent's age
 * and the lead bench's party are the table's; a ministry is held by a
 * governing party and the opposition leader by one that does not govern;
 * cabinets draw women at their recorded share; women's surnames take their
 * language's feminine form; Iceland names people for a parent; and five
 * countries sharing a bank draw from their own tradition of it. Ages, parties
 * and names are what the rules read, so the edges moved; the cast did not (the
 * same 6,865 to 6,868), and no rule in `person-network-rules.ts` moved.
 *
 * Re-pinned 2026-09-23: the United States now draws its bench from six
 * Census and SSA name groups with seat- and party-scoped sex and heritage, and
 * each major party's floor appends members past a bench's depth. The floor
 * members' keys depend on the seed, so the cast now differs by seed (6,865 to
 * 6,868) and each seed pins its own. No rule in `person-network-rules.ts`
 * moved.
 *
 * Re-pinned 2026-09-22, third time: Bhutan, Cambodia, Laos, Mongolia and Niger
 * stopped borrowing a neighbor's names and draw from banks of their own, so
 * the names in their benches, and the reasons that quote them, changed. The
 * cast and the edge counts are the same; no rule moved.
 *
 * Re-pinned 2026-09-22, second time: 59 of the thin countries were researched
 * and promoted to standard fidelity, which seats three people per chair rather
 * than one, so the cast grew by 1,770 to 6,856 and the graph from about 13,260
 * edges to about 18,600. No rule in `person-network-rules.ts` moved.
 *
 * Re-pinned 2026-09-22: the roster went from 61 governments to all 196, and
 * the 135 added at thin fidelity each seat one person per chair (15 chairs),
 * so the cast grew by 2,025 to 5,086 and the graph from about 8,550 edges to
 * about 13,260. No rule in `person-network-rules.ts` moved: the graph is
 * larger because the cast is.
 *
 * Re-pinned 2026-09-08, second time the same day: the world cast fell from
 * 5,401 people to 3,061, because thirteen American seats stopped being staffed
 * in sixty foreign capitals. No other charter seats an attorney general, a
 * congressional leader, a Senate committee chair or any of the ten department
 * secretaries, so every one of those benches abroad held three people who could
 * never take the chair they were drawn for — and whose career prose, written
 * for an American office, ran through a state department of agriculture or a
 * federal consent decree. The graph is smaller because the cast is honest, not
 * because a rule changed: no rule in `person-network-rules.ts` moved.
 *
 * Re-pinned 2026-09-23, same casts and same edge counts: only names moved. The
 * draw began refusing every name on a roster of people in office and the rare
 * family names of each country's own leaders, split the banks several peoples
 * shared, wrote names in their tradition's order and named monarchs for their
 * houses; the graph's reasons carry names, so its digest moved with them.
 *
 * Re-pinned 2026-09-08: the rules stopped testing for collisions and started
 * reading shared history. The graph they replace was 88% one edge kind
 * carrying one sentence — a shared alma mater plus a ten-year age gap, read as
 * mentorship "there", when a ten-year gap is precisely what makes a shared
 * campus impossible. Nothing gated on nationality, so 228 edges joined people
 * from different countries; nothing gated on time, so 39 of 169 career ties
 * joined two people whose shared world never overlapped in a single year; and
 * the degree histogram was `{6: 5401}`, because a floor pass seated edges until
 * everyone had the maximum. Every rule now needs a real overlap in real time in
 * the same country, the floor is gone, and mentorship carries a quota of its
 * own. Measured across the three seeds: 9 distinct reason strings became
 * 14,115, cross-border ties fell to the 30 that are supposed to cross a border,
 * and degrees run from 0 to 6 instead of standing at 6.
 *
 * Re-pinned 2026-09-07: the player's own leader now carries the education and
 * career their chosen life implies, so the President is a person the network
 * can draw ties to instead of the one figure in the cast with no biography.
 *
 * Re-pinned 2026-09-27: the cast grew by sixteen. The fifty governor-eligible
 * members were exactly the fifty statehouses, so the bench was empty the moment
 * founding seated them, and a gubernatorial election with nobody to seat cannot
 * change a seat's party — which is the whole of what a gubernatorial election
 * does. A per-party bench is now appended past the fifty. The graph is re-pinned
 * to the deeper cast rather than the bound being loosened: the counts are exact
 * and the digest still fixes every edge.
 *
 * The unit rules live in `person-network.test.ts`; this file is the whole-cast
 * check that file cannot be.
 */
// The actual congressional roster and electoral reserve add 1,170 people.
// Removing only those identities restores all three prior counts and digests;
// original biographies and graph rules remain unchanged.
const GRAPH_DIGESTS: Readonly<Record<string, { readonly cast: number; readonly edges: number; readonly sha256: string }>> = {
  "golden-alpha": {
    cast: 8051,
    edges: 22219,
    sha256: "bca83ab048256f480fd4908cff7613a3f9d41e4d355c3266bf45b92ec53806dd",
  },
  "golden-beta": {
    cast: 8052,
    edges: 22201,
    sha256: "88e33bb3599853fe0e6db93d706f45c6052deb3144748934cd794cf530b09c67",
  },
  "disposition-sweep-2026-09-04": {
    cast: 8054,
    edges: 22221,
    sha256: "b71b7851d0a2612ff38f2d9f2a7de67951290312a3dcfd47f3e02fa8c63c15a6",
  },
};

/**
 * The cast a full founding under the seed actually produces, about 6,866
 * people. The rules only read authored biography, so the graph is drawn over
 * the whole founded cast.
 */
function foundedCast(seedText: string): readonly Parameters<typeof buildPersonNetwork>[0][number][] {
  const seed = makeCampaignSeed(seedText);
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((entry) => entry.playable)!;
  const charter = worldDataset.charters[0]!;
  const cradle = worldDataset.cradles.find((entry) => entry.startingNeighbors.length > 0)!;
  const cabinet = Object.fromEntries(
    Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [
      role,
      people[0]!.id,
    ]),
  );
  const choices: FoundingChoices = {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test President",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...defaultLeaderDraft(), name: "Test President" },
  };
  const campaign = sealFounding(seed, worldDataset, choices);
  return Object.values(campaign.people)
    .filter((runtime) => runtime.alive !== false)
    .map((runtime) => runtime.base);
}

describe("the person network over a founded cast", () => {
  for (const [seedText, expected] of Object.entries(GRAPH_DIGESTS)) {
    it(`draws the pinned graph under "${seedText}"`, () => {
      const cast = foundedCast(seedText);
      expect(cast.length).toBe(expected.cast);
      const network = buildPersonNetwork(cast, makeCampaignSeed(seedText));
      expect(network.length).toBe(expected.edges);
      expect(createHash("sha256").update(JSON.stringify(network)).digest("hex")).toBe(expected.sha256);
    });
  }

  /**
   * The band sweep exists because the full one cost ten seconds on this cast in
   * node and about seventy on a phone, which is a stall no surface can absorb.
   * It measures at ~165ms here. The budget is deliberately an order of
   * magnitude above that, so a loaded machine does not fail the suite — what it
   * catches is the cast growing past what the bands can collapse, which is the
   * failure that took a minute off the first dossier of every launch and was
   * invisible until the app ran on hardware.
   */
  it("builds the graph well inside the budget a surface can absorb", () => {
    const cast = foundedCast("disposition-sweep-2026-09-04");
    const seed = makeCampaignSeed("disposition-sweep-2026-09-04");
    const started = performance.now();
    buildPersonNetwork(cast, seed);
    expect(performance.now() - started).toBeLessThan(3_000);
  });
}, 600_000);
