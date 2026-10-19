import type { ConsequenceDef } from "../../consequence.js";

// Military aftermath is logistics and procedure: the sortie rate, the apron
// that was not ready, the taxiway rated for less than what landed on it. The
// restraint register holds throughout — the camera is on the crews and the
// paperwork, never on the wound — and a success is priced in what holding it a
// second month would take.

export const MILITARY_CONSEQUENCES: readonly ConsequenceDef[] = [
  {
    id: "cq-military-low-success-past-the-written-off-point",
    instrument: "military",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The exercise runs the full ten days and the sortie rate holds past the point the planners had written off. {{target}}'s watch officers log every launch, which is the message, and the fuel is drawn from a reserve nobody wanted to open.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: 0.04 } },
      { kind: "metric", deltas: { treasury: -3000 } },
    ],
  },
  {
    id: "cq-military-low-success-the-coastal-watch-moves-back",
    instrument: "military",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The squadron is forward by Friday, inside the window, and the host ground crews turn it around faster than {{actor}}'s own do. {{target}} moves its coastal watch back sixty miles without announcing that it has.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: 0.05 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { militaryThreat: 0.04 } },
    ],
  },
  {
    id: "cq-military-low-partial-two-clocks-and-a-liaison-cell",
    instrument: "military",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The exercise runs and the joint communications never come up: two networks, two clocks, and a liaison cell that spends the week translating between them by hand. Everything demonstrated was demonstrated separately.",
    ],
    effects: [{ kind: "metric", deltas: { militaryReadiness: -0.03, treasury: -2500 } }],
  },
  {
    id: "cq-military-low-partial-forward-and-visible",
    instrument: "military",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The deployment arrives and the apron does not: no shelter, no hardened fuel, and a taxiway rated for less than what landed on it. The aircraft are forward and visible, which cuts both ways and was meant to cut one.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.02, treasury: -4000, stability: -0.02 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { militaryThreat: 0.03 } },
    ],
  },
  {
    id: "cq-military-low-failure-a-tow-tractor-takes-a-wing",
    instrument: "military",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "A tow tractor takes a wing on the second night and the exercise ends four days early. Nobody is hurt, and the footage of crews standing around a stopped airframe is what {{target}} shows its own chamber that week.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.07, standing: -0.05, treasury: -5000 } },
      { kind: "feed", headline: "The exercise ends four days early with a stopped airframe on the apron" },
    ],
  },
  {
    id: "cq-military-low-failure-the-manifest-on-the-wrong-desk",
    instrument: "military",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "The move reads as a rotation until a manifest reaches the wrong desk, and then it reads as a buildup. {{target}} deploys to match inside seventy-two hours, and the window {{actor}} had been holding open closes.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.04, standing: -0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { militaryThreat: 0.08, tension: 0.06 } },
    ],
    sets: ["the-manifest-on-the-wrong-desk"],
  },
  {
    id: "cq-military-mid-success-hulls-we-do-not-have",
    instrument: "military",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The cordon closes at first light and the first three masters heave to without being asked twice. It holds for a month. Holding it a second month would take hulls {{actor}} does not have in that ocean.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.04 } },
      { kind: "metric", deltas: { militaryReadiness: -0.02, treasury: -2000 } },
    ],
    sets: ["hulls-we-do-not-have"],
  },
  {
    id: "cq-military-mid-success-the-underwriters-withdraw",
    instrument: "military",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "Boarding parties work the queue at four vessels a day and the paperwork is immaculate, which is what makes it stick when it is challenged. The underwriters withdraw cover for the route by the end of the second week.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.05 } },
      { kind: "feed", headline: "Underwriters pull cover for the route, and the queue outside {{target}}'s port grows" },
    ],
  },
  {
    id: "cq-military-mid-partial-where-the-cover-expires",
    instrument: "military",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "The cordon holds for the shipping that declares itself and not for the shipping that does not. Two hulls a night run the gap at the northern end, where the cover expires an hour before the moon does.",
    ],
    effects: [{ kind: "metric", deltas: { militaryReadiness: -0.04, standing: -0.04, treasury: -3000 } }],
  },
  {
    id: "cq-military-mid-partial-the-picture-outlives-the-apology",
    instrument: "military",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "A neutral hull is stopped, searched, and released with an apology inside six hours. The procedure was correct at every step, and a photograph of a boarding party standing on a grain deck is the only part that travels.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.06, stability: -0.02 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.03 } },
      { kind: "feed", headline: "A grain ship is boarded and released, and the photograph outlives the apology" },
    ],
  },
  {
    id: "cq-military-mid-failure-the-flag-we-will-not-stop",
    instrument: "military",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "The line is run in daylight by a hull under a flag {{actor}} will not stop, and the whole cordon is revealed as a rule about whom {{actor}} is willing to embarrass. Every master in the queue works that out the same afternoon.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.1, militaryReadiness: -0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.06, trust: -0.04 } },
    ],
  },
  {
    id: "cq-military-mid-failure-the-sailor-between-the-hulls",
    instrument: "military",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "A boarding goes wrong in a swell and a sailor from the party goes into the water between the two hulls. The inquiry will find no fault and will take a year, and the family will learn the name of the operation before then.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.08, stability: -0.07, militaryReadiness: -0.05 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.04 } },
    ],
    sets: ["the-sailor-between-the-hulls"],
    remembered:
      "{{actor}}'s own sailor went into the water alongside our hull, and their inquiry took a year to say nothing.",
  },
  {
    id: "cq-military-high-success-the-next-one-goes-underground",
    instrument: "military",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "The package is in and out inside eleven minutes and every aim point is serviced. The assessment is clean and the crews are home.",
      "What {{target}} builds in its place will be underground, and it will not be findable a second time.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: 0.03, standing: 0.03 } },
      { kind: "metric", deltas: { treasury: -3000 } },
    ],
    sets: ["the-next-one-goes-underground"],
  },
  {
    id: "cq-military-high-success-a-contract-with-no-end-date",
    instrument: "military",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "The lodgment holds and the port is working by the fourth day, ahead of the plan. What is not ahead of the plan is the civil side: the water is trucked, the trucking is contracted, and the contract has no end date written into it.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.04 } },
      { kind: "metric", deltas: { treasury: -3000 } },
    ],
    sets: ["a-contract-with-no-end-date"],
  },
  {
    id: "cq-military-high-partial-a-caveat-somebody-signed",
    instrument: "military",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "Two of the four aim points are serviced and the third is struck late, after the vehicles that were the reason for it had already moved. The fourth is not struck at all, and the reason sits in a caveat somebody signed.",
    ],
    effects: [{ kind: "metric", deltas: { militaryReadiness: -0.05, standing: -0.04, treasury: -4000 } }],
  },
  {
    id: "cq-military-high-partial-no-month-named-as-the-last",
    instrument: "military",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "The advance reaches the river and stops there, which was the objective, and holds a line twice as long as the one that was planned for. Rotation now costs more every month than the advance did, with no month named as the last.",
    ],
    effects: [{ kind: "metric", deltas: { militaryReadiness: -0.06, treasury: -5500, stability: -0.02 } }],
  },
  {
    id: "cq-military-high-failure-the-second-decision-of-the-night",
    instrument: "military",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "The package is engaged on egress and an aircrew goes down inside {{target}}'s territory, alive. The recovery attempt is the second decision of the night, and there is no version of it that is not worse than the first.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.12, militaryReadiness: -0.08, stability: -0.06 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.1 } },
      { kind: "grudge", cause: "the crew taken on egress", weight: 0.6 },
      { kind: "feed", headline: "An aircrew is down inside {{target}} and the recovery is the second decision of the night" },
    ],
  },
  {
    id: "cq-military-high-failure-the-second-wave-turned-around",
    instrument: "military",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "The landing is opposed where the assessment said it would not be, and the beach is held for nine hours at a price that will be argued over for a generation. The second wave is turned around at sea, which is its own kind of order to give.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.15, militaryReadiness: -0.12, stability: -0.09, treasury: -14000 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.12, trust: -0.1 } },
      { kind: "grudge", cause: "the opposed landing", weight: 0.8 },
    ],
    sets: ["the-beach-and-the-second-wave"],
    remembered:
      "{{actor}} came ashore where its own assessment swore we would not be, and turned its second wave around at sea.",
  },
];
