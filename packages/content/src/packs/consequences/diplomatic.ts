import type { ConsequenceDef } from "../../consequence.js";

// Diplomatic aftermath is written as conscience recoil: the room, the press
// office, and the player's own words coming back in somebody else's mouth. The
// act is words, so the aftermath is what words do to the people who hear them.
//
// Bands map to what the ladder actually is here. Low is the note and the
// statement; mid is the empty ambassador's chair; high is the coalition and the
// severance, where a success is never free.

export const DIPLOMATIC_CONSEQUENCES: readonly ConsequenceDef[] = [
  {
    id: "cq-diplomatic-low-success-note-read-in-the-car",
    instrument: "diplomatic",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "{{target}}'s deputy takes the note without reading it and reads it in the car. By the time he reaches his own building he has drafted the reply that gives {{actor}} what it asked for and not one line more.",
    ],
    effects: [
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.03 } },
      { kind: "metric", deltas: { standing: 0.01 } },
      // Getting exactly what was asked for, and being seen to ask narrowly, is
      // remembered as sharpness rather than goodwill.
      { kind: "relationship", direction: "actor-to-target", deltas: { tension: 0.02 } },
    ],
  },
  {
    id: "cq-diplomatic-low-success-warmer-than-it-needed",
    instrument: "diplomatic",
    rungBands: ["low"],
    valence: "success",
    weight: 1,
    beats: [
      "The note comes back answered in a single line, and the line is warmer than it needed to be. {{target}}'s foreign ministry lets the courtesy be noticed in three other capitals before lunch.",
    ],
    effects: [
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.04, alignment: 0.02 } },
      { kind: "feed", headline: "A quiet exchange between {{actor}} and {{target}} ends a month of not speaking" },
    ],
    sets: ["let-the-warmth-be-noticed"],
  },
  {
    id: "cq-diplomatic-low-partial-described-as-routine",
    instrument: "diplomatic",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "{{target}} agrees to the language and then asks that the meeting be described as routine. It is described as routine, and the concession buried inside it has stopped being worth anything by Friday.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.02 } },
    ],
  },
  {
    id: "cq-diplomatic-low-partial-four-in-the-afternoon",
    instrument: "diplomatic",
    rungBands: ["low"],
    valence: "partial",
    weight: 1,
    beats: [
      "The statement goes out at four in the afternoon, which is when a government publishes what it does not want read. {{target}} thanks {{actor}} through the back door and says nothing whatever in public.",
    ],
    effects: [
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.03 } },
      { kind: "metric", deltas: { standing: -0.04 } },
    ],
    sets: ["aired-it-late"],
  },
  {
    id: "cq-diplomatic-low-failure-read-aloud-to-the-room",
    instrument: "diplomatic",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "{{target}}'s press office reads the note aloud to a room of reporters, pausing at the part {{actor}} meant to be private. Someone at the back laughs, and the laugh is the piece of it that travels.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.06 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.06, trust: -0.04 } },
      { kind: "feed", headline: "The private note {{actor}} sent {{target}} is read out to reporters, laughter and all" },
    ],
    remembered:
      "{{actor}} sent us a quiet note and we read it out to the room, and nobody has sent a quiet note since.",
  },
  {
    id: "cq-diplomatic-low-failure-filed-with-the-unimportant",
    instrument: "diplomatic",
    rungBands: ["low"],
    valence: "failure",
    weight: 1,
    beats: [
      "Nothing comes back for nine days. On the tenth, {{target}} confirms receipt in one sentence and asks that further correspondence go through the trade desk, which is the drawer the unimportant is filed in.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.03 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.05, tension: 0.03 } },
    ],
  },
  {
    id: "cq-diplomatic-mid-success-channel-through-a-third-capital",
    instrument: "diplomatic",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "The ambassador is home by Thursday and the story holds for exactly as long as {{actor}} wanted it to hold. By the weekend {{target}} has sent a channel through a third capital, asking quietly what it would take.",
    ],
    effects: [
      { kind: "relationship", direction: "actor-to-target", deltas: { tension: -0.03 } },
      { kind: "metric", deltas: { standing: 0.03 } },
      // Winding a mission down and running it from a spare room is not free,
      // and the bill arrives whether or not the gambit worked.
      { kind: "metric", deltas: { treasury: -1500 } },
    ],
    sets: ["opened-back-channel"],
  },
  {
    id: "cq-diplomatic-mid-success-asked-in-writing",
    instrument: "diplomatic",
    rungBands: ["mid"],
    valence: "success",
    weight: 1,
    beats: [
      "{{target}} declines to call the recall an insult, and the declining is the concession. Its chargé asks for the working group to resume, and asks in writing, which nobody had expected before spring.",
    ],
    effects: [
      { kind: "relationship", direction: "target-to-actor", deltas: { alignment: 0.04, trust: 0.02 } },
      { kind: "metric", deltas: { standing: 0.02 } },
      // The home papers call a resumed working group a climbdown, and they
      // call it that on the day the envoy lands.
      { kind: "metric", deltas: { stability: -0.02 } },
    ],
  },
  {
    id: "cq-diplomatic-mid-partial-a-vacancy-not-a-message",
    instrument: "diplomatic",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "The ambassador leaves and the embassy keeps working, which is the whole trouble. {{target}} treats an empty chair as a vacancy rather than a message and fills the room with people below the rank that would matter.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.05 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.03 } },
    ],
  },
  {
    id: "cq-diplomatic-mid-partial-the-applause-at-home",
    instrument: "diplomatic",
    rungBands: ["mid"],
    valence: "partial",
    weight: 1,
    beats: [
      "Two of {{actor}}'s own former envoys go on the evening programs to say the recall was right and late. The applause at home costs {{actor}} the one person on the other side who had been arguing for restraint.",
    ],
    effects: [
      { kind: "metric", deltas: { stability: 0.03, standing: -0.02 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { trust: -0.06, tension: 0.04 } },
    ],
    remembered:
      "{{actor}} pulled its ambassador and let its old envoys cheer, and the man who argued for us lost that argument.",
  },
  {
    id: "cq-diplomatic-mid-failure-the-chronology-nobody-hears",
    instrument: "diplomatic",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "{{target}} recalls its own the same afternoon and puts it on the wire first, so the sequence reads backward everywhere it matters. {{actor}} spends the week correcting a chronology nobody is listening to.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.07 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.07 } },
      { kind: "feed", headline: "{{target}} answers within the hour, and the order of the two recalls is already disputed" },
    ],
  },
  {
    id: "cq-diplomatic-mid-failure-the-file-nobody-covered",
    instrument: "diplomatic",
    rungBands: ["mid"],
    valence: "failure",
    weight: 1,
    beats: [
      "The chair stays empty for a month and the work it was covering does not stop arriving. Two consular cases go unanswered, and one of them is a name the papers at home have already learned how to spell.",
    ],
    effects: [
      { kind: "metric", deltas: { stability: -0.05, standing: -0.04 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.04 } },
    ],
    sets: ["left-the-file-uncovered"],
  },
  {
    id: "cq-diplomatic-high-success-the-eleventh-signature",
    instrument: "diplomatic",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "Eleven governments sign the same paragraph inside four days and {{target}} folds on the third. {{actor}}'s negotiators come home knowing exactly what was promised to get the eleventh signature, and to whom.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.05 } },
      // The eleventh signature was bought, and the price is on this month's
      // books whatever the paragraph achieved.
      { kind: "metric", deltas: { treasury: -3000 } },
    ],
    sets: ["owes-the-eleventh-signature"],
  },
  {
    id: "cq-diplomatic-high-success-the-last-flight-out",
    instrument: "diplomatic",
    rungBands: ["high"],
    valence: "success",
    weight: 1,
    beats: [
      "Relations are cut at noon and the last flight out carries more of {{actor}}'s citizens than its staff. It works: {{target}} has no room left to maneuver and says so.",
      "Nobody in the room says out loud what now happens to the people who stayed, and the list of who stayed is on the table the whole time.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: 0.04, stability: -0.02 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { tension: 0.03 } },
    ],
    remembered:
      "{{actor}} cut the line at noon and called it a success, and its last flight out was mostly its own people.",
  },
  {
    id: "cq-diplomatic-high-partial-the-two-who-would-not-sign",
    instrument: "diplomatic",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "Nine sign and two do not, and the two who do not are precisely the two whose refusal {{target}} can point at. The paragraph holds anyway, thinner, and every later ask will be measured against how thin it was.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.05 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { trust: -0.03 } },
    ],
  },
  {
    id: "cq-diplomatic-high-partial-the-desk-that-issues-visas",
    instrument: "diplomatic",
    rungBands: ["high"],
    valence: "partial",
    weight: 1,
    beats: [
      "The break is announced and then unannounced for the consular section, because a hundred students cannot be got out in a week. {{target}} agrees to the exception and arranges for the agreement to be photographed.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.06, stability: -0.02 } },
      { kind: "feed", headline: "The break with {{target}} holds everywhere except the desk that issues visas" },
    ],
  },
  {
    id: "cq-diplomatic-high-failure-two-names-that-never-agreed",
    instrument: "diplomatic",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "The coalition is announced with two names on it that had not agreed to be on it. Both issue corrections before the evening, and at the next briefing {{target}}'s foreign ministry is asked, kindly, how it feels to be bullied badly.",
    ],
    effects: [
      { kind: "metric", deltas: { standing: -0.11, stability: -0.03 } },
      { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.06, trust: -0.06 } },
      { kind: "feed", headline: "Two governments say they never joined the coalition {{actor}} announced against {{target}}" },
    ],
  },
  {
    id: "cq-diplomatic-high-failure-routed-around-in-a-week",
    instrument: "diplomatic",
    rungBands: ["high"],
    valence: "failure",
    weight: 1,
    beats: [
      "{{actor}} cuts the line and {{target}} thanks it. Within a week the trade that mattered is running through two neighbors at a markup {{actor}} is paying, and the flag over an empty building is all that changed.",
    ],
    effects: [
      { kind: "metric", deltas: { treasury: -6000, standing: -0.06 } },
      { kind: "relationship", direction: "actor-to-target", deltas: { tradeDependence: 0.05 } },
      { kind: "grudge", cause: "the severance", weight: 0.4 },
    ],
    remembered:
      "{{actor}} broke off relations and we had routed around it inside a week, and that week was paid for by them.",
  },
];
