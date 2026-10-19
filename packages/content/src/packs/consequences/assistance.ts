import type { ConsequenceDef } from "../../consequence.js";

// Aid aftermath is written as arrival and accounting: the flight that lands
// before dawn, the pallet that clears customs on the fourth day, the crate with
// a stencil still on it. Helping is the one act in the game whose success is
// somebody else's relief and whose failure is almost never a refusal — what
// goes wrong is theft, capture, or a promise called in on a week nobody chose.
//
// Bands map to what the ladder is here. Low is the shipment and the grant; mid
// is the money that stands behind a currency; high is weapons and the promise
// to come if called, where nothing is ever free and the room knows it.

export const ASSISTANCE_CONSEQUENCES: readonly ConsequenceDef[] = [
  {
    id: "cq-assistance-low-success-on-the-ground-before-dawn",
    instrument: "assistance",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The first flight is on the ground before dawn and the trucks are moving by noon. {{target}}'s own emergency office runs the handout and says so in public, which is the version of the week that travels.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -1200 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.04 } },
    ],
  },
  {
    id: "cq-assistance-low-success-signed-with-no-cameras",
    instrument: "assistance",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The grant is signed in a room with no cameras in it, at {{target}}'s asking, and the ministry that will spend it is the one that came for it rather than the one {{actor}} would have picked.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -2000 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.05, alignment: 0.02 } },
    ],
    sets: ["let-them-choose-the-ministry"],
  },
  {
    id: "cq-assistance-low-partial-a-fee-nobody-will-write-down",
    instrument: "assistance",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The pallets clear customs on the fourth day, after a fee nobody will put in writing, and a third of what was sent is a size the clinics cannot use. What arrives helps; what it cost to arrive is the part {{actor}} does not publish.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -2500, stability: -0.02 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.02 } },
    ],
  },
  {
    id: "cq-assistance-low-partial-announced-twice",
    instrument: "assistance",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The money lands and the program it pays for is announced twice: once by {{target}}'s ministry, and once, smaller, at home. The second announcement is the one the chamber reads, and it reads as generosity abroad in a hard year.",
    ],
    effects: [{ kind: "metric", deltas: { treasury: -1800, stability: -0.03 } }],
    remembered: "They fed our people and then let their own chamber be told it was a favor we owed for.",
  },
  {
    id: "cq-assistance-low-failure-full-out-light-in",
    instrument: "assistance",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "The trucks leave the port full and arrive light, and the paperwork for the difference is perfect. {{target}}'s customs service opens a file on itself and closes it inside the week.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -2600, standing: -0.04 } },
      { kind: "feed", headline: "Relief sent by {{actor}} arrives in {{target}} weighing a third less than it left" },
    ],
  },
  {
    id: "cq-assistance-low-failure-two-streets-from-where-it-was-meant",
    instrument: "assistance",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "What {{actor}} sent is for sale in a market two streets from where it was meant to be given away, still in its wrapping. A photograph of that reaches the chamber at home before any report does.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -2200, standing: -0.05 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { tension: 0.05, trust: -0.04 } },
    ],
    remembered: "We gave them what we had and watched it go on sale, and the picture outlived the shipment.",
  },
  {
    id: "cq-assistance-mid-success-the-currency-opens-flat",
    instrument: "assistance",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The line of credit is announced on a Sunday night and the currency opens flat instead of falling. {{target}}'s finance ministry thanks nobody in public and calls a deputy at home to do it properly.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -3000 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.06 } },
    ],
  },
  {
    id: "cq-assistance-mid-success-large-enough-nobody-tests-it",
    instrument: "assistance",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The package is large enough that nobody tries it, which is what the size was for. The traders who were betting against the currency quietly back away, and {{target}}'s central bank is buying its own currency again with money it did not have to ask for twice.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -2500, standing: 0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tradeDependence: 0.05, trust: 0.04 } },
    ],
  },
  {
    id: "cq-assistance-mid-partial-four-months-of-the-same-argument",
    instrument: "assistance",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "The money holds the currency and buys {{target}}'s government four months, which it spends having the same three arguments it was having before. Nothing underneath is fixed, and the Treasury can read that as clearly as they can.",
    ],
    effects: [{ kind: "metric", deltas: { treasury: -3500, stability: -0.02 } }],
    remembered: "They kept us solvent for a season and never once asked what we were going to do with it.",
  },
  {
    id: "cq-assistance-mid-partial-terms-of-surrender",
    instrument: "assistance",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "The conditions attached to the money are read out on the evening news by an opposition member who calls them terms of surrender. The money is taken anyway, and the resentment is taken with it.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -3000 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.06, trust: 0.02 } },
    ],
  },
  {
    id: "cq-assistance-mid-failure-owed-by-a-government-that-is-gone",
    instrument: "assistance",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "The money holds the currency through two trading sessions. Before the third opens, the ministers who signed for it are on a plane, and what {{actor}} stood behind is owed by a government that no longer exists.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -5000, standing: -0.05 } },
      { kind: "feed", headline: "The government {{actor}} stood behind in {{target}} falls with the rescue money still owed" },
    ],
  },
  {
    id: "cq-assistance-mid-failure-stops-at-the-last-account",
    instrument: "assistance",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "The support never reaches the central bank. It clears three accounts inside a week and stops at the last one, which belongs to nobody the ministry there is willing to name out loud.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -4500, standing: -0.06 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.08, tension: 0.05 } },
    ],
    remembered: "The rescue money went somewhere with a name nobody would say, and the country never saw a note of it.",
  },
  {
    id: "cq-assistance-high-success-the-training-team-stays",
    instrument: "assistance",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "The crates are opened in front of {{target}}'s own cameras, and the training team stays a month past the handover. What the neighbors take from the week is not the equipment; it is the month.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.03, treasury: -1500 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.08 } },
    ],
  },
  {
    id: "cq-assistance-high-success-signed-at-the-airfield",
    instrument: "assistance",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "The promise is signed at an airfield rather than in a palace, which is {{actor}}'s deputy making a point about where it would have to be kept. {{target}}'s chief of staff asks twice whether it means what it says.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.03, standing: 0.04 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { alignment: 0.08, trust: 0.05 } },
    ],
    sets: ["signed-it-at-the-airfield"],
  },
  {
    id: "cq-assistance-high-partial-under-tarpaulins-for-a-month",
    instrument: "assistance",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "The equipment arrives and half of it sits under tarpaulins for a month, because nobody sent the people who know how to run it. {{target}}'s army is stronger on paper and exactly as strong as it was in the field.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.05, treasury: -3500 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.03 } },
    ],
  },
  {
    id: "cq-assistance-high-partial-narrowed-by-lawyers",
    instrument: "assistance",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "The wording is what {{actor}}'s own lawyers spent a week narrowing, and {{target}} reads the narrow version out loud at the signing to be sure everyone hears which parts were left out of it.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.03, standing: -0.04 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.05 } },
    ],
    remembered: "They promised to come if we were attacked, in a sentence their lawyers had already emptied out.",
  },
  {
    id: "cq-assistance-high-failure-the-stencil-does-it",
    instrument: "assistance",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "The rifles turn up with a militia {{target}}'s government swears it does not pay, photographed beside crates still carrying their stencils. Nobody has to prove where they came from; the stencil does it.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.08, militaryReadiness: -0.03 } },
      { kind: "grudge", cause: "armed-the-people-who-shot-at-us", weight: 0.4 },
      { kind: "feed", headline: "Weapons {{actor}} handed {{target}} are photographed with a militia nobody will claim" },
    ],
  },
  {
    id: "cq-assistance-high-failure-called-in-eight-days-later",
    instrument: "assistance",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "The promise is called in eight days after it is made, over a border incident {{actor}}'s own service cannot confirm. Refusing ends the promise in public; agreeing starts something nobody at home has voted for.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.06, stability: -0.05, standing: -0.05 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { tension: 0.06, trust: -0.05 } },
    ],
    remembered: "We asked them to keep the promise in the first week they had it, and found out what it was worth.",
  },
];
