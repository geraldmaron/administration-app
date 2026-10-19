// Scenarios that exist to be tested against, and for no other reason.
//
// Suites fixture on these rather than on the bundled core pack. Shipped
// content and the tests of the machinery around it have two different reasons
// to change, so binding them makes rewriting the pack break a dozen suites
// that have nothing to do with what the pack says — and lets a file about
// pools, shards or drivers quietly assert things about *content*, like which
// scenario ids exist or how many classes the pack spans.
//
// These are deliberately plain. They clear every gate, they cover the shapes
// the machinery has to handle (a cast scenario with a transmission, trouble
// entirely at home, a scenario gated on a flag an earlier answer stamps), and
// they are nobody's craft bar. The craft bar is the shipped pack.
const theBorderReading = {
    id: "fixture-the-border-reading",
    class: "foreign-crisis",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A reading taken at the border",
    cast: { pick: "tensest" },
    locus: { site: "border", ground: "counterpart", descriptor: "the frontier road where the crossing was closed at noon" },
    conditions: [{ kind: "relationship", field: "tension", atLeast: 0.3 }, { kind: "geography", field: "bordered", is: true, of: "counterpart" }],
    weight: 1,
    boosts: [{ source: "tension", factor: 1.4 }],
    particulars: [
        { label: "Trucks held", value: "200" },
        { label: "Crossing closed", value: "Noon" },
    ],
    opening: [
        {
            speaker: { kind: "cabinet", roleHint: "foreign" },
            text: "They closed the crossing at noon and our trade through it stops tonight unless you answer them today. Their reason is a paper one and everyone on both sides knows it.",
        },
        {
            speaker: { kind: "narrator" },
            text: "The queue of trucks is long enough by evening that it has its own name in the papers, and nobody in the room believes this is really about paperwork.",
        },
    ],
    transmission: {
        relay: "cable",
        attribution: "their foreign ministry",
        text: "The crossing stays shut until your side answers for what happened on it. We are content to wait, and we think you are not.",
    },
    replies: [
        {
            id: "answer-the-paper-with-paper",
            tone: "conciliatory",
            text: "Answer their note tonight, in writing, and get the trucks moving before the week turns.",
            sets: ["answered-the-border-note"],
            commitment: {
                kind: "position",
                cost: { standing: -0.05, treasury: -80 },
                impact: { institutional: ["alliance-credit-earned"] },
                remembered: "The border note was answered the same night, and the trucks moved before anyone had to explain the delay.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "interior" }, text: "The trucks moved at four in the morning and their border post logged every plate. Their ministry has asked for the same note in their own language, which is not a thing they have ever asked for before." },
            },
        },
        {
            id: "close-our-side-too",
            tone: "coercive",
            text: "Close our side of it as well, and let them explain to their own hauliers who did that.",
            commitment: { kind: "instrument", instrument: "economic", rung: 3 },
        },
    ],
};
const theQueueAtTheBranch = {
    id: "fixture-the-queue-at-the-branch",
    class: "economy",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "The queue outside the branch",
    cast: { pick: "none" },
    locus: { site: "capital", ground: "counterpart", descriptor: "the bank branch on the square with the queue around it" },
    conditions: [{ kind: "turn", atLeast: 2 }],
    weight: 1,
    boosts: [{ source: "instability", factor: 1.2 }],
    opening: [
        {
            speaker: { kind: "cabinet", roleHint: "finance" },
            text: "People are taking their money out faster than the branches can hand it over, and if that is still true on Monday it stops being a mood and becomes a fact about the currency.",
        },
    ],
    replies: [
        {
            id: "stand-behind-the-deposits",
            tone: "firm",
            text: "Say tonight that every deposit in this country is good, and mean it with the reserves.",
            sets: ["guaranteed-the-deposits"],
            commitment: {
                kind: "position",
                cost: { treasury: -140, stability: 0.05 },
                impact: { institutional: ["legislative-capital-spent"] },
                remembered: "The government put itself behind every deposit in the country, out loud, and paid for the promise out of the reserves.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "The queues were gone by Wednesday. What is left in the reserve will not do that a second time, and the people betting against us can count it as well as I can." },
            },
        },
        {
            id: "clear-the-depot-square",
            tone: "evasive",
            text: "Say nothing before Monday and hope the weekend takes the heat out of it.",
            sets: ["cleared-the-square"],
            press: "{{leader}} said nothing about the queues, and the queues were still there on Monday morning.",
            commitment: {
                kind: "position",
                cost: { stability: -0.06, standing: -0.02 },
                impact: { institutional: ["civil-service-strained"], divisive: true },
                remembered: "Nothing was said before Monday, and the queues were left to decide for themselves what the silence meant.",
                rejoinder: { speaker: { kind: "narrator" }, text: "By Monday the branches had opened to shorter lines than anyone expected. Two smaller lenders did not open at all, and neither had been in any trouble on Friday." },
            },
        },
    ],
};
// Reads the flag the domestic scenario above stamps, so a suite can prove that
// what a player answered changes what the board can show them later.
const theBillForTheGuarantee = {
    id: "fixture-the-bill-for-the-guarantee",
    class: "economy",
    severity: "routine",
    dilemmaShape: "containment",
    subject: "The bill for the guarantee",
    cast: { pick: "none" },
    locus: { site: "capital", ground: "counterpart", descriptor: "the room where the reserve position is read out to the whole floor" },
    conditions: [{ kind: "flag", flag: "guaranteed-the-deposits", is: true }],
    weight: 1,
    once: true,
    opening: [
        {
            speaker: { kind: "cabinet", roleHint: "finance" },
            text: "The promise you made to the depositors is being called in, and paying it in full costs this government the room it was keeping for everything else this year.",
        },
    ],
    replies: [
        {
            id: "pay-it-in-full",
            tone: "principled",
            text: "Pay it in full and on time, and let the rest of the year be harder for it.",
            commitment: {
                kind: "position",
                cost: { treasury: -200, standing: 0.06 },
                impact: { institutional: ["legislative-capital-spent"] },
                remembered: "The guarantee was paid in full and on time, and everything else that year was cut to find it.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "It was paid on the day and in full. The three programs cut to find it were all in the same province, which nobody in this room noticed until the province did." },
            },
        },
        {
            id: "pay-it-slowly",
            tone: "evasive",
            text: "Pay it slowly, in parts, and never say out loud that this is what we are doing.",
            sets: ["paid-the-guarantee-slowly"],
            commitment: {
                kind: "position",
                cost: { treasury: -60, stability: -0.05 },
                remembered: "The guarantee was paid in pieces, quietly, and nobody in the government ever called it what it was.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "justice" }, text: "It went out in pieces and nothing was announced. Two of the payments needed a reference on the transfer, and the reference somebody typed names the guarantee." },
            },
        },
    ],
};
// Cast on trust rather than tension, and gated on it, so a suite can prove the
// same board opens different doors depending on which way the relationship
// reads. `once` as well, which is the other thing a suite needs to probe.
const theQuietWord = {
    id: "fixture-the-quiet-word",
    class: "espionage",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A quiet word from a friend",
    cast: { pick: "closest" },
    locus: { site: "capital", ground: "counterpart", descriptor: "the residence study where the call was taken alone" },
    conditions: [{ kind: "relationship", field: "trust", atLeast: 0.5 }],
    weight: 1,
    once: true,
    opening: [
        {
            speaker: { kind: "cabinet", roleHint: "foreign" },
            text: "Their service has told ours something about one of our own departments that we cannot check without admitting we were told, and you have to decide today whether we act on a friend's word alone.",
        },
    ],
    transmission: {
        relay: "readout",
        attribution: "their intelligence service",
        text: "We are telling you because we would want to be told. What you do with it is yours, and we were never in this conversation.",
    },
    replies: [
        {
            id: "act-on-the-word",
            tone: "firm",
            text: "Act on it today, quietly, and take the cost of being wrong if we are wrong.",
            sets: ["acted-on-a-friends-word"],
            commitment: { kind: "instrument", instrument: "covert", rung: 3 },
        },
        {
            id: "thank-them-and-wait",
            tone: "evasive",
            text: "Thank them for it, do nothing yet, and put our own people on it the long way around.",
            sets: ["waited-on-the-friends-word"],
            commitment: {
                kind: "position",
                cost: { militaryReadiness: -0.04, stability: 0.02 },
                remembered: "The warning was taken, thanked for, and left to sit while the government checked it the slow way.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "defense" }, text: "The slow check took eleven days and the warning held up. The people who brought it to us have been told, politely, how long we took, and they were counting." },
            },
        },
    ],
};
/** The fixture pool. Small, valid, and owned by the tests rather than by the game. */
export const FIXTURE_SCENARIOS = [
    theBorderReading,
    theQueueAtTheBranch,
    theBillForTheGuarantee,
    theQuietWord,
];
