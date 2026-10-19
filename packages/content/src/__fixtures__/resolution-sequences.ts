import type { ResolutionSequenceDef } from "../resolution-beat.js";

// Step sequences that exist to be tested against, and for no other reason.
//
// They cover the three shapes the machinery has to handle — a failure written
// for a named branch, a partial that loses something and gets part of it back,
// and a plain two-step success — and they are nobody's craft bar.
// The craft bar is the authored bank.

const repulsedAtTheLine: ResolutionSequenceDef = {
  id: "fixture-repulsed-at-the-line",
  instrument: "military",
  rungBands: ["high"],
  valence: "failure",
  riskAffinity: ["repulsed"],
  weight: 1,
  steps: [
    {
      kind: "order-given",
      line: "The order goes out at four in the morning and is acknowledged by every station on the net within the minute.",
      outcome: "held",
      particulars: [],
    },
    {
      kind: "named-unit-attack",
      line: "{{unit}} crosses the start line into {{target}} with the light behind it and the road ahead of it still uncut.",
      outcome: "mixed",
      particulars: ["unit", "target"],
    },
    {
      kind: "loss",
      line: "{{unit}} loses its lead company to prepared fire from a ridge nobody had listed as held.",
      outcome: "cost",
      particulars: ["unit"],
    },
  ],
};

const theCourierBroughtBack: ResolutionSequenceDef = {
  id: "fixture-the-courier-brought-back",
  instrument: "covert",
  rungBands: ["mid", "high"],
  valence: "partial",
  weight: 1,
  steps: [
    {
      kind: "movement",
      line: "The team moves through the district on foot, an hour behind schedule and without the second vehicle.",
      outcome: "held",
      particulars: [],
    },
    {
      kind: "loss",
      line: "{{unit}} loses the courier at the second checkpoint, along with the folder the courier was carrying.",
      outcome: "cost",
      particulars: ["unit"],
    },
    {
      kind: "rescue",
      line: "{{person}}, the courier, is taken off the street before dawn and is across the border by the time the arrest is logged.",
      outcome: "mixed",
      particulars: ["person"],
    },
  ],
};

const theColumnTurnsAround: ResolutionSequenceDef = {
  id: "fixture-the-column-turns-around",
  instrument: "diplomatic",
  rungBands: ["low"],
  valence: "success",
  weight: 1,
  steps: [
    {
      kind: "contact",
      line: "{{actor}} reaches the ministry on a line nobody had used since the spring, and somebody senior answers it.",
      outcome: "held",
      particulars: ["actor"],
    },
    {
      kind: "report-back",
      line: "{{target}} agrees to the wording before lunch and puts a deputy minister's name under it in writing.",
      outcome: "gain",
      particulars: ["target"],
    },
  ],
};

export const FIXTURE_RESOLUTION_SEQUENCES: readonly ResolutionSequenceDef[] = [
  repulsedAtTheLine,
  theCourierBroughtBack,
  theColumnTurnsAround,
];
