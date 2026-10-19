import type { ConsequenceDef } from "../../consequence.js";

// Covert aftermath is written on a delay. The signature is the thing that
// arrives cold and late: a habit nobody wrote down, a car filmed on a road it
// had no business being on, a debt the people who did the work will name
// themselves at a time of their own choosing. A clean success here is the
// setup for something, and the card says so without saying when.

export const COVERT_CONSEQUENCES: readonly ConsequenceDef[] = [
  {
    id: "cq-covert-low-success-one-channel-nobody-wrote-down",
    instrument: "covert",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The take is good and arrives on time for three weeks. In the fourth it stops being intelligence and becomes a habit: the desk now reads {{target}} through a single channel, and nowhere in the file does it say that the channel is single.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: 0.03 } },
      { kind: "metric", deltas: { stability: -0.02 } },
    ],
    sets: ["one-channel-habit"],
  },
  {
    id: "cq-covert-low-success-a-columnist-who-believes-it",
    instrument: "covert",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The placement works. A columnist nobody paid writes the argument {{actor}} wanted written, in his own words, believing them. He will go on believing them long after the operation is closed, and that is not a thing anyone can undo later.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.02 } },
      // The argument does not stop at the border it was written for; it runs
      // at home too, and it is running there now with nobody steering it.
      { kind: "metric", deltas: { stability: -0.03 } },
    ],
    sets: ["a-columnist-who-believes-it"],
  },
  {
    id: "cq-covert-low-partial-quoted-not-relied-on",
    instrument: "covert",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The coverage holds on the two premises that matter and drops the third, which is the one the analysts wanted. What comes back is enough to be quoted in a briefing and not enough to be relied on, and it will be quoted.",
    ],
    effects: [{ kind: "metric", deltas: { militaryReadiness: -0.03, treasury: -1500 } }],
    sets: ["quoted-not-relied-on"],
  },
  {
    id: "cq-covert-low-partial-the-wrong-audience",
    instrument: "covert",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The material moves and lands with an audience that already agreed, and travels no further than they do. A junior officer notes as much in the file. The file is not opened again for a year.",
    ],
    effects: [{ kind: "metric", deltas: { treasury: -2000, militaryReadiness: -0.02, standing: -0.02 } }],
  },
  {
    id: "cq-covert-low-failure-they-watched-us-watching",
    instrument: "covert",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "A technician at {{target}}'s exchange finds the tap during routine work and says nothing for eleven days, while his own service watches what {{actor}} chooses to look at. What {{actor}} chooses to look at is the intelligence now.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.06 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.05, trust: -0.05 } },
      { kind: "grudge", cause: "the tap on the exchange", weight: 0.35 },
    ],
    sets: ["they-watched-us-watching"],
  },
  {
    id: "cq-covert-low-failure-the-invoice-not-the-article",
    instrument: "covert",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "The placement is traced back through a payment nobody laundered properly. {{target}}'s papers run the invoice rather than the article, and the columnist who wrote in good faith is finished by the weekend.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.08, stability: -0.03 } },
      { kind: "feed", headline: "An invoice, not an argument: a placement in {{target}}'s press is traced home" },
    ],
    remembered:
      "{{actor}} bought a column in our papers and then left the receipt in a drawer for us to go and find.",
  },
  {
    id: "cq-covert-mid-success-a-bearing-that-was-failing",
    instrument: "covert",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The pumping station goes down at three in the morning and reads, to everyone who examines it, as a bearing that had been failing for a year. It stays read that way.",
      "The people who wrote that bearing's history are the ones who will be asked about it on the day it stops reading that way.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: 0.03 } },
      { kind: "metric", deltas: { treasury: -2500 } },
    ],
    sets: ["a-bearing-that-was-failing"],
  },
  {
    id: "cq-covert-mid-success-looking-for-a-fault",
    instrument: "covert",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The line is cut cleanly and the repair crews are on it by dawn, which is the point: {{target}} loses four days and no dignity, so it goes looking for a fault instead of a hand. It will look for a hand the second time.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.02, militaryReadiness: 0.02 } },
      { kind: "metric", deltas: { stability: -0.02 } },
    ],
    sets: ["no-hand-looked-for-yet"],
  },
  {
    id: "cq-covert-mid-partial-the-redundancy-nobody-mapped",
    instrument: "covert",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "The charge functions and a redundancy nobody had mapped carries the load inside the hour. {{target}} is inconvenienced for a shift and now knows, precisely, which of its systems somebody thought worth attacking.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.02, treasury: -3000 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.04 } },
    ],
  },
  {
    id: "cq-covert-mid-partial-a-car-on-the-wrong-road",
    instrument: "covert",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "It functions, and the team comes out two hours late. Nobody is caught. But a car is filmed on a road it had no business being on, and the film sits unexamined in a provincial office that will one day be reorganized.",
    ],
    effects: [{ kind: "metric", deltas: { militaryReadiness: -0.03, treasury: -2000 } }],
    sets: ["a-car-on-the-wrong-road"],
  },
  {
    id: "cq-covert-mid-failure-taken-alive-at-the-perimeter",
    instrument: "covert",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "The team is taken alive at the perimeter, which is worse than the other way. Inside a week {{actor}}'s own passports are laid out on a table in front of cameras, and the men holding them are asked to say their real names.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.12, militaryReadiness: -0.05, stability: -0.04 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.09, trust: -0.08 } },
      { kind: "grudge", cause: "the men taken at the perimeter", weight: 0.6 },
      { kind: "feed", headline: "{{target}} lays three passports on a table and asks the men to say their names" },
    ],
  },
  {
    id: "cq-covert-mid-failure-the-night-shift",
    instrument: "covert",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "The charge functions on the wrong side of the wall and takes the night shift with it. They were not soldiers and they were not the target, and the list of their names is short enough to be read out in full.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.1, stability: -0.06 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.1, trust: -0.09 } },
      { kind: "grudge", cause: "the night shift", weight: 0.7 },
    ],
    sets: ["the-night-shift"],
    remembered:
      "{{actor}} came for the wall and took the night shift instead, and we read out every one of their names.",
  },
  {
    id: "cq-covert-high-success-serial-numbers-in-their-hands",
    instrument: "covert",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "The transfer arrives, and one of {{target}}'s field commanders is heard on an open radio channel saying the front may not be theirs to hold much longer. The recipients are grateful, capable, and now permanent: they have their own reasons, their own quarrel, and {{actor}}'s serial numbers.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.03, militaryReadiness: 0.02 } },
      { kind: "metric", deltas: { treasury: -3000 } },
    ],
    sets: ["serial-numbers-in-their-hands"],
  },
  {
    id: "cq-covert-high-success-a-debt-they-will-name",
    instrument: "covert",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "It goes to plan, and the government falls on a Thursday afternoon to what looks from any distance like its own army. The men who did it are owed something, and they will name the debt themselves, later, at an hour of their choosing.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.04 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.05 } },
    ],
    sets: ["a-debt-they-will-name"],
    remembered:
      "{{actor}} put our government on a plane on a Thursday and let the whole thing be called an internal matter.",
  },
  {
    id: "cq-covert-high-partial-a-quarrel-never-asked-about",
    instrument: "covert",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "The proxy takes the shipment and spends a third of it on a rival {{actor}} has never heard of. The front line moves the way it was supposed to move. So does a quarrel {{actor}} is now party to without ever having been asked.",
    ],
    effects: [{ kind: "metric", deltas: { treasury: -6000, militaryReadiness: -0.03, standing: -0.03 } }],
  },
  {
    id: "cq-covert-high-partial-the-file-that-made-the-list",
    instrument: "covert",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "The government does not fall. It reshuffles, survives, and spends the following month removing everyone who might have helped, along with a great many who never would have. The list was assembled out of a file {{actor}} supplied.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.03, treasury: -2000 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.06, trust: -0.04 } },
    ],
    sets: ["the-file-that-made-the-list"],
  },
  {
    id: "cq-covert-high-failure-the-method-in-four-other-places",
    instrument: "covert",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "It collapses in the first hour and the survivors are questioned for eleven weeks. What they give up is not the plan, which is finished anyway, but the method — and the method is in use in four other places tonight.",
    ],
    effects: [
      { kind: "metric", deltas: { militaryReadiness: -0.1, standing: -0.12, stability: -0.05 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.1, trust: -0.1 } },
      { kind: "grudge", cause: "the operation that collapsed", weight: 0.7 },
      { kind: "feed", headline: "{{target}} says it has the method as well as the men, and names four other places" },
    ],
  },
  {
    id: "cq-covert-high-failure-the-inventory-on-camera",
    instrument: "covert",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "The proxy is beaten and then absorbed, and everything {{actor}} sent is inventoried on camera by the people it was sent against. The inventory is slow, itemized, and will be shown again on the anniversary every year from now.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.11, treasury: -9000, militaryReadiness: -0.06 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.08 } },
      { kind: "grudge", cause: "the inventory shown on camera", weight: 0.6 },
    ],
    sets: ["the-inventory-on-camera"],
  },
];
