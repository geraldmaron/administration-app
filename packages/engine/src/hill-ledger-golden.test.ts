import { createHash } from "node:crypto";
// A test-only read of the checked-in capture, so the digest-free comparison can run on any Node version; nothing the engine ships reads a file.
// eslint-disable-next-line no-restricted-imports
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { playCampaign } from "./balance-harness.js";
import { chamberDisposition, HILL_POSTS } from "./hill.js";
import { issueLobbying } from "./lobbying.js";
import { majorityOf, supermajorityOf } from "./congress.js";
import { voteOn } from "./congress-votes.js";
import { computeRemovalPressure } from "./removal.js";
import { figureRapport, openFavorsOwedByPresident } from "./ties.js";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import type { Campaign, Chamber, LobbyApproach } from "./state.js";
import type { EffectPacket } from "./effects.js";

// The Hill's arithmetic, pinned. The capture was first taken before a member's
// warmth moved from the figure to the person, and the move matched it exactly.
// It was re-taken once, deliberately, when a public appeal began to be refused
// in a state that leans against the administration and a cross-party deal
// began to cost the President's own leaders; nothing else moved. It was
// re-taken a second time when the committed source, run at the pin's own
// commit, reproduced every Hill reading but not the whole-campaign digest,
// so the earlier digest came from a tree that was never committed. It was
// re-taken a third time when a blockade became an act of war with a standing
// record and every sourced strait began to reach the world price: nations now
// carry their chokepoint weights, which moves the whole-campaign digest from
// the first week, and the world's prices moved removal pressure by under five
// millionths on two runs; no vote, chamber reading or room moved. It was
// re-taken a fourth time when a war came to charge the forces sent rather than
// the whole establishment, its dead to leave the population, and reach to be
// measured from bases and treaty allies: every carried war's losses and every
// fighting population move the digest from the first week, and the reckless
// run lands acts it could not reach before, so its approval, and that of the
// ledger-2 and ledger-3 runs from week 13, moved the readings the Hill reads.
// No code that counts votes, reads chambers or prices removal changed. It was
// re-taken a fifth time when every Senate-confirmed seat came to be filled
// from one appointment pool: the proxy now sends up the pool's first name
// rather than the most competent free person anywhere, and a nominee's record
// is read by each senator instead of being clipped off the room's ceiling,
// which moves the founding's confirmations and the digest from the first week,
// re-pins the two cabinet normalizers measured over founded cabinets
// (`GAP_WIDE`, `OPPOSED_SHARE_CENTER`), and, through who runs each office,
// moves approval and removal pressure after it. That capture was taken
// together with a sixth cause: weekly-phase incidents began to open on the
// week's closing day, so they land on the office-day cut where they land on
// the one-shot week, which moves the digest from the first week and approval
// from the sixth. Captured commit by commit, the pacing fix and the pool each
// moved the room, the chambers, the leaders' rapport, the probes and the bill
// votes only in or after the week the digest and approval had already moved;
// the one count that changed, a nominee's record read per senator, is carried
// only by confirmation questions, which no probe or bill asks.
// The plain probes of week two did not move. It was re-taken a seventh time
// when acts of force against a declared arsenal with delivery came to be
// refused, a failed exercise or forward deployment stopped offering a hit-back,
// crude's kernel was refitted to the 2026 shut-ins, a war stopped drawing the
// President's authority beside the deployment that pays for it, held fronts
// came to lose at the Korean static line's rate and other governments' acts of
// force came to be rationed: the digest moves from week two or three, removal
// pressure from week six to eleven by under three ten-thousandths, and in the
// reckless run the room, the chambers, the leaders' rapport and the bill votes
// moved from week 23, after removal pressure already had. No code that counts
// votes, reads chambers or prices removal changed. It was re-taken an eighth
// time when the headline came to be the sum of five partisan blocs, polarization
// a stock, the war rally an impulse on the record and a removal caucus to read
// the President's own identifiers, with regime operations and the scenario cost
// model merged beside them: approval and the digest move from the oath, and the
// removal counts move by design, because who breaks on a grave charge now reads
// the President's own voters. Any other change to how votes are counted,
// chambers read or removal priced fails here. It was re-taken a ninth time
// when covert rungs 2 to 5 began to refuse the President's own government
// without a standing finding: the reckless run lands fewer acts, so its
// approval, and the readings the Hill reads from it, move. No code that counts
// votes, reads chambers or prices removal changed. It was re-taken a tenth
// time for the world-dynamics program's first wave, captured merge by merge.
// Attention on change, signed growth, dated scandals and the authority clocks
// moved nothing here, the digest included. Sanctions came to reach by scope and
// flow, receipts to follow delivered volume and inherited programs to be dated
// from their texts: the digest moves from the first week, removal pressure from
// the second by under five ten-thousandths in three runs, and in the reckless
// run the same acts lifted crude to 1.23 of reference where they had lifted it
// to 1.49, so prosperity, approval and every Hill reading move from week 11 and
// one bill is introduced in place of another. Relationship memory came to age
// by the calendar, with trust and tension settling toward each pair's standing
// reading: the room, the chambers and the leaders' rapport move by at most
// 0.007 from week 6 to 26 and a few bills' yeas by one to three. Standing Hill
// ties and saturating routine contact moved only the digest. No code that
// counts votes, reads chambers or prices removal changed. It was re-taken an
// eleventh time for the program's second wave, again merge by merge. Trade
// partners came to be listed by magnitude, relief to need a need and a lifted
// tariff to unwind: the digest moves from the first week and removal pressure
// and the room by at most 0.005, with a few bills' yeas by one to three.
// Commission removal law moved only one run's digest. Salience came to speed
// revision only the way a story pushes and serial wars to rally less: the
// room by at most 0.007 from week 5 and removal by at most 0.0075. Third
// parties came to react by their own ties: the digest. Members of Congress
// came to die and be replaced: the probes move from the week of the first
// death and the room by at most 0.006. The background docket's June rulings
// were at first read as rulings against the President (fixed at integration,
// so they move nothing here). Coerced governments came to answer: the room by
// at most 0.052 in the passive run from week 17. At integration, an empty
// seat stopped counting as a nay (a count reads the seated members), founding
// actings came to run 300 days and a partner's answer to be read off the flow
// it cuts: the digest from the first week, one run's removal pressure by under
// seven ten-thousandths, and the recorded nays where a seat stood empty.
// It was re-taken a twelfth time for the program's third wave, again merge by
// merge, on a clean build of world and engine. The pin it replaced already sat
// apart from the second wave's repairs (the room, chambers and rapport by at
// most 0.006, removal pressure by at most 0.0041), so the attribution starts
// from the repaired source's own capture. Acting clocks, the court case and
// its screens, House specials and successors, the midterm swing and the
// offshore navy moved nothing the Hill reads. Trade ties and ripple exposure
// reading lane size moved removal pressure by at most 0.0046 from week 3 in
// every run, and in the prudent republican run the room, chambers and rapport
// by at most 0.007 from week 19. The Council's Article 27 vote moved that
// run's room by at most 0.004 from week 19. Clashes in episodes and the
// settling bloc pressure moved the room, chambers and rapport by at most 0.006
// from week 5 in three runs, and a few bills' yeas by one to two from week 13.
// Sourced home hazards and the third family of home events moved every reading
// in every run: removal pressure from week 1 by up to 0.028, the room and
// chambers from week 2 by up to 0.028, rapport by up to 0.089, and from week
// 10 bills' yeas and recorded nays by up to 42, with different bills
// introduced and one outcome flipped from week 13. No code that counts votes,
// reads chambers or prices removal changed in the other merges.
// It was re-taken a thirteenth time for the repairs the review of the third
// wave asked for, attributed by applying each repair group alone to the
// integrated tree. A foreign cyber crew came to lower the counterintelligence
// of the country it breaks into, not its host's: that alone moved removal
// pressure by at most 0.010 from week 8 in three runs, and in the two later
// runs the room, chambers and rapport by at most 0.032 and a few probes' yeas
// by one to two from week 19, with bills' yeas and recorded nays by at most 2
// from week 23. The acting-officer clock moved only the digest, from week 6;
// the double-successor guard, the Council's party abstention, the notice reset
// and the onset split moved nothing.
// Every week also carries a digest of the whole campaign with the ledger's
// fields set aside, so a divergence anywhere else in the state shows up too.
// The digest is pinned on the repository's Node 22 runtime (.nvmrc). Node 24
// and 25 change the final bits of foreign fiscal projections: the Hill
// readings reproduce exactly across those runtimes, but the whole-state hashes
// differ. So the readings are checked on every runtime, and the hashes only on
// the pinned one, where a skip names the runtime to use instead of a mismatch
// that reads as a regression.
const PINNED_NODE_MAJOR = 22;
const onPinnedRuntime = Number(process.versions.node.split(".")[0]) === PINNED_NODE_MAJOR;
const SNAPSHOT = "./__fixtures__/hill-ledger-golden.json";

const WEEKS = 30;
const RUNS = [
  { seed: "ledger-0", proxy: "prudent", party: "democrat" },
  { seed: "ledger-1", proxy: "reckless", party: "republican" },
  { seed: "ledger-2", proxy: "passive", party: "democrat" },
  { seed: "ledger-3", proxy: "prudent", party: "republican" },
] as const;
const APPROACHES: readonly LobbyApproach[] = ["call", "public"];
const CHAMBERS: readonly Chamber[] = ["house", "senate"];
const charter = CHARTER_USA_CONSTITUTION;

/**
 * Offers a budget negotiation to the first member who can take one each week,
 * so promises open and settle, and otherwise works one member every other week,
 * rotating the posts and the plays.
 */
function lobbyEachWeek(state: Campaign, step: number): readonly EffectPacket[] {
  for (const post of HILL_POSTS) {
    const trade = issueLobbying(state, post.id, "trade");
    if (trade.ok) return [trade.packet];
  }
  if (step % 2 !== 0) return [];
  const post = HILL_POSTS[(step / 2) % HILL_POSTS.length]!.id;
  const issued = issueLobbying(state, post, APPROACHES[(step / 2) % APPROACHES.length]!);
  if (issued.ok) return [issued.packet];
  const call = issueLobbying(state, post, "call");
  return call.ok ? [call.packet] : [];
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
  );
}

/** The campaign with the ledger set aside: whatever else differs, differs for some other reason. */
function digest(state: Campaign): string {
  const people = Object.fromEntries(
    Object.entries(state.people).map(([id, runtime]) => {
      const { tie: _tie, ...rest } = runtime as typeof runtime & { tie?: unknown };
      return [id, rest];
    }),
  );
  const { promises: _promises, ...congress } = state.congress as typeof state.congress & { promises?: unknown };
  const leadership = state.congress.leadership.map((figure) => {
    const { disposition: _d, ...rest } = figure as typeof figure & { disposition?: unknown };
    return rest;
  });
  const stripped = { ...state, people, congress: { ...congress, leadership } };
  return createHash("sha256").update(JSON.stringify(canonical(stripped))).digest("hex").slice(0, 16);
}

function probes(state: Campaign) {
  return CHAMBERS.map((chamber) => {
    const seats = state.congress.chambers[chamber].seats;
    const plain = voteOn(state, { chamber, appeal: 0, required: majorityOf(seats), stance: "neutral" });
    const against = voteOn(state, {
      chamber,
      appeal: 0.2,
      required: supermajorityOf(seats),
      stance: "neutral",
      counted: "against",
    });
    return { chamber, plain: plain.byCaucus, against: against.byCaucus };
  });
}

function week(state: Campaign) {
  return {
    turn: state.turn,
    room: state.congress.disposition,
    chamber: Object.fromEntries(CHAMBERS.map((c) => [c, chamberDisposition(state.congress, c, state.states, state.people)])),
    removal: computeRemovalPressure(state, charter),
    figures: state.congress.leadership.map((figure) => `${figure.post}|${figure.person}|${figureRapport(state.people, figure)}`),
    lobbying: state.congress.lobbying.map((record) => `${record.id}|${record.approach}|${record.landed}`),
    promises: openFavorsOwedByPresident(state).map((favor) => `${favor.id}|${favor.billId}|${favor.reservedTreasury}`),
    settled: settledPromises(state),
    votes: Object.values(state.bills).map((bill) => ({ id: bill.id, passage: bill.passage, override: bill.override })),
    probes: probes(state),
    digest: digest(state),
  };
}

function settledPromises(state: Campaign): readonly string[] {
  return Object.values(state.people)
    .flatMap((runtime) => runtime.tie?.favors ?? [])
    .filter((favor) => favor.status !== "open")
    .map((favor) => `${favor.id}|${favor.status}|${favor.settledTurn}`)
    .sort();
}

let captured: ReturnType<typeof runAll> | undefined;

function capture() {
  captured ??= runAll();
  return captured;
}

function runAll() {
  return RUNS.map((run) => {
    const weeks: ReturnType<typeof week>[] = [];
    playCampaign(run.seed, run.proxy, WEEKS, run.party, {}, {
      decide: lobbyEachWeek,
      observeWeek: (state) => weeks.push(week(state)),
    });
    return { ...run, weeks };
  });
}

function withoutDigests(runs: unknown): unknown {
  return JSON.parse(JSON.stringify(runs), (key, value: unknown) => (key === "digest" ? undefined : value));
}

describe("the Hill's arithmetic under the relationship ledger", () => {
  it("counts, reads and prices every week as the pinned capture", () => {
    const pinned: unknown = JSON.parse(readFileSync(new URL(SNAPSHOT, import.meta.url), "utf8"));
    expect(withoutDigests(capture())).toEqual(withoutDigests(pinned));
  }, 600_000);

  it.runIf(onPinnedRuntime)(`leaves the rest of the campaign as the pinned capture (Node ${PINNED_NODE_MAJOR} only, per .nvmrc)`, async () => {
    // The capture is checked in, so a mismatch fails here and is never rewritten without `-u`.
    await expect(`${JSON.stringify(capture())}\n`).toMatchFileSnapshot(SNAPSHOT);
  }, 600_000);
});
