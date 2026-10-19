// Covert sequences are written on a delay and in the passive parts of a week:
// a meeting that happens twice, a crate opened by the wrong customs officer, a
// name read out on a broadcast weeks after the desk stopped hearing anything.
// The act is mostly waiting, and the step that carries the result is almost
// never the step where the work was done.
//
// The {{unit}} slot is used defensively here — a detachment, an element, a
// covering flight drawn from a formation — so that most of these lines read
// correctly whatever the generator draws and need no affinity at all. Every
// line narrates an outcome the resolver already computed. There is no step that
// asks whether it worked, because by the time the player reads step one the
// packet is built and the answer is in it.
const AIR = { branches: ["air"] };
export const COVERT_RESOLUTION_SEQUENCES = [
    // --- low band: a recruitment, a placement, a channel opened ---------------
    {
        id: "rs-covert-low-success-the-second-meeting",
        instrument: "covert",
        rungBands: ["low"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "A case officer flies commercial on a passport that has been through six countries and worked in all of them.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The approach is made in a hotel bar at a conference nobody remembers attending, and it takes nineteen minutes.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "Two weeks pass with no contact at all, which is the interval the handbook asks for and nobody enjoys.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "{{person}} comes back for a second meeting unprompted, which is the only signal in this trade that means anything.",
                outcome: "gain",
                particulars: ["person"],
            },
        ],
    },
    {
        id: "rs-covert-low-success-the-argument-in-their-own-words",
        instrument: "covert",
        rungBands: ["low"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "Tasking routes through a program office that has not briefed the director's staff in two years and does not start now.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The piece runs in a trade weekly {{target}}'s ministries actually read, under a byline with a real person behind it.",
                outcome: "held",
                particulars: ["target"],
            },
            {
                kind: "report-back",
                line: "The argument is already in a committee transcript, sourced to nobody, phrased better than it was written.",
                outcome: "gain",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-covert-low-partial-real-and-six-weeks-old",
        instrument: "covert",
        rungBands: ["low"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "A meeting postponed twice happens in a parking garage a mile from the building where the file lives.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The man who comes is the deputy, not the principal, and he has brought what he could photograph rather than what was asked for.",
                outcome: "mixed",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "What comes back is real and six weeks old: a budget line, a name, and nothing about the decision the whole case was opened for.",
                outcome: "mixed",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-covert-low-partial-the-channel-somebody-else-reads",
        instrument: "covert",
        rungBands: ["low"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "Instructions are written narrow on purpose and are widened twice before anyone has left the building with them.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The channel opens on the first try and starts carrying traffic a second service is also reading, which nobody here learns for a month.",
                outcome: "mixed",
                particulars: [],
            },
            {
                kind: "hold",
                line: "{{actor}} keeps the channel and keeps the doubt about it, and files both under the same reference number.",
                outcome: "mixed",
                particulars: ["actor"],
            },
        ],
    },
    {
        id: "rs-covert-low-failure-exposure-a-photograph-of-our-own-officer",
        instrument: "covert",
        rungBands: ["low"],
        valence: "failure",
        riskAffinity: ["exposure"],
        weight: 1,
        steps: [
            {
                kind: "contact",
                line: "The approach lands on the third attempt, in a language the case officer learned in a classroom, and it shows.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "{{person}} records the whole conversation and walks it into a counterintelligence office in {{target}} the same afternoon.",
                outcome: "cost",
                particulars: ["person", "target"],
            },
            {
                kind: "report-back",
                line: "The desk learns it is burned from a broadcast, looking at a photograph of its own officer at a table the officer chose.",
                outcome: "cost",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-covert-low-failure-asset-lost-three-numbers",
        instrument: "covert",
        rungBands: ["low"],
        valence: "failure",
        riskAffinity: ["asset-lost"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "A meeting moved twice in one week reads to the handler as ordinary caution, and it is not that.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "loss",
                line: "The covering detachment from {{unit}} is pulled off the street, and the man it was covering for stops answering on any of three numbers.",
                outcome: "cost",
                particulars: ["unit"],
            },
            {
                kind: "report-back",
                line: "The last contact report is filed by a duty officer who never met him and spells his working name two different ways.",
                outcome: "cost",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-covert-low-failure-blowback-it-comes-home",
        instrument: "covert",
        rungBands: ["low"],
        valence: "failure",
        riskAffinity: ["blowback"],
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "The finding that authorizes it is signed on a Friday, with a scope paragraph two lawyers asked to narrow and only one of them got.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The material is placed through three intermediaries, the last of whom is paid in a currency that does not clear here.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "It comes home faster than it went out. The same argument is running on {{actor}}'s own airwaves, made by people who believe it and cannot be unconvinced.",
                outcome: "cost",
                particulars: ["actor"],
            },
        ],
    },
    // --- mid band: a network, a disruption, an exfiltration -------------------
    {
        id: "rs-covert-mid-success-filed-as-weather",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "Three teams go in on separate weeks under separate cover, and none of them meets another until the night itself.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The switching room is opened with a key cut from a photograph taken eight months ago by somebody doing something else.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "Nobody comes out of that building for forty minutes, which is thirty-five minutes longer than the plan wanted.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "{{target}}'s network is down thirteen hours and is reported as weather, which is also the version their own ministry files.",
                outcome: "gain",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-covert-mid-success-asks-about-the-dog",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "The exfiltration is authorized at eight in the evening and the aircraft is airborne before the paperwork catches it.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "movement",
                line: "His family travels separately, by bus, on documents good enough for a bored sergeant at two in the morning.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "{{person}} is on friendly ground by Thursday and asks, first, about a dog left with a neighbor who was told nothing.",
                outcome: "gain",
                particulars: ["person"],
            },
        ],
    },
    {
        id: "rs-covert-mid-partial-the-half-that-mattered-moves",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "contact",
                line: "The first device goes in on schedule and the second does not, because the room it needed was repainted that week.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "Half the traffic is readable, and the half that mattered is already moving onto a system bought from somebody else.",
                outcome: "mixed",
                particulars: [],
            },
            {
                kind: "hold",
                line: "The desk keeps what it has and writes the gap into a footnote that no briefing is ever going to read out loud.",
                outcome: "mixed",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-covert-mid-partial-everything-except-the-names",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "A team is on the ground four days early and spends three of them in a rented apartment with the shades down.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "loss",
                line: "The support element attached to {{unit}} loses the car with the drive still taped into its back seat, at a checkpoint that was not there on Tuesday.",
                outcome: "cost",
                particulars: ["unit"],
            },
            {
                kind: "rescue",
                line: "{{person}} walks out four days later with the drive cut free of that seat, and arrives with everything on it except the names.",
                outcome: "mixed",
                particulars: ["person"],
            },
        ],
    },
    {
        id: "rs-covert-mid-failure-exposure-the-serial-number-is-ours",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "failure",
        riskAffinity: ["exposure"],
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "The operation is briefed to fifteen people, which is six more than the plan called for and four more than it survives.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "A customs officer in {{target}} opens the wrong crate on a slow morning and photographs it before anyone senior arrives.",
                outcome: "cost",
                particulars: ["target"],
            },
            {
                kind: "report-back",
                line: "By the weekend the photographs are public, one of them close enough to read a serial number, and the serial number is ours.",
                outcome: "cost",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-covert-mid-failure-asset-lost-a-name-with-a-charge-attached",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "failure",
        riskAffinity: ["asset-lost"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "The pickup is set for the hour after the shift change, which was the right hour last month and is not the right hour now.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "loss",
                line: "The liaison detachment from {{unit}} loses the courier at the bridge, along with the two people the courier was moving.",
                outcome: "cost",
                particulars: ["unit"],
            },
            {
                kind: "contact",
                line: "Five weeks of nothing, and then a name read out on state television in {{target}} with a charge already attached to it.",
                outcome: "cost",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-covert-mid-failure-blowback-a-channel-it-built",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "failure",
        riskAffinity: ["blowback"],
        weight: 1,
        steps: [
            {
                kind: "contact",
                line: "The network is stood up fast, on money moving through a firm nobody at the desk chose and nobody at the desk vetted.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "It works for a season. The people running it begin taking tasks from somebody else on the days nobody here calls.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "The same network is moving weapons into a quarrel {{actor}} spent two years staying out of, down a route {{actor}} paid to open.",
                outcome: "cost",
                particulars: ["actor"],
            },
        ],
    },
    // --- high band: sabotage, a government changed, a hand on the outcome -----
    {
        id: "rs-covert-high-success-a-maintenance-program-nobody-budgeted",
        instrument: "covert",
        rungBands: ["high"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "The memo comes back at the end of a Tuesday, signed, with one question written on it about the medical team and none about anything else.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "movement",
                line: "The aircraft crosses low enough to stay under a radar horizon written into a manual thirty years ago and never revised.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "Two men in contractor coveralls are inside the turbine hall for nineteen minutes and leave through the gate they came in by.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "The plant is off line before dawn and stays off for a season, and {{target}} announces a maintenance program it has not budgeted.",
                outcome: "gain",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-covert-high-success-a-government-that-answers-the-phone",
        instrument: "covert",
        rungBands: ["high"],
        valence: "success",
        weight: 1,
        steps: [
            {
                kind: "contact",
                line: "The officers who matter are approached one at a time, each of them told a version that is true and incomplete.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "The barracks stay in the barracks for six hours. That is the whole operation, and from outside it looks like nothing at all.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "By morning {{target}} has a government that answers the phone, and nobody outside two rooms can point at what moved it.",
                outcome: "gain",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-covert-high-partial-the-crew-is-back-the-target-is-repaired",
        instrument: "covert",
        rungBands: ["high"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "A one-page authorization is signed with a deniability annex that two of the four principals have read the whole way through.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "loss",
                line: "The covering flight from {{unit}} loses an aircraft on the way out, and its crew is on the ground in a country nobody planned for.",
                outcome: "cost",
                particulars: ["unit"],
                unitAffinity: AIR,
            },
            {
                kind: "rescue",
                line: "The crew is brought home across a land border and the operation is not: the target's own engineers are on the damage while the crew is still on the road, and all four of their names now sit in a foreign file.",
                outcome: "mixed",
                particulars: [],
            },
        ],
    },
    {
        id: "rs-covert-high-partial-a-third-of-the-load",
        instrument: "covert",
        rungBands: ["high"],
        valence: "partial",
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "Crates move by rail under a manifest that says agricultural machinery and is signed by a clerk who exists.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "Material reaches the substation on the second attempt, carried in by a contractor who has worked there since before it was sold off.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "Two of the three transformers go and the third holds, so {{target}} sheds a third of its load and keeps every word of its position.",
                outcome: "mixed",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-covert-high-failure-exposure-denying-the-photographed-parts",
        instrument: "covert",
        rungBands: ["high"],
        valence: "failure",
        riskAffinity: ["exposure"],
        weight: 1,
        steps: [
            {
                kind: "order-given",
                line: "Scope is argued for two weeks and signed anyway, over a lawyer's note nobody wants read back to them later.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "contact",
                line: "The team is stopped at a road check on the way in, carrying equipment for which there is no innocent explanation.",
                outcome: "cost",
                particulars: [],
            },
            {
                kind: "stand-down",
                line: "The rest is called off by cable at three in the morning, and {{actor}} spends a month denying only the parts already photographed.",
                outcome: "cost",
                particulars: ["actor"],
            },
        ],
    },
    {
        id: "rs-covert-high-failure-asset-lost-people-never-told",
        instrument: "covert",
        rungBands: ["high"],
        valence: "failure",
        riskAffinity: ["asset-lost"],
        weight: 1,
        steps: [
            {
                kind: "movement",
                line: "The network moves into position across three nights and reports itself complete on the fourth, an hour early.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "loss",
                line: "The standby element from {{unit}} loses contact with the inside team, and the inside team is fourteen people with families in the city.",
                outcome: "cost",
                particulars: ["unit"],
            },
            {
                kind: "contact",
                line: "Arrests run two weeks and take in people who were never told what they were part of, and {{target}} televises the last of them.",
                outcome: "cost",
                particulars: ["target"],
            },
        ],
    },
    {
        id: "rs-covert-high-failure-blowback-a-government-it-cannot-name",
        instrument: "covert",
        rungBands: ["high"],
        valence: "failure",
        riskAffinity: ["blowback"],
        weight: 1,
        steps: [
            {
                kind: "contact",
                line: "The faction is armed quietly and told, in a room that keeps no minutes, that the support ends when the fighting does.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "hold",
                line: "It does not end when the fighting does. They win, they keep what they were given, and they stop taking the call.",
                outcome: "held",
                particulars: [],
            },
            {
                kind: "report-back",
                line: "A year on, {{actor}} is negotiating with a government it helped make and cannot admit to, on terms it no longer sets.",
                outcome: "cost",
                particulars: ["actor"],
            },
        ],
    },
];
