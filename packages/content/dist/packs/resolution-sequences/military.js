// Military sequences are procedure with a clock on it. The camera stays on the
// crews, the ramp, the manifest and the after-action note; when something goes
// wrong the line reports what was counted, not what it looked like.
//
// A formation is named through {{unit}} and only through {{unit}} — the
// designation is generated per campaign, so no real service ever appears in a
// game about spending one. Where a line's verbs are aviation verbs, or where
// the act is corps-scale, the step carries a `unitAffinity` and the draw is
// narrowed to what the sentence can honestly say. What a step may claim is
// bounded by the outcome the resolver already computed: a sequence drawn for a
// failure has no step that implies the packet might yet say otherwise.
const AIR = { branches: ["air"] };
const GROUND = { branches: ["army", "marines"] };
const GROUND_FORMATION = { branches: ["army", "marines"], echelon: "formation" };
export const MILITARY_RESOLUTION_SEQUENCES = [
    // --- low band: an exercise, a deployment, a port call, a transit ----------
    {
        id: "rs-military-low-success-when-is-the-next-one",
        instrument: "military",
        rungBands: ["low"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "Warning orders go out at midnight and every station on the net acknowledges inside four minutes.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "movement",
                line: "{{unit}} is wheels up ahead of the weather and lands with two hours of fuel it had not planned on having.",
                outcome: "held",
                particulars: ["unit"],
                unitAffinity: AIR,
            },
            {
                kind: "hold",
                line: "Ground crews work the ramp in shifts for a week and lose one afternoon to a part that has to come by sea.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "The full program flies for ten days, and {{target}}'s liaison officer asks, unprompted, when the next one is scheduled.",
                outcome: "gain",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-military-low-success-one-of-them-asks-in-writing",
        instrument: "military",
        rungBands: ["low"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "contact",
                line: "A port call is agreed inside a week, and the harbor pilots are briefed by people who have done this before.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "Ships sit alongside for four days and the crews are given the town, which is most of what the visit is for.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "Two of {{target}}'s neighbors ask for the same visit before the ships have cleared the channel, and one asks in writing.",
                outcome: "gain",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-military-low-partial-in-plain-view-of-a-coast-road",
        instrument: "military",
        rungBands: ["low"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "The deployment lands on schedule onto a ramp with no shelter, no hardened fuel, and one working ground power unit.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "{{unit}} flies half the program and sits out the rest in plain view of a coast road that anybody can drive.",
                outcome: "mixed",
                particulars: ["unit"],
                unitAffinity: AIR,
            },
        ],
    },
    {
        id: "rs-military-low-partial-never-once-as-one-fleet",
        instrument: "military",
        rungBands: ["low"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "Two capitals negotiate the rule set for a month, and neither of them is happy to sign what comes out of it.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "Both forces share the same water and no common frequency, so every signal between them goes through a phone call ashore.",
                outcome: "mixed",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "{{actor}} logs the exercise complete, and the after-action note records that the two fleets never once maneuvered as one.",
                outcome: "mixed",
                particulars: ["actor"],
            },
        ],
    },
    {
        id: "rs-military-low-failure-repulsed-off-the-published-line",
        instrument: "military",
        rungBands: ["low"],
        valence: "failure",
        riskAffinity: ["repulsed"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "Transit is announced a week ahead, which is the entire point, and the route is published down to the mile.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "{{target}} puts a coast guard cutter across the lane, films the whole passage from a second hull, and does not move.",
                outcome: "cost",
                particulars: ["target"],
            },
            {
                kind: "hold",
                line: "Our own bridge asks twice for permission to hold course and is told, twice, to take the long way around.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "stand-down",
                line: "Ships turn for home a day early and well off the published line, with film of the whole passage already on every screen in the region.",
                outcome: "cost",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-low-failure-escalation-a-third-country-comes-to-watch",
        instrument: "military",
        rungBands: ["low"],
        valence: "failure",
        riskAffinity: ["escalation"],
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "The deployment is briefed as routine, and the word routine survives exactly one press conference.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "movement",
                line: "{{unit}} arrives forward on a Thursday with a tanker and a radar the region has not had pointed at it before.",
                outcome: "held",
                particulars: ["unit"],
                unitAffinity: AIR,
            },
            {
                kind: "contact",
                line: "{{target}} answers with an exercise twice the size, announced for the same water, and a third government orders ships out to watch both.",
                outcome: "cost",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-military-low-failure-atrocity-scandal-two-hundred-yards",
        instrument: "military",
        rungBands: ["low"],
        valence: "failure",
        riskAffinity: ["atrocity-scandal"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "A host government lends the range and asks for the firing schedule in writing, and is given it late.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "A round goes long during a night firing run and lands two hundred yards from a fishing crew working the water it always works.",
                outcome: "cost",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "Nobody is hurt and it changes nothing: the crew's phone footage runs for a week, and the host's opposition has a bill to file by Friday.",
                outcome: "cost",
                particulars: [],
            },
        ],
    },
    // --- mid band: interdiction, a limited strike, an enforced no-fly ---------
    {
        id: "rs-military-mid-success-unusable-for-eleven-days",
        instrument: "military",
        rungBands: ["mid"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "Approval comes off a target list that lost four entries between the morning brief and the signature.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "named-unit-attack",
                line: "{{unit}} puts eight weapons onto the airfield in {{target}} and is back over water before the alert flight is airborne.",
                outcome: "gain",
                particulars: ["unit", "target"],
                unitAffinity: AIR,
            },
            {
                kind: "hold",
                line: "Nothing goes up from that field for the rest of the night, and its tower keeps calling a squadron that is not there.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "Every aircraft comes home, the runway is unusable for eleven days, and the counted dead are four, all of them in uniform.",
                outcome: "gain",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-mid-success-three-of-four-lines-stop-taking-the-charter",
        instrument: "military",
        rungBands: ["mid"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "An interdiction line goes up eighty miles out, far enough that a merchant captain still has room to change his mind.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The first ship stopped is boarded in a moderate sea by a team that has done it forty times against a tied-up hull.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "Cargo is exactly what the file said, the boarding photographs are with the insurers before the hold is resealed, and three of the four shipping lines stop taking the charter at all.",
                outcome: "gain",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-mid-partial-the-third-launcher",
        instrument: "military",
        rungBands: ["mid"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "A four-hour window opens twenty minutes late because a tanker went unserviceable on the ramp.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "movement",
                line: "Crews are briefed that the third launcher is the one that matters, and they take off without a fix on it.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "named-unit-attack",
                line: "{{unit}} takes the two launchers it can see in {{target}} and never finds the third, which was what the night was for.",
                outcome: "mixed",
                particulars: ["unit", "target"],
                unitAffinity: AIR,
            },
            {
                kind: "hold",
                line: "Imagery flown the next morning shows two burned pads and a third revetment swept clean and empty.",
                outcome: "mixed",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "The site is out of the fight for a season and the program behind it is not, and the analysts say so in their first paragraph.",
                outcome: "mixed",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-mid-partial-everything-that-matters-moves-at-night",
        instrument: "military",
        rungBands: ["mid"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "Enforcement starts on a Monday with fourteen aircraft against a rule set that was written for twenty-two.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "The air over {{target}} stays clear and the roads under it do not, and everything that matters moves at night, by truck.",
                outcome: "mixed",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-military-mid-failure-repulsed-two-aircraft-short",
        instrument: "military",
        rungBands: ["mid"],
        valence: "failure",
        riskAffinity: ["repulsed"],
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "A package launches into weather the forecast had breaking, and the forecast is wrong by a little over two hours.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "named-unit-attack",
                line: "{{unit}} runs into a belt of air defense over {{target}} that the last assessment carried as unserviceable since spring.",
                outcome: "cost",
                particulars: ["unit", "target"],
                unitAffinity: AIR,
            },
            {
                kind: "loss",
                line: "{{unit}} comes home two aircraft short, and one of the crews is on the ground on the wrong side of the line and talking.",
                outcome: "cost",
                particulars: ["unit"],
                unitAffinity: AIR,
            },
        ],
    },
    {
        id: "rs-military-mid-failure-escalation-four-flags-and-no-agreement",
        instrument: "military",
        rungBands: ["mid"],
        valence: "failure",
        riskAffinity: ["escalation"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "Our line goes up at first light and is holding by the hour the first freighter turns away from it.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "{{target}} escorts the next convoy through with a warship on each beam and orders nobody is willing to read out loud.",
                outcome: "cost",
                particulars: ["target"],
            },
            {
                kind: "contact",
                line: "Two other governments announce escorts of their own inside a week, and by Friday four navies work the same lane on four sets of orders.",
                outcome: "cost",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-mid-failure-atrocity-scandal-a-building-that-changed-hands",
        instrument: "military",
        rungBands: ["mid"],
        valence: "failure",
        riskAffinity: ["atrocity-scandal"],
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "Clearance rests on a pattern-of-life file twelve days old, which is inside the standard and at the edge of it.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "named-unit-attack",
                line: "{{unit}} strikes the compound in {{target}} on time and on the coordinates given, and the compound changed hands in June.",
                outcome: "cost",
                particulars: ["unit", "target"],
                unitAffinity: AIR,
            },
            {
                kind: "report-back",
                line: "The list the health ministry publishes runs to seven names, two of them children, and the imagery {{actor}} holds does not contradict it.",
                outcome: "cost",
                particulars: ["actor"],
            },
        ],
    },
    // --- high band: a campaign, a crossing, a country entered ------------------
    {
        id: "rs-military-high-success-a-quarter-of-what-the-planners-carried",
        instrument: "military",
        rungBands: ["high"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "The order is signed at ten at night, and the President is told the first crossing happens in six hours.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "named-unit-attack",
                line: "{{unit}} takes both bridges intact inside {{target}} and is still holding them when the counterattack finally forms.",
                outcome: "gain",
                particulars: ["unit", "target"],
                unitAffinity: GROUND,
            },
            {
                kind: "contact",
                line: "A second crossing goes in below the town at first light, against a garrison that had been told to expect nothing.",
                outcome: "gain",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "Corridors are open on the fourth day, the ports behind them are working, and the casualty list is a quarter of what the planners carried.",
                outcome: "gain",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-high-success-separate-blind-pieces",
        instrument: "military",
        rungBands: ["high"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "Twelve hundred sorties go up in three days behind a tanker plan nobody believed until it worked.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "Weather closes for two days and the sortie rate holds, because the crews are flying a schedule built for worse.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "On the sixth day {{target}}'s air defense stops being a system and becomes a set of separate pieces, each of them blind.",
                outcome: "gain",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-military-high-partial-a-canal-nobody-had-drawn",
        instrument: "military",
        rungBands: ["high"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "named-unit-attack",
                line: "{{unit}} has the western half of the city in {{target}} in six days and stops at a canal that was on nobody's map.",
                outcome: "mixed",
                particulars: ["unit", "target"],
                unitAffinity: GROUND,
            },
            {
                kind: "loss",
                line: "{{unit}} pays for three blocks with a company's worth of casualties, and a platoon on the far side of the canal stops answering.",
                outcome: "cost",
                particulars: ["unit"],
                unitAffinity: GROUND,
            },
            {
                kind: "rescue",
                line: "That platoon is brought out after dark by a relief force running on fumes, and the canal stays exactly where it is.",
                outcome: "mixed",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-high-partial-eleven-hours-where-it-ran-four",
        instrument: "military",
        rungBands: ["high"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "The plan assumes the ports are working by week three, and that is an assumption, not a report from anybody in the ports.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "named-unit-attack",
                line: "{{unit}} clears the coast road into {{target}} and finds every bridge behind it dropped by people who had the schedule.",
                outcome: "mixed",
                particulars: ["unit", "target"],
                unitAffinity: GROUND,
            },
            {
                kind: "movement",
                line: "Engineers put in two spans in five days, and a third that will carry a truck but will not carry a tank.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "Ground is held and the timetable is gone, and the supply run that used to take four hours now takes eleven.",
                outcome: "mixed",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-high-failure-repulsed-burned-where-it-stands",
        instrument: "military",
        rungBands: ["high"],
        valence: "failure",
        riskAffinity: ["repulsed"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "The crossing is set for a night with no moon, over a river the engineers surveyed from a photograph and a tax map.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "named-unit-attack",
                line: "{{unit}} puts two battalions across into {{target}} and finds the far bank prepared, ranged, and waiting for exactly this.",
                outcome: "cost",
                particulars: ["unit", "target"],
                unitAffinity: GROUND_FORMATION,
            },
            {
                kind: "stand-down",
                line: "The bridgehead is given up before dawn, and everything that cannot be driven back across is burned where it stands.",
                outcome: "cost",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-military-high-failure-escalation-three-armies-one-of-them-ours",
        instrument: "military",
        rungBands: ["high"],
        valence: "failure",
        riskAffinity: ["escalation"],
        weight: 1,
        steps: [
            {
                kind: "named-unit-attack",
                line: "{{unit}} has the border district of {{target}} inside a week, at a price the briefing calls acceptable and the crews do not.",
                outcome: "mixed",
                particulars: ["unit", "target"],
                unitAffinity: GROUND_FORMATION,
            },
            {
                kind: "hold",
                line: "The line holds a month while two of the neighbors sign a mutual defense pact they had refused for a decade.",
                outcome: "mixed",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "By the second month there are three armies in the country, and only one of them answers to {{actor}}.",
                outcome: "cost",
                particulars: ["actor"],
            },
        ],
    },
    {
        id: "rs-military-high-failure-atrocity-scandal-the-name-of-the-village",
        instrument: "military",
        rungBands: ["high"],
        valence: "failure",
        riskAffinity: ["atrocity-scandal"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "The advance outruns its own military police by two days, and nobody senior notices which two days those were.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "A column takes fire from a village at dusk and answers it for four hours with everything mounted on the vehicles.",
                outcome: "cost",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "The photographs reach a wire desk before the after-action report reaches {{actor}}, and the commanding general learns the village's name from a reporter.",
                outcome: "cost",
                particulars: ["actor"],
            },
        ],
    },
];
