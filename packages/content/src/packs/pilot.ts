import type { CityId } from "@admin/world";
import type { ScenarioDef, ScenarioPack } from "../scenario.js";

// The pilot pack: one scenario per condition kind that the board could always
// answer and content could never ask.
//
// Every kind here reads state the engine has modeled since long before content
// could see it — the coalitions the world forms out of shared alarm, the
// compacts two governments both signed, the program this administration
// actually legislated, the pressure the country carries from people the state
// does not command, and the shape of the coast. Until these existed a writer
// reached for a proxy: tension standing in for a coalition, stability standing
// in for an insurgency, nothing at all standing in for a landlocked country's
// dependence on its neighbors.
//
// One scenario each, held to the same gates the bundled pack is: the schema,
// the whole audit with zero findings, the engine's runtime playability gate,
// and reachability against the real preview boards. A condition kind whose
// pilot cannot be written is a condition kind that was never usable.

const theCapitalsThatFoundEachOther: ScenarioDef = {
  id: "the-capitals-that-found-each-other",
  class: "foreign-crisis",
  severity: "serious",
  dilemmaShape: "credulity-bet",
  subject: "The capitals that found each other",
  cast: { pick: "tensest" },
  locus: {
    site: "capital",
    ground: "home",
    descriptor: "the side room where three separate envoys arrived within one week",
  },
  conditions: [{ kind: "coalition", against: "counterpart", present: true }],
  weight: 1,
  boosts: [{ source: "tension", factor: 1.2 }],
  particulars: [
    { label: "Capitals aligned", value: "4" },
    { label: "Asked us to sign", value: "2" },
    { label: "Envoys here this week", value: "3" },
    { label: "Our name on it", value: "Not yet" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "foreign" },
      text: "Four governments that have never agreed about anything have spent this week agreeing about {{counterpart}}, and two of them have asked, off the record, whether we would put our name to it. That door is open now and it will not be open once they have finished counting who walked through.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "Standing with them is cheap while it is only paper. It stops being cheap the first time one of them is pushed and looks around to see who meant it. If we sign, we are signing for that day, not for this one.",
    },
    {
      speaker: { kind: "narrator" },
      text: "Nobody has announced anything. The evidence is a run of flights into the same three capitals and a joint communique that says almost nothing at unusual length.",
    },
  ],
  transmission: {
    relay: "broadcast",
    attribution: "their foreign ministry's spokesman",
    voice: "state",
    text: "We have noted the traffic between certain capitals this week. Governments that sign papers against their neighbors should ask themselves who will still be standing beside them on the day the paper is tested.",
  },
  replies: [
    {
      id: "put-our-name-to-it",
      tone: "firm",
      text: "Sign it, and say plainly at home why we are standing where we are standing.",
      sets: ["signed-the-common-line"],
      commitment: {
        kind: "position",
        cost: { standing: 0.07, treasury: -90, stability: -0.03 },
        impact: { institutional: ["alliance-credit-earned"], divisive: true },
        remembered: "The government put its name to the common line against {{counterpart}} while the ink was still wet, and told the country it had done so before anyone else could.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "foreign" },
          text: "Two of the four have already asked what else we would put our name to. The one that asked first is the one I would least like to be tied to.",
        },
      },
    },
    {
      id: "stand-near-it",
      tone: "evasive",
      text: "Agree with every word of it in private and put our name to none of it.",
      sets: ["stood-near-the-common-line"],
      commitment: {
        kind: "position",
        cost: { standing: -0.05, stability: 0.03, treasury: -20 },
        impact: { institutional: ["alliance-credit-spent"] },
        remembered: "The government agreed with the common line in every private room it was raised in and declined to be counted in public as part of it.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The communique went out with four names on it. A reporter read them aloud on the evening bulletin, and then read out who was not on it.",
        },
      },
    },
    {
      id: "tell-them-what-is-coming",
      tone: "conciliatory",
      text: "Tell {{counterpart}} exactly what is forming, and what it would take to stop it forming.",
      sets: ["warned-the-counterpart"],
      commitment: {
        kind: "position",
        cost: { standing: -0.03, treasury: -30 },
        pull: { nationalistGlobalist: -0.08 },
        // Warning the subject of a coalition is the source burned: whoever told
        // us in confidence learns that we pass it on.
        impact: { institutional: ["intelligence-source-burned", "alliance-credit-spent"] },
        remembered: "The government told {{counterpart}} what was gathering against them, and what would have to change before it stopped gathering.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "foreign" },
          text: "{{counterpart}} thanked us for it. Within the day one of the four was repeating our own wording back to me and asking where I thought they had got it.",
        },
      },
    },
  ],
};

const theClauseBothGovernmentsSigned: ScenarioDef = {
  id: "the-clause-both-governments-signed",
  premise: {"kind": "universal", "reason": "The sharedMembership gate establishes the compact both governments signed, and a subsidy that breaches one of its clauses is a treaty-compliance question that deals the same in a boom or a slump."},
  class: "economy",
  severity: "routine",
  dilemmaShape: "foot-in-the-door",
  subject: "The clause both governments signed",
  cast: { pick: "closest" },
  locus: {
    site: "city",
    ground: "home",
    city: "CITY-USA-toledo" as CityId,
    state: "OH",
    sector: "auto",
    descriptor: "the plant town in {{city}} where the subsidy pays half of every wage",
  },
  particulars: [
    { label: "Subsidy in the wage", value: "50% of every wage in the town" },
    { label: "Compact clause", value: "Signed by both governments" },
    { label: "Complaint filed", value: "Correctly, and not loudly" },
    { label: "Governments watching", value: "4, before the review comes around" },
  ],
  conditions: [{ kind: "sharedMembership", present: true }],
  weight: 1.1,
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "We are subsidizing a plant that competes directly with theirs, and the compact we both signed says we may not. {{counterpart}} has not complained loudly. They have complained correctly, which is worse, because the paper is on their side and everyone else in the compact can read.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "commerce" },
      text: "This is small enough to settle and public enough to be a precedent. Whatever we decide here is what the next four governments will quote at us when the review comes around.",
    },
  ],
  transmission: {
    relay: "cable",
    attribution: "their trade ministry",
    voice: "state",
    text: "The subsidy paid at the plant is incompatible with the article both our governments signed. We have raised it through the proper channel, and we would prefer that it stay there.",
  },
  replies: [
    {
      id: "wind-the-subsidy-down",
      tone: "principled",
      text: "Wind it down on a published schedule, and let the town see the schedule before they hear a rumor of it.",
      sets: ["honored-the-compact-clause"],
      commitment: {
        kind: "position",
        cost: { treasury: 140, stability: -0.05, standing: 0.04 },
        // The plant closes on a published schedule, so the town loses its work
        // locally rather than the country losing anything.
        impact: { human: { displaced: "local", borneBy: "one-region" }, institutional: ["alliance-credit-earned"], divisive: true },
        remembered: "The government wound the subsidy down on a schedule it published itself, and the town read the dates before it heard the rumor.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "The town did the arithmetic faster than we did. The plant's owners announced a closing date this morning, a full year ahead of the one we published.",
        },
      },
    },
    {
      id: "keep-paying-and-argue",
      tone: "firm",
      text: "Keep paying it and argue the clause. They can take us to the review if they want it settled.",
      sets: ["defended-the-subsidy"],
      commitment: {
        kind: "position",
        cost: { treasury: -70, stability: 0.05, standing: -0.04 },
        impact: { institutional: ["alliance-credit-spent", "legal-authority-spent"] },
        remembered: "The government kept paying the subsidy the compact forbade and dared its own partners to put the argument in front of the review.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "commerce" },
          text: "Two other signatories have written to ask whether the clause binds them either. Neither has a plant to protect. Both have noticed that we do.",
        },
      },
    },
    {
      id: "trade-it-for-something",
      tone: "evasive",
      text: "Offer to drop it in exchange for the fisheries paragraph we have wanted for two years.",
      sets: ["traded-the-subsidy-away"],
      commitment: {
        kind: "position",
        cost: { treasury: 40, standing: -0.02, stability: -0.03 },
        impact: { human: { displaced: "local", borneBy: "one-region" }, institutional: ["alliance-credit-earned"] },
        remembered: "The subsidy was traded away for the fisheries paragraph, which is a better bargain than it sounds and looks exactly like a retreat.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "We have the paragraph. The plant's workers read the same wire we did and had worked out what they were exchanged for before the shift ended.",
        },
      },
    },
  ],
};

const whatTheProgramIsBuying: ScenarioDef = {
  id: "what-the-program-is-buying",
  class: "institution",
  severity: "serious",
  dilemmaShape: "allocation",
  subject: "What the program is buying, and where",
  cast: { pick: "none" },
  locus: {
    site: "coast",
    ground: "home",
    descriptor: "the naval yards that have not built a hull in eleven years",
  },
  conditions: [{ kind: "policyStance", domain: "defense", stance: "defense-rearmament", active: true }],
  weight: 1,
  particulars: [
    { label: "Hulls promised", value: "6" },
    { label: "From an allied yard", value: "2 years" },
    { label: "From our own yards", value: "6 years" },
    { label: "Last hull built at home", value: "11 years ago" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "You are rearming, and the Joint Chiefs would like the first hulls bought from an allied yard because they arrive sooner and they work. The law forbids it without a waiver from Congress. The yards at home would like the same money and would take four years longer to hand you anything that floats.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "Buying abroad is the cheaper line in this year's accounts and the more expensive one in every year after it. Building at home is a wage bill in towns that have voted for whoever promised them work since before you were in politics.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The {{assembly}} has already asked, in writing, where the program's first money is going, and has been told it will be informed in due course.",
    },
  ],
  replies: [
    {
      id: "build-them-at-home",
      tone: "principled",
      text: "Build them at home. The yards reopen, and the country waits longer for the ships.",
      sets: ["kept-the-yards-on-naval-orders"],
      commitment: {
        kind: "position",
        cost: { treasury: -160, militaryReadiness: -0.04, stability: 0.07 },
        impact: { institutional: ["legislative-capital-spent"] },
        remembered: "The first hulls of the program were ordered from the home yards, which put the towns back to work and left the fleet waiting years for anything to sail.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "defense" },
          text: "The yards are hiring again and the towns can feel it. The Joint Chiefs have stopped putting delivery dates in writing.",
        },
      },
    },
    {
      id: "buy-them-abroad",
      tone: "firm",
      text: "Buy abroad and ask Congress for the waiver. The navy gets ships this term and the yards get an explanation.",
      sets: ["bought-the-hulls-abroad"],
      commitment: {
        kind: "position",
        cost: { militaryReadiness: 0.08, treasury: -60, stability: -0.06 },
        impact: { human: { displaced: "local", borneBy: "one-region" }, divisive: true },
        remembered: "The hulls were bought abroad because they would arrive this term, and the yard towns were sent an explanation instead of a contract.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The {{assembly}} got its answer from a foreign shipbuilder's announcement, which named the buyer and the sum on the same morning the question was asked again.",
        },
      },
    },
    {
      id: "split-the-order",
      tone: "evasive",
      text: "Split the order down the middle and let nobody work out which half was the real one.",
      sets: ["split-the-hull-order"],
      commitment: {
        kind: "position",
        cost: { treasury: -110, militaryReadiness: 0.03, stability: 0.02 },
        impact: { institutional: ["civil-service-strained"] },
        remembered: "The order was split down the middle so that neither the Joint Chiefs nor the yard towns could say they had been refused, and both understood that they had.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "Neither half is big enough to hold the price we were quoted for the whole. I will be back in front of you for the difference before the year is out.",
        },
      },
    },
  ],
};

// The buy-abroad branch's reader. Buying the hulls where they were ready made
// the fleet real this term and made somebody else's yard the only place it can
// be kept running — which is a dependency nobody voted for and nobody noticed
// creating. Written because the program scenario shipped with one of its three
// doors answered.
const theYardThatHoldsTheSpares: ScenarioDef = {
  id: "the-yard-that-holds-the-spares",
  class: "foreign-crisis",
  severity: "serious",
  dilemmaShape: "foot-in-the-door",
  subject: "The yard that holds the spares",
  cast: { pick: "closest" },
  locus: {
    site: "coast",
    ground: "counterpart",
    descriptor: "the fitting-out quay where the last two hulls are waiting on parts",
  },
  conditions: [{ kind: "flag", flag: "bought-the-hulls-abroad", is: true, agedAtLeast: 5 }, { kind: "geography", field: "coastal", is: true, of: "counterpart" }],
  weight: 1,
  boosts: [{ source: "flagAge", factor: 1 }],
  once: true,
  particulars: [
    { label: "Hulls delivered", value: "12 of 12" },
    { label: "Hulls able to sail", value: "6 of 12" },
    { label: "Clause attached", value: "Basing, in agreed waters" },
    { label: "Other parts suppliers", value: "None" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "The ships arrived and half of them cannot sail, because the parts that keep them running come from the yard that built them and that yard has gone quiet on us. {{counterpart}} has not refused anything. They have simply attached a line to the spares contract about where our ships may be based, and they would like an answer before the refit season.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "foreign" },
      text: "This is small and it is the shape of every future ask. Agree to it and the next line is longer, because we will still have no other yard and they will still know it.",
    },
  ],
  transmission: {
    relay: "cable",
    attribution: "their defense ministry",
    text: "The refit terms are unchanged in substance and reflect the partnership under which these vessels were built. We would regard basing outside the agreed waters as a matter requiring consultation, and we are confident consultation is what friends do.",
  },
  replies: [
    {
      id: "sign-the-refit-line",
      tone: "conciliatory",
      text: "Sign it. The fleet sails this year and we argue about the wording when we have a yard of our own.",
      sets: ["accepted-the-basing-line"],
      commitment: {
        kind: "position",
        cost: { militaryReadiness: 0.06, standing: -0.05, treasury: -30 },
        relationship: { trust: 0.05, tension: -0.03 },
        impact: { institutional: ["alliance-credit-spent", "legal-authority-spent"] },
        remembered: "The government signed a basing condition into a spares contract because the alternative was a fleet that could not leave the quay.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "foreign" },
          text: "Signed and sailing. Their ministry has already sent a second paper, on where the crews train, and it opens by thanking us for the spirit of the first one.",
        },
      },
    },
    {
      id: "build-the-spares-line-at-home",
      tone: "principled",
      text: "Start building the parts here, pay what it costs, and tell them why we are doing it.",
      sets: ["built-a-domestic-spares-line"],
      commitment: {
        kind: "position",
        cost: { treasury: -140, militaryReadiness: -0.05, standing: 0.06 },
        impact: { institutional: ["legislative-capital-spent"] },
        remembered: "The government started making the parts itself at a price it could not really afford, so that nobody else would decide where its ships could go.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "The first parts are three years out and the yards want a firm order to tool up. Until then the fleet runs on what we have, and we have told everyone we are doing this.",
        },
      },
    },
    {
      id: "put-it-to-the-partners",
      tone: "firm",
      text: "Take the clause to the compact and ask out loud whether a partner may berth our ships for us.",
      sets: ["took-the-basing-line-to-the-partners"],
      commitment: {
        kind: "position",
        cost: { standing: 0.04, militaryReadiness: -0.02, treasury: -20 },
        relationship: { trust: -0.04, tension: 0.05 },
        impact: { institutional: ["alliance-credit-earned"] },
        remembered: "The government put the basing clause in front of everybody who had signed the same compact and asked them to say, on the record, whether it was ordinary.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "Two of the signatories agreed it was unusual and neither would say so in writing. Both of them buy their own hulls from the same quay.",
        },
      },
    },
  ],
};

// The split-order branch's reader, and the bill its own rejoinder promised: the
// money left will finish one of the two halves and not both, which is the
// allocation the split was taken to avoid.
const theHalfHullInTheShed: ScenarioDef = {
  id: "the-half-hull-in-the-shed",
  premise: {"kind": "universal", "reason": "The split-the-hull-order flag (aged 4 or more), set when the player split a hull order between home and foreign yards, is the state it presumes, and the year-later bill for that split is a budget choice that deals the same in any phase."},
  class: "economy",
  severity: "serious",
  dilemmaShape: "allocation",
  subject: "The half hull in the shed",
  cast: { pick: "none" },
  locus: {
    site: "coast",
    ground: "home",
    descriptor: "the covered slipway where the home-built hull has stood unfinished for two years",
  },
  conditions: [{ kind: "flag", flag: "split-the-hull-order", is: true, agedAtLeast: 4 }],
  weight: 1,
  boosts: [{ source: "flagAge", factor: 1 }],
  once: true,
  particulars: [
    { label: "Home hull", value: "50% built" },
    { label: "Foreign hulls", value: "On schedule" },
    { label: "Money left", value: "Enough for 1 of 2" },
    { label: "Deposit abroad", value: "Lost if we miss the payment" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "Splitting the order bought us a year and the bill for it has arrived. What is left in the program will finish the hull in our own shed or make the final payment on the ones being built abroad, and it will not do both. The choice you would not make last year is the same choice, and it costs more now.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "Miss the foreign payment and we lose the deposit and the berth in their build queue. Stop our own hull and it stays in that shed as a photograph anybody can take, for as long as anyone cares to remember it.",
    },
  ],
  replies: [
    {
      id: "finish-the-home-hull",
      tone: "principled",
      text: "Finish our own hull. Take the loss on the deposit and tell the yard town it is getting its ship.",
      sets: ["finished-the-home-hull"],
      commitment: {
        kind: "position",
        cost: { treasury: -90, stability: 0.05, militaryReadiness: -0.06 },
        impact: { institutional: ["legislative-capital-spent"] },
        remembered: "The half-built hull in the home shed was ordered finished and the deposit abroad was written off, which the yard town understood before the department had explained it.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "defense" },
          text: "The yard town turned out at the shed as though the hull were already in the water. The Joint Chiefs read your statement as one ship where they had been promised several, and they have asked me which of their plans to stop writing.",
        },
      },
    },
    {
      id: "make-the-foreign-payment",
      tone: "firm",
      text: "Make the payment abroad. We get ships that float, and the shed keeps what is in it.",
      sets: ["paid-out-the-foreign-hulls"],
      commitment: {
        kind: "position",
        cost: { treasury: -90, militaryReadiness: 0.07, stability: -0.06 },
        impact: { human: { displaced: "local", borneBy: "one-region" }, divisive: true },
        remembered: "The final payment went abroad and the half-built hull was left standing in its shed, open to anybody who wanted a photograph of the choice.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The shed was not locked. A photograph of the half hull, framed by its own open doors, led the regional news that evening, and the payment was the second item.",
        },
      },
    },
    {
      id: "sell-the-half-hull-on",
      tone: "evasive",
      text: "Sell the half hull to anyone who will take it, and put whatever it fetches against the payment.",
      sets: ["sold-the-unfinished-hull"],
      commitment: {
        kind: "position",
        cost: { treasury: -50, standing: -0.07, militaryReadiness: 0.03 },
        impact: { human: { displaced: "local", borneBy: "one-region" }, institutional: ["civil-service-strained"] },
        remembered: "The unfinished hull was put up for sale at whatever it would fetch, and the government pledged the money to the ships it had bought from somebody else.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "The best offer on the table is less than the steel in it, from a yard that means to finish it and sell it on. The town has worked out that it could have been theirs for the difference.",
        },
      },
    },
  ],
};

const theProvincesTheWritDoesNotReach: ScenarioDef = {
  id: "the-provinces-the-writ-does-not-reach",
  class: "unrest",
  severity: "critical",
  dilemmaShape: "containment",
  subject: "The counties the writ does not reach",
  cast: { pick: "none" },
  locus: {
    site: "interior",
    ground: "home",
    descriptor: "the mountain counties where federal agents stopped going",
  },
  conditions: [
    { kind: "operatorPressure", field: "insurgency", atLeast: 0.4 },
    { kind: "operatorPressure", field: "protest", atLeast: 0.45 },
  ],
  weight: 1.2,
  boosts: [{ source: "instability", factor: 1.3 }],
  particulars: [
    { label: "Counties unpoliced", value: "9" },
    { label: "Federal offices closed", value: "All" },
    { label: "Marches in Washington", value: "Third week" },
    { label: "Insurrection law", value: "Not invoked" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "homeland" },
      text: "There are counties in this country where the federal government is now a rumor, and there are people marching in Washington about something else entirely who have started saying so out loud. Those two facts met each other this week, and everything you do about one of them is heard by the other.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "A brigade would hold the mountain roads and would be photographed doing it. The photographs are the cost. Every household that sees them decides that week whether this is a government protecting them or an army arriving.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The county governments up there have not declared anything. They have stopped answering federal letters, and the counties on either side have noticed how little that has cost them so far.",
    },
  ],
  replies: [
    {
      id: "send-a-brigade-up-the-roads",
      tone: "coercive",
      text: "Invoke the insurrection law, put an army brigade on the mountain roads, and keep the checkpoints there for as long as it takes.",
      press: "Insurrection law invoked, and an army brigade holds checkpoints on the mountain roads",
      sets: ["garrisoned-the-uplands"],
      commitment: {
        kind: "position",
        cost: { stability: 0.09, standing: -0.07, treasury: -130 },
        pull: { authLibertarian: 0.1 },
        // A brigade held on the roads for months is the readiness spend the
        // model prices, and the mountain counties are one region, not the country.
        impact: { human: { displaced: "regional", borneBy: "one-region" }, institutional: ["forces-committed"], divisive: true },
        remembered: "The insurrection law was invoked and an army brigade was put on the mountain roads, which is how those counties learned what this government would spend to be obeyed.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The photographs traveled that week, as promised. In the cities they were read as the government arriving. In the mountains they were read as the government saying what it thought of them.",
        },
      },
    },
    {
      id: "buy-the-councils-back",
      tone: "conciliatory",
      text: "Pay those counties the federal money we have held back from them, in public, and ask their sheriffs to keep the peace for us.",
      sets: ["paid-the-upland-councils"],
      commitment: {
        kind: "position",
        cost: { treasury: -180, stability: 0.05, standing: 0.03 },
        impact: { institutional: ["legislative-capital-spent"] },
        remembered: "The mountain counties were paid the federal money that had been held back from them for years, and their sheriffs were asked to keep the peace on Washington's behalf, which some of them did.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "homeland" },
          text: "Three sheriffs took the money and have their deputies back on the roads. The fourth county took the money and has not written back, and it is the one the other three are watching.",
        },
      },
    },
    {
      id: "hold-the-line-where-it-is",
      tone: "evasive",
      text: "Hold the valley towns, admit nothing about the mountains, and buy a year.",
      sets: ["conceded-the-uplands-quietly"],
      commitment: {
        kind: "position",
        cost: { stability: -0.08, treasury: 60, standing: -0.05 },
        // Writing off the districts abandons the people in them, which is a
        // regional displacement nobody announced.
        impact: { human: { displaced: "regional", borneBy: "one-region" }, divisive: true },
        remembered: "The mountain counties were written off without anybody saying so, and the government held the line where holding it was still cheap.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "homeland" },
          text: "The valley towns are holding. Two of the mountain counties have started issuing their own permits and their own deeds, and people up there are using them.",
        },
      },
    },
  ],
};

const theWaterCameOverTheYardWall: ScenarioDef = {
  id: "the-water-came-over-the-yard-wall",
  premise: {"kind": "introduces", "what": "The surge is the incident: on the second night the sea came over the harbor wall and flooded the slipways and machine halls of the yards the player reopened, creating the loss the week reports. The kept-the-yards-on-naval-orders flag (aged 2) supplies the yards, not the hazard."},
  class: "disaster",
  severity: "serious",
  dilemmaShape: "containment",
  subject: "The water came over the yard wall",
  cast: { pick: "none" },
  locus: {
    site: "coast",
    ground: "home",
    descriptor: "the harbor basin where the new slipways are under brown water",
  },
  conditions: [
    { kind: "flag", flag: "kept-the-yards-on-naval-orders", is: true, agedAtLeast: 2 },
  ],
  weight: 1,
  boosts: [{ source: "flagAge", factor: 1 }],
  particulars: [
    { label: "Slipways flooded", value: "2 of 2" },
    { label: "Surge over the wall", value: "Waist deep" },
    { label: "Drowned", value: "None" },
    { label: "Crews out of work", value: "The whole yard" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "interior" },
      text: "The surge came over the harbor wall on the second night and it is sitting in the yards you reopened to build the navy's hulls. Nobody drowned. The slipways are under water, the machine halls are under water, and the town is standing on the road above it watching the thing you promised them go quiet again.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "The wall was built for a sea we no longer have. Raising it costs more than the yards earned in the years they were open, and refusing to raise it means saying out loud that this coast is not worth defending.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The pictures that traveled were not of the water. They were of the crews standing on the road in the clothes they went to work in, watching it.",
    },
  ],
  replies: [
    {
      id: "raise-the-sea-wall",
      tone: "principled",
      text: "Raise the wall for the sea we actually have, and say what it costs before anyone asks.",
      sets: ["raised-the-harbor-wall"],
      commitment: {
        kind: "position",
        cost: { treasury: -200, stability: 0.08, standing: 0.04 },
        // The flood displaced the yard town and nobody drowned — the opening
        // says so outright, which is why no toll is declared here.
        impact: { human: { displaced: "local", borneBy: "one-region" } },
        remembered: "The harbor wall was ordered rebuilt for the sea the country actually has, at a price the government published before anybody thought to demand it.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "The number is out and nobody has argued with it yet. Three other harbor towns have called to ask when their wall is being raised, and every one of them quoted yours back at me.",
        },
      },
    },
    {
      id: "pump-it-out-and-carry-on",
      tone: "evasive",
      text: "Pump it out, get the crews back inside, and leave the wall for a better year.",
      sets: ["pumped-out-the-yards"],
      commitment: {
        kind: "position",
        cost: { treasury: -50, stability: 0.03, militaryReadiness: -0.03 },
        impact: { human: { displaced: "local", borneBy: "one-region" }, institutional: ["civil-service-strained"] },
        remembered: "The yards were ordered pumped out and reopened, and the wall that let the sea in was left standing exactly as it was.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The first pumps were running before dark. By the machine shop door, just above the line the water had left, somebody had pinned a tide chart with the next spring tides circled on it.",
        },
      },
    },
    {
      id: "move-the-work-inland",
      tone: "firm",
      text: "Move the work to a river yard inland and tell the town why it is not coming back.",
      sets: ["moved-the-yards-inland"],
      commitment: {
        kind: "position",
        cost: { treasury: 90, stability: -0.09, militaryReadiness: 0.03 },
        impact: { human: { displaced: "regional", borneBy: "one-region" }, divisive: true },
        remembered: "The work was moved to a river yard inland and the harbor town was told, to its face, that what it had been promised was not coming back.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "interior" },
          text: "The river yard can take the work. It cannot take the crews, and about half of them had worked that out before the announcement finished.",
        },
      },
    },
  ],
};

export const PILOT_SCENARIOS: readonly ScenarioDef[] = [
  theCapitalsThatFoundEachOther,
  theClauseBothGovernmentsSigned,
  whatTheProgramIsBuying,
  theProvincesTheWritDoesNotReach,
  // The program's three readers, one per door: the yards kept busy and then
  // flooded, the fleet bought abroad and then held to somebody else's terms,
  // and the order split until the money would only finish half of it.
  theWaterCameOverTheYardWall,
  theYardThatHoldsTheSpares,
  theHalfHullInTheShed,
];

export const pilotPack: ScenarioPack = {
  id: "pilot",
  version: 1,
  scenarios: [...PILOT_SCENARIOS],
};
