import type { ConsequenceDef } from "../../consequence.js";

// Economic aftermath is procedure: the hour a notice posts, the shift the
// customs hall works, the interval between a drafting and a signature that a
// registered company can be dissolved inside. Money is moved by clerks, and
// the clerks are where the writing lives.

export const ECONOMIC_CONSEQUENCES: readonly ConsequenceDef[] = [
  {
    id: "cq-economic-low-success-before-the-desks-open",
    instrument: "economic",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The advisory posts at six in the morning and the first three carriers reroute before the shipping desks open. {{target}}'s exporters spend the day on hold to an office that has not yet been told what to say.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: 1500, standing: 0.02 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.02 } },
    ],
  },
  {
    id: "cq-economic-low-success-ninety-minutes-at-the-crossing",
    instrument: "economic",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The schedule is published on a Tuesday and the customs halls at both land crossings hold the queue at ninety minutes, which is what the planning assumed. The revenue lands in the account before the complaint does.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: 2500 } },
      // Working is not the same as being forgiven: the desks on the other side
      // remember which government made their week longer.
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: -0.05 } },
    ],
  },
  {
    id: "cq-economic-low-partial-waiting-on-the-underwriters",
    instrument: "economic",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "Half the carriers reroute and half wait on the underwriters, who take eleven days. By the time the insurance market moves, {{target}} has found a transshipment port that adds a week to the run and forgives everything.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -1000, standing: -0.02 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tradeDependence: -0.04 } },
    ],
  },
  {
    id: "cq-economic-low-partial-the-exemption-for-medicine",
    instrument: "economic",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The schedule takes hold at the docks and not at the air freight terminal, where an exemption written for medicine is being used for anything that fits on a pallet. The office that would close it is the office that wrote it.",
    ],
    effects: [{ kind: "metric", deltas: { treasury: 800, stability: -0.04 } }],
    sets: ["exemption-left-open"],
  },
  {
    id: "cq-economic-low-failure-the-corridor-we-use-more",
    instrument: "economic",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "The advisory names a corridor {{actor}}'s own shippers use more heavily than {{target}}'s do. Two of them stop loading at noon, and every freight forwarder who loses the week is on {{actor}}'s side of the water.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -4000, stability: -0.03 } },
      { kind: "feed", headline: "A trade advisory aimed at {{target}} costs {{actor}}'s own carriers the week" },
    ],
  },
  {
    id: "cq-economic-low-failure-already-alongside",
    instrument: "economic",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "The measure is announced before the harbor schedule is checked, so the first vessels it applies to are already alongside and already discharged. The refund process takes four months and is reported in every one of them.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -3000, standing: -0.05, stability: -0.02 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.03 } },
    ],
  },
  {
    id: "cq-economic-mid-success-frozen-by-ten",
    instrument: "economic",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The designations land at nine and the correspondent banks freeze by ten, faster than the lawyers had promised. {{target}}'s two named firms have lawyers at the company registry the same day, filing for new letterhead, and a compliance officer at one of the banks says the weeks that filing will take are the point.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.03 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { tension: 0.04 } },
    ],
  },
  {
    id: "cq-economic-mid-success-the-agent-stops-answering",
    instrument: "economic",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The list is short and every name on it belongs to a procurement officer rather than a politician, which is why it bites. The afternoon the list is published, {{target}}'s shipping agent stops returning calls, and cargo that had a schedule no longer has one.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.02 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.03 } },
      { kind: "feed", headline: "{{target}} misses a procurement schedule for the first time this year" },
    ],
  },
  {
    id: "cq-economic-mid-partial-dissolved-in-the-interval",
    instrument: "economic",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "The freeze catches the accounts and misses the trading company, which was dissolved and re-registered in the interval between the drafting and the signature. Nobody in the chain is at fault. The interval was six weeks long.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -2000, standing: -0.04 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.04 } },
    ],
  },
  {
    id: "cq-economic-mid-partial-the-terminal-that-feeds-the-wards",
    instrument: "economic",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "The designations hold, and so does the carve-out for the fuel terminal, because the terminal supplies a hospital network {{actor}}'s own lawyers will not put at risk. {{target}} moves what it needs through the carve-out and says nothing.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tradeDependence: -0.05 } },
    ],
    sets: ["fuel-exemption-standing"],
  },
  {
    id: "cq-economic-mid-failure-a-clearing-bank-reads-it-broadly",
    instrument: "economic",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "A clearing bank with no part in any of this reads the notice broadly and stops settling anything in the region for four days. The complaints arrive from three friendly capitals before they arrive from {{target}}.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -7000, standing: -0.07 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.05 } },
      { kind: "grudge", cause: "the settlement freeze", weight: 0.3 },
    ],
  },
  {
    id: "cq-economic-mid-failure-one-business-day",
    instrument: "economic",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "The names leak the night before, which gives {{target}}'s firms one business day, and one business day is enough. The accounts are empty by the time the freeze is lawful, and the leak came from inside the drafting room.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -5000, stability: -0.05, standing: -0.04 } },
      { kind: "feed", headline: "The names were out the night before, and the accounts were emptied by morning" },
    ],
    sets: ["leak-in-the-drafting-room"],
  },
  {
    id: "cq-economic-high-success-closed-on-a-sunday",
    instrument: "economic",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "It closes on a Sunday so the insurance market has the weekend to price it, and it holds. {{target}}'s refinery runs down over eleven days exactly as the planners drew it, and {{actor}}'s southern ports lose the traffic they were warned they would lose.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.05, treasury: -3000 } },
      { kind: "feed", headline: "The measures against {{target}} hold through the weekend, and the southern ports are quiet" },
    ],
    sets: ["the-ports-paid-for-it"],
  },
  {
    id: "cq-economic-high-success-between-shifts",
    instrument: "economic",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "Every named account is frozen inside the hour, and the hour was chosen: it is when {{target}}'s money desk changes shift. What nobody says at the briefing is that the technique now exists, written down, and works in both directions.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.04 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.05 } },
    ],
    sets: ["froze-between-shifts"],
  },
  {
    id: "cq-economic-high-partial-small-and-steady-overland",
    instrument: "economic",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "It holds at sea and leaks overland, across two crossings run by people who have not been paid by anybody in a year. The volume is small and steady, and small and steady is precisely what {{target}} can plan around.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -3000, standing: -0.05 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tradeDependence: -0.06 } },
    ],
  },
  {
    id: "cq-economic-high-partial-a-warehouse-beyond-the-writ",
    instrument: "economic",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "The freeze catches most of it. The rest was moved into commodities during the week the drafting took, and commodities sit in a warehouse that {{actor}} has no writ over and a government on friendly terms with it does.",
    ],
    effects: [{ kind: "metric", deltas: { treasury: -2000, standing: -0.04, stability: -0.02 } }],
    sets: ["warehouse-beyond-the-writ"],
  },
  {
    id: "cq-economic-high-failure-the-queue-on-the-ring-road",
    instrument: "economic",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "It is announced, and the price of everything {{actor}} buys abroad moves before a single hull is stopped. Two weeks in, the shortage is at home: a fuel queue at the depot on the ring road, filmed by everyone standing in it.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -12000, stability: -0.09, standing: -0.06 } },
      { kind: "feed", headline: "The queue on the ring road is longer than the one the measures were meant to cause" },
    ],
  },
  {
    id: "cq-economic-high-failure-a-nominee-address",
    instrument: "economic",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "The freeze lands on the wrong holder: a pension fund at a nominee address with no part in any of it. The correction takes six days, and the apology takes a signature nobody wants to be the one to put on it.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.1, stability: -0.05, treasury: -4000 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.04 } },
    ],
    remembered:
      "{{actor}} froze a pension fund by mistake and needed six days to find someone willing to say so out loud.",
  },
];
