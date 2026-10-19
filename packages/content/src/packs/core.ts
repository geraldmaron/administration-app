import type { CityId } from "@admin/world";
import { scenarioFiredFlag, type ScenarioDef, type ScenarioPack } from "../scenario.js";
import { CORE_CONSEQUENCES } from "./core-consequences.js";

// The bundled pack: the scenarios every install carries before any remote
// pack arrives, and the craft bar every generated scenario is measured
// against. The writing rules are simple and non-negotiable: plain words a
// player never has to decode, officials who talk like people under pressure,
// a narrator who states rather than performs, and replies a leader could say
// out loud in a room.
//
// Version three is the first written against the presentation contract, and
// the two rules it added are the ones to read for. A foreign government never
// speaks in the player's thread — its words are a transmission, a document
// carried into the room, and how it arrived is part of what it means. And
// every opening is pitched at the person being briefed: the first thing the
// room says is what this costs the country and what is being decided, not what
// happened at what hour. The hour goes in the particulars, where a wire desk
// would slug it.

const theWaterTheyBothClaim: ScenarioDef = {
  id: "the-water-they-both-claim",
  premise: {"kind": "introduces", "what": "The shooting is the incident: a patrol pass on a contested crossing ends in gunfire this morning, kills one crew member and leaves another in the water, creating the crisis the week reports. It is a pre-war clash with the other fleet and planes held back, not a war state."},
  class: "war",
  severity: "critical",
  dilemmaShape: "retaliation",
  subject: "The water they both claim",
  cast: { pick: "tensest" },
  family: { id: "arc-the-water-they-both-claim", role: "opener" },
  locus: {
    site: "chokepoint",
    // Their side of it: the cable they send says our aircraft crossed *their*
    // line and was warned on *their* channel, so the water in question is the
    // water they patrol.
    ground: "counterpart",
    descriptor: "the gray water midway across the crossing both flags claim",
  },
  conditions: [{ kind: "relationship", field: "tension", atLeast: 0.35 }, { kind: "geography", field: "chokepoint", is: true, of: "counterpart" }, { kind: "geography", field: "coastal", is: true, of: "counterpart" }],
  weight: 1,
  once: true,
  boosts: [{ source: "tension", factor: 1.5 }],
  particulars: [
    { label: "Crew aboard", value: "2" },
    { label: "Pulled out alive", value: "1" },
    { label: "Shot down at", value: "05:51" },
    { label: "Water temperature", value: "39°F" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "They have killed one of our people and we have about six hours to get the other one out of the water alive. Whatever you decide about the shooting itself, you decide it today, because tomorrow we are pulling out a body and the country will be watching us do it.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "Their fleet has not moved and their planes are on the ground. They want this small. That gives you room, and it will not last past the first funeral.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The pictures of the wreckage reach the newsrooms before the room has finished sitting down, and the morning papers are already choosing their word for what this was.",
    },
  ],
  transmission: {
    relay: "cable",
    attribution: "their defense ministry",
    text: "Your aircraft crossed our line twice this week and was warned twice on the open channel. Our commander did what his orders required. Recover your man. Then tell us why you keep testing a line you know we watch.",
  },
  replies: [
    {
      id: "escort-the-rescue-in",
      tone: "firm",
      text: "Send our own boats in with an escort and interdict anything that moves at them, tell them we are coming, and dare them to stop it.",
      sets: ["escorted-the-rescue"],
      commitment: {
        kind: "instrument",
        instrument: "military",
        rung: 3,
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "defense" },
          text: "Two boats and their escort are off the pier now, and we've told their navy on the open channel exactly what's coming and why. Anyone who moves at those boats from here does it knowing.",
        },
      },
    },
    {
      id: "ask-them-to-pull-him-out",
      tone: "conciliatory",
      text: "Ask them to pull our man out themselves, and say thank you in public if they do.",
      press: "Rescue of our own crewman asked of the government whose gunners fired on him",
      sets: ["asked-them-for-the-rescue"],
      commitment: {
        kind: "position",
        cost: { standing: -0.08, militaryReadiness: -0.02, stability: 0.03 },
        // The crew member they killed. "acted-upon" because the shooting was
        // theirs — a country fired on from outside closes ranks, and that is
        // the reading this answer trades against by thanking them for it.
        impact: { human: { lives: "isolated", borneBy: "the-services" }, agency: "acted-upon" },
        remembered: "The government asked the people who had just shot the aircraft down to go and rescue its crew, and thanked them out loud for doing it.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "defense" },
          text: "They had him out before dusk, and they filmed themselves doing it. Our man is on their evening broadcast, alive, wrapped in one of their blankets.",
        },
      },
    },
    {
      id: "name-it-before-the-house",
      tone: "principled",
      text: "Name it for what it was, in front of the country, before anyone tells us how to say it.",
      sets: ["named-the-shootdown"],
      commitment: {
        kind: "position",
        cost: { standing: 0.07, treasury: -40, stability: -0.05 },
        // The same dead crew member, and a country that does not agree about
        // what naming it out loud on the day was for.
        impact: { human: { lives: "isolated", borneBy: "the-services" }, agency: "acted-upon", divisive: true },
        remembered: "The shooting was named out loud, in front of the country, on the day it happened and before anyone had agreed on softer words for it.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The pilot's family heard which word had been chosen from the broadcast. Nobody from the Pentagon had reached the house yet, and the drive takes four hours.",
        },
      },
    },
  ],
  context: {
    standing:
      "Patrols on both sides of the crossing have been testing the same line for weeks, close enough that each side's radios log the other's callouts. This morning one of the passes ended in gunfire instead of a warning, and the argument the two governments have been having in private for months is now public and cannot be walked back.",
    precedent:
      "The last administration to lose an aircrew this way waited three days to say what happened, hoping to settle the language in private first. The wait did not buy quiet. It bought a funeral the country learned about from a foreign broadcast before its own government had confirmed a thing.",
    pressures: [
      { source: "military", want: "The services want authority to escort the rescue in force, and say every hour spent asking permission makes their crew harder to find." },
      { source: "press", want: "Wire services already have the wreckage photographs and are waiting on a name to run under them, ours or theirs." },
      { source: "ally", want: "One treaty partner in the region has asked through its embassy whether this is the week its own defense commitment gets tested for real." },
      { source: "adversary", want: "Their government wants the incident closed inside a single news cycle, before either public settles on a word for what happened." },
    ],
    inaction:
      "The six-hour window is a fact of the water temperature, not a deadline either government set. Past it, this stops being a rescue and becomes a recovery, and nothing decided afterward changes what that already costs.",
    unknown:
      "Whether the order to fire came from the commander on the water or from someone above him who wanted the message sent; the answer changes who this government is actually negotiating with.",
  },
};

const theMorningTheCountryStopped: ScenarioDef = {
  id: "the-morning-the-country-stopped",
  premise: {"kind": "introduces", "what": "The stoppage is the incident: a winter-pay dispute at the depots has built over three days into closed depots and thin port crews, with the power workers voting tonight, creating the strike the week reports."},
  class: "unrest",
  severity: "serious",
  dilemmaShape: "containment",
  subject: "The morning the country stopped",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    city: "CITY-USA-washington-dc" as CityId,
    state: "DC",
    sector: "utilities",
    descriptor: "the depot square where the picket met the dawn shift",
  },
  // Gated on the heating season it is about. Every line in it says "winter pay"
  // and "winter wages", and until content could read the calendar those lines
  // were as likely to reach a player in July as in January.
  conditions: [
    { kind: "turn", atLeast: 3 },
    { kind: "calendar", months: [11, 12, 1, 2, 3] },
  ],
  weight: 1.1,
  boosts: [
    { source: "instability", factor: 1.4 },
    { source: "removalPressure", factor: 0.8 },
  ],
  particulars: [
    { label: "Depots shut", value: "17 of 20" },
    { label: "Day of the strike", value: "3" },
    { label: "Port shifts unfilled", value: "2 in 3" },
    { label: "Power workers vote", value: "Tonight" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "homeland" },
      text: "This stopped being about winter pay this morning and became about whether this government can still ask anyone to go to work. The power workers vote tonight, and if they join, you will be keeping the lights on with emergency orders before Sunday.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "labor" },
      text: "What they are asking for costs less than a week of the port standing still, and the Treasury knows it. Pay it with a picket at the gate, though, and every contract in the country reopens by spring. The money is the easy part.",
    },
    {
      speaker: { kind: "narrator" },
      text: "In the square they have stopped chanting about wages. The new signs carry your name. Two precinct captains have told headquarters that some of their own officers have family on the picket line.",
    },
  ],
  replies: [
    {
      id: "sit-with-the-committee",
      tone: "conciliatory",
      text: "Get their committee in here tonight, cameras at the door, and pay the winter wages before the vote.",
      sets: ["paid-the-winter-wages"],
      commitment: {
        kind: "position",
        cost: { treasury: -120, stability: 0.08, standing: -0.04 },
        impact: { institutional: ["legislative-capital-spent"] },
        gazetteer: { sectorLaborPressure: -0.08 },
        remembered: "The strike committee was met the same night, with the cameras watching them walk in, and the winter wages were paid before the power vote could be taken.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "labor" },
          text: "Every union in the country now knows what a picket at the gate is worth, to the dollar. I would like that written down somewhere before spring, so we are not surprised by it.",
        },
      },
    },
    {
      id: "essential-services-order",
      tone: "coercive",
      text: "Sign the order tonight. The depots run in the morning, and the law can argue with me afterward.",
      sets: ["ordered-them-back-to-work"],
      commitment: {
        kind: "position",
        cost: { stability: -0.1, standing: 0.05, treasury: -20 },
        // Governing by decree over a picket is the emergency-powers case the
        // model exists to price: it costs integrity and unity rather than money.
        impact: { institutional: ["emergency-powers-invoked", "civil-service-strained"], divisive: true },
        gazetteer: { sectorLaborPressure: 0.1 },
        remembered: "The government ordered the depots open by emergency order overnight and left the courts to work out afterward whether it had been allowed to.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "homeland" },
          text: "The depots ran. Two of the city's police captains called in sick rather than clear the gate, and they are not the two I would have guessed yesterday.",
        },
      },
    },
    {
      id: "let-the-week-decide",
      tone: "evasive",
      text: "Say nothing today. Let the vote happen, and answer whatever the country looks like on Monday.",
      sets: ["let-the-strike-run"],
      commitment: {
        kind: "position",
        cost: { stability: -0.06, standing: -0.03 },
        gazetteer: { sectorLaborPressure: 0.06 },
        remembered: "Nothing was said and nothing was offered, and the government waited to see what the country looked like once the vote had been taken without it.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "By Monday the square had found a name for the silence, and it was short enough to fit on the signs they were already carrying.",
        },
      },
    },
  ],
  context: {
    standing:
      "The stoppage began over winter pay at the depots and has built for three days, shift by shift, until most of the country's depots stand closed and port crews are down to a fraction of a normal roster. Tonight the power workers vote on whether to join it, which is the difference between a labor dispute and a government that cannot ask anyone to show up for work.",
    precedent:
      "Forty years ago a strike this size was broken with an emergency back-to-work order inside its first week, and the unions brought that order up at every bargaining table for a generation. The order worked. Nobody who signed it thought it had cost nothing.",
    pressures: [
      { source: "cabinet", want: "Labor wants the committee met tonight, before the power vote, on the theory that a government seen listening is a government the vote can still go against." },
      { source: "street", want: "The picket organizers have told reporters, on camera, that they will not move for anything less than the full back pay." },
      { source: "business", want: "Port operators are already routing cargo to other harbors and say plainly that every day the depots stay shut is a customer who does not come back." },
      { source: "military", want: "The service chiefs have not asked for a role and do not want one; being asked to hold a picket line is the one order this room agrees not to give them." },
    ],
    inaction:
      "Doing nothing tonight hands the power vote to the strike by default. If the power workers decide without hearing from the White House, the next strike starts from the assumption that it will not hear from it either.",
    unknown:
      "Whether the power workers' local is genuinely undecided or has already voted to join and is waiting for the government to answer first, so the strike can say it was provoked.",
  },
};

const theStationPastTheRoad: ScenarioDef = {
  id: "the-station-past-the-road",
  class: "hostage",
  severity: "serious",
  dilemmaShape: "retaliation",
  subject: "The station past the end of the road",
  // An armed group holding foreign aid workers for a prisoner release needs a
  // state that does not control its own back country. `fragile` did not mean
  // that: the band derivation puts the United States, the United Kingdom and
  // France in it, so this scenario staged a militia in the American interior
  // and captioned the intercept with Washington's name. `post-conflict` is the
  // archetype that actually carries the premise.
  cast: { pick: "band", archetype: "post-conflict" },
  family: { id: "arc-the-station-past-the-road", role: "opener" },
  locus: {
    site: "interior",
    ground: "counterpart",
    descriptor: "the aid station past the last graded road in the valley",
  },
  conditions: [],
  weight: 0.9,
  particulars: [
    { label: "Ours held", value: "4" },
    { label: "Days held", value: "9" },
    { label: "Asked for", value: "A prisoner release" },
    { label: "Deadline set", value: "None yet" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "foreign" },
      text: "Four of our people have been held for nine days and the price has just been named. Whatever you pay for them, you will be paying it for every one of our people abroad from now on, because this is the week that teaches everyone what our citizens are worth.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "We can reach the valley. I would not promise you we can reach it and bring four people out breathing, and the ones we would send know that better than I do.",
    },
  ],
  transmission: {
    relay: "intercept",
    attribution: "the group holding them",
    voice: "nonstate",
    text: "Their government talks about our prisoners as if they were a subject for lawyers. We will hold theirs for as long as it takes for that to change, and we are in no hurry at all.",
  },
  replies: [
    {
      id: "send-the-team-anyway",
      tone: "firm",
      text: "Authorize the rescue on the valley tonight. We hit the site, we take our four out if they can reach it, and I will answer for whatever it costs.",
      // Its own deed, not the checkpoint rescue's: two raids stamping one flag
      // told one story about two countries.
      sets: ["sent-the-team-into-the-valley"],
      commitment: {
        kind: "instrument",
        instrument: "military",
        rung: 4,
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "defense" },
          text: "The order's given, and they're loading now. Once they're off the ground I can't call them back without telling everyone in that valley we were coming.",
        },
      },
    },
    {
      id: "pay-through-the-valley",
      tone: "evasive",
      text: "Pay it quietly, through people who were never in the room, and get our four home this week.",
      sets: ["paid-the-ransom"],
      commitment: {
        kind: "position",
        cost: { treasury: -180, standing: -0.06, stability: 0.02 },
        impact: { institutional: ["legal-authority-spent"] },
        remembered: "The price was paid quietly through people the government could later say it had never dealt with, and four of its citizens came home that week.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "foreign" },
          text: "All four are home. On Sunday somebody else took two of our engineers on the far side of the same country, and named a figure before we had asked for one.",
        },
      },
    },
    {
      id: "no-ransom-say-it-plainly",
      tone: "principled",
      text: "Say it plainly and say it once: this country does not buy its people back. Then hold to it.",
      sets: ["refused-the-ransom"],
      press: "{{leader}} rules out payment for the four held in the valley, and the families hear it at the same time as everyone else.",
      commitment: {
        kind: "position",
        cost: { standing: 0.08, stability: -0.07 },
        // The four are not brought home, and the country does not agree that
        // the rule was worth them.
        impact: { human: { lives: "isolated", borneBy: "one-group", cohorts: ["professional-technical"] }, agency: "our-doing", divisive: true },
        remembered: "The government said out loud that it would not buy its own citizens back, and then had to live in front of the families with having said it.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "One of the families sat for an interview that evening. They had not been warned the sentence was coming, and the first thing they said was that nobody had called.",
        },
      },
    },
  ],
  context: {
    standing:
      "Four aid workers have been held in the valley for nine days, since the checkpoint past the last graded road stopped letting anyone through. The group holding them named its price only this morning, after more than a week of silence that the State Department had read, wrongly, as an opening.",
    precedent:
      "The last government to have citizens held for ransom in that region paid through a go-between and had its people home within a month. For the next year, every armed group in the region priced a foreigner at exactly what that payment had proved someone would spend.",
    pressures: [
      { source: "cabinet", want: "State wants a public statement of what this country will and will not pay, made before the group sets a deadline rather than after." },
      { source: "military", want: "The service that would run the rescue says it can reach the valley, will not promise four people come back breathing, and wants that on record." },
      { source: "press", want: "Reporters already have the group's own statement and are asking, on camera, whether a prisoner release is even the government's to trade." },
      { source: "ally", want: "The government whose own citizens were held in the same region last year has asked, informally, what this administration intends to do." },
    ],
    inaction:
      "Every day without an answer tells the group holding them that the government has not decided what it will pay. They will use that, and the four in the valley are the ones who wait while they do.",
    unknown:
      "Whether the group holding them can actually deliver a prisoner release even if one is offered, or is naming a price it cannot itself collect on.",
  },
};

const theRunOnTheCurrency: ScenarioDef = {
  id: "the-run-on-the-currency",
  class: "economy",
  severity: "critical",
  dilemmaShape: "containment",
  subject: "The run on the banks",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    city: "CITY-USA-washington-dc" as CityId,
    state: "DC",
    sector: "finance",
    descriptor: "the bank branch in {{city}} with the line around the corner",
  },
  // The bill for the strike. A government that bought its way out of the depot
  // square finds out in the spring what the promise cost — which is the pack's
  // one chain, and the reason `sets` exists.
  conditions: [{ kind: "flag", flag: "paid-the-winter-wages", is: true }],
  premise: {"kind": "introduces", "what": "The run is the incident: withdrawals that began Thursday at two regional banks have become lines at banks across the country, creating the panic the week reports. It is a run in whatever phase of the cycle the economy is in, and the paid wages are only the bill that precedes it."},
  weight: 1,
  // The longer the promise has stood unpaid for, the harder this pushes to the
  // front of the pool: a bill that comes due is not a lottery the player might
  // never win.
  boosts: [{ source: "flagAge", factor: 1 }],
  once: true,
  particulars: [
    { label: "Banks with lines", value: "31" },
    { label: "Pulled since Thursday", value: "$190 billion" },
    { label: "Insured limit", value: "$250,000 an account" },
    { label: "Markets open", value: "Monday, 9:30 a.m." },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "People are taking their money out of the country's banks faster than the banks can sell anything to pay them, and if the lines are still there on Monday, two of the big regional banks do not open. You have until the markets open to decide how much of the government's word you will put behind every deposit in the country.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The line outside the branch two blocks from the Treasury has been photographed from every angle since first light, and the picture that ran at noon is the one people will remember.",
    },
  ],
  replies: [
    {
      id: "spend-the-reserves-loudly",
      tone: "firm",
      text: "Guarantee every deposit, insured or not, and say it on camera today so everyone watches us stand behind the banks.",
      press: "Every deposit guaranteed as the government puts its name behind the banks",
      sets: ["defended-the-currency"],
      commitment: {
        kind: "position",
        cost: { treasury: -220, stability: 0.09, standing: 0.03 },
        impact: { institutional: ["legislative-capital-spent"] },
        domestic: {
          sectors: ["finance"],
          axes: { services: 1 },
          magnitude: "heavy",
          signature: "currency-run:reserves",
          reason: "Every deposit was guaranteed in the open and every finance-heavy state watched the Treasury put its name behind the banks.",
        },
        remembered: "Every deposit in the country was guaranteed in public and on the record, and the government let people watch it stand behind their banks.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "The lines were gone by Wednesday. The guarantee costs nothing until somebody calls on it, and the people betting against us know as well as I do that we can only say it once.",
        },
      },
    },
    {
      id: "close-the-window-quietly",
      tone: "evasive",
      text: "Cap what anyone can take out, do it overnight, and never call it what it is.",
      sets: ["capped-the-withdrawals"],
      commitment: {
        kind: "position",
        cost: { stability: -0.09, treasury: -30, standing: -0.05 },
        // Freezing what people may take out of their own accounts, and not
        // saying the word for it, is authority spent and a country divided.
        impact: { institutional: ["emergency-powers-invoked", "legal-authority-spent"], divisive: true },
        domestic: {
          sectors: ["finance"],
          axes: { services: 1 },
          magnitude: "moderate",
          signature: "currency-run:caps",
          reason: "Withdrawal caps landed overnight and finance-heavy states felt the freeze first.",
        },
        remembered: "A limit was put on what anyone could take out of their own account overnight, and the government never once used the word for what it had done.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "It was in force before the branches opened and in the foreign papers by lunch, under the one word the whole night had been spent not saying.",
        },
      },
    },
  ],
  context: {
    standing:
      "The settlement that ended the depot strike was paid before the power workers could vote. Since Thursday the withdrawals at two regional banks have turned into lines, and the lines have spread to banks that have nothing to do with either of them.",
    precedent:
      "The last time this country closed its banks by order, the doors stayed shut for a week and reopened to deposits rather than withdrawals, because the President had explained on the radio what was being done. The time before that, nobody explained, and the lines came back on Monday longer than they had been on Friday.",
    pressures: [
      { source: "cabinet", want: "The Treasury wants a figure stated before the markets open. Its view is that a vague promise is worse than a specific one, however large." },
      { source: "press", want: "The photograph of the line near the Treasury ran at midday and is already the picture the foreign wires are using for the story." },
      { source: "business", want: "Companies that keep their payroll at the two regional banks have started asking, in writing, whether Friday's paychecks will clear." },
    ],
    inaction:
      "The markets open on Monday whatever is decided tonight. Saying nothing tells them the government has not decided what it will stand behind, and a run feeds on exactly that doubt.",
    unknown:
      "Whether the lines are savers protecting themselves or funds testing how far the government will go, and how many payrolls sit in accounts above the insured limit. The regulators are still counting and will not have a number before Monday.",
  },
};

// The decree branch's reader. "The law can argue with me afterward" was the
// reply; this is afterward. Written because the pack shipped with one chain
// hanging off one of three doors, which teaches a player that paying the wages
// was the real answer and the other two were scenery — the defect
// `arc-branch-unread` exists to name.
const theCourtTheDecreeWentPast: ScenarioDef = {
  id: "the-court-the-decree-went-past",
  class: "institution",
  severity: "serious",
  dilemmaShape: "foot-in-the-door",
  subject: "The court the decree went past",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    descriptor: "the paneled courtroom where the ruling was read out to eleven empty press seats",
  },
  conditions: [{ kind: "flag", flag: "ordered-them-back-to-work", is: true, agedAtLeast: 5 }],
  weight: 1,
  boosts: [{ source: "flagAge", factor: 1 }],
  once: true,
  particulars: [
    { label: "Ruling", value: "Order struck down" },
    { label: "Panel", value: "3–0" },
    { label: "Depots running", value: "20 of 20" },
    { label: "Press seats filled", value: "2 of 11" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "justice" },
      text: "The order you signed to open the depots has been struck down, and the ruling says the government had no power to sign it. Nobody is asking you to close the depots. They are asking whether a thing this government does stops being lawful when a court says so, and you answer that today whether or not you mean to.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "If we let this one stand we have taught every bench in the country that our emergency powers are worth a hearing. If we do not, we have taught them something worse, and we will need those powers again before the year is out.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The ruling was read to a room with almost nobody in it. By evening it is the only thing anyone is discussing, and both sides are quoting the same two paragraphs of it.",
    },
  ],
  replies: [
    {
      id: "take-the-ruling",
      tone: "principled",
      text: "We take the ruling. Put the order to the {{assembly}} properly and let them give us the power or refuse it.",
      sets: ["accepted-the-ruling-on-the-decree"],
      press: "{{leader}} accepts the ruling striking down the depot order and puts the power to the {{assembly}} instead.",
      commitment: {
        kind: "position",
        cost: { standing: 0.07, stability: -0.05, treasury: -20 },
        impact: { institutional: ["legislative-capital-spent"] },
        remembered: "The government took the ruling that went against it and went to the {{assembly}} for the power it had signed for itself.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "justice" },
          text: "The bench noticed. So did everyone in this government who has ever wanted something signed quickly, and one of them has already asked me what the point of us is.",
        },
      },
    },
    {
      id: "sign-it-again",
      tone: "coercive",
      text: "Sign it again under a different power and let them strike that one down too.",
      sets: ["signed-past-the-ruling"],
      commitment: {
        kind: "position",
        cost: { stability: -0.09, standing: -0.06 },
        // Re-signing a struck-down order is the sharpest legal-authority spend
        // in the pack, and the one the country splits hardest over.
        impact: { institutional: ["legal-authority-spent", "emergency-powers-invoked"], divisive: true },
        remembered: "The government signed the same order under a second power the day its first one was struck down, and dared the bench to come back a third time.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The second order held through the week. The judge who struck down the first one has set a hearing on it for Monday and ordered the Attorney General to appear in person.",
        },
      },
    },
    {
      id: "narrow-it-until-it-fits",
      tone: "evasive",
      text: "Narrow the order until it fits inside the ruling, and let nobody call that a retreat.",
      sets: ["narrowed-the-order-to-fit"],
      commitment: {
        kind: "position",
        cost: { treasury: -40, stability: 0.03, standing: -0.03 },
        impact: { institutional: ["civil-service-strained"] },
        remembered: "The order was cut down until it fitted inside the ruling that had struck it, and the government called the result a clarification.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "justice" },
          text: "It fits, and the depots still run. What we have also done is show everyone the exact width of the gap, and the next people to want something through it will not be us.",
        },
      },
    },
  ],
  context: {
    standing:
      "The order that sent the depots back to work under decree has been in force for weeks, and the legal challenge to it was argued and decided faster than the government expected. The ruling came down this morning, in a room that had almost nobody in it to hear it read.",
    precedent:
      "The last President to lose an emergency order this cleanly signed it again under a different statute within the week, and the second order stood. Two years later a court used the first ruling to strike down an order that had nothing to do with the first one.",
    pressures: [
      { source: "cabinet", want: "Justice wants the ruling accepted in full and on the record before the evening bulletins decide the story is defiance rather than compliance." },
      { source: "legislature", want: "Several members have already asked, publicly, whether the {{assembly}} will finally get the vote on emergency powers that the order skipped." },
      { source: "court", want: "The court has said nothing beyond the ruling. The judge who wrote it has held two cabinet officials in contempt before." },
      { source: "press", want: "The cable panels have the ruling on screen and have asked the White House counsel's office for a response it has not yet given." },
    ],
    inaction:
      "The depots keep running whether or not the order is defended, since nobody has moved to reopen them under the old signature. What changes with delay is only whether the government is seen deciding, or seen waiting to be told.",
    unknown:
      "Whether the {{assembly}} would actually grant the power if asked properly, or whether putting it to a vote only hands the opposition a chance to refuse it in public.",
  },
};

// The do-nothing branch's reader. A government that stayed out of the room
// discovers the room went on without it, and that the settlement everybody
// signed assumes money nobody asked the state for. Written as an `exposure`
// deliberately: the pack had none, and the money here is not really in
// question — only whether the government is seen paying it.
const theDealTheGovernmentWasNotIn: ScenarioDef = {
  id: "the-deal-the-government-was-not-in",
  premise: {"kind": "universal", "reason": "The let-the-strike-run flag (aged 4 or more) is the state it presumes: the government stayed out of a strike, and a wage top-up it was never asked about is the bill that settlement leaves. A settlement top-up is a budget question that deals the same in a boom or a slump."},
  class: "economy",
  severity: "routine",
  dilemmaShape: "exposure",
  subject: "The deal the government was not in",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    city: "CITY-USA-washington-dc" as CityId,
    state: "DC",
    sector: "utilities",
    descriptor: "the union hall's back office in {{city}} where the settlement was initialed at four",
  },
  conditions: [{ kind: "flag", flag: "let-the-strike-run", is: true, agedAtLeast: 4 }],
  weight: 1,
  boosts: [{ source: "flagAge", factor: 1 }],
  once: true,
  particulars: [
    { label: "Settled without us", value: "Both sides" },
    { label: "Initialed at", value: "4 a.m." },
    { label: "Federal top-up assumed", value: "$2.4B a year" },
    { label: "Pickets back if refused", value: "Within 2 weeks" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "The strike is over and we did not end it. They settled between themselves at four this morning, and the deal only balances because it assumes a top-up from us that nobody in this building was asked about. We are going to pay it. What you decide is whether the country watches us pay it.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "labor" },
      text: "Refusing costs more than paying and puts the pickets back on the gate within two weeks. Everyone in this room knows that, which is the whole difficulty: the money was never the decision.",
    },
  ],
  replies: [
    {
      id: "sign-it-as-a-party",
      tone: "firm",
      text: "Put our name on the settlement as a party to it, and take the credit for ending a strike we sat out.",
      sets: ["signed-the-settlement-we-missed"],
      commitment: {
        kind: "position",
        cost: { treasury: -70, standing: 0.05, stability: 0.03 },
        impact: { institutional: ["legislative-capital-spent"] },
        domestic: {
          sectors: ["utilities"],
          magnitude: "moderate",
          signature: "settlement-top-up:utilities",
          reason: "Washington signed a utilities settlement it had sat out, and utility states watched who paid.",
        },
        remembered: "The government signed a settlement it had no part in negotiating and stood at the front of the photograph announcing it.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "labor" },
          text: "Both sides let us stand there and neither corrected the story. They also both now know we will sign what we are handed, and they negotiate again inside the year.",
        },
      },
    },
    {
      id: "pay-it-and-say-nothing",
      tone: "evasive",
      text: "Pay it out of an existing account and don't give anyone a signature to find.",
      sets: ["paid-the-settlement-quietly"],
      commitment: {
        kind: "position",
        cost: { treasury: -70, standing: -0.04, stability: 0.02 },
        impact: { institutional: ["civil-service-strained"] },
        domestic: {
          sectors: ["utilities"],
          magnitude: "light",
          signature: "settlement-top-up:utilities",
          reason: "The top-up was paid out of an existing account with no name on it, and utility states still noticed the money.",
        },
        remembered: "The top-up was paid out of an existing account with no announcement, and the settlement kept the government's money and not its name.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "It went through on Tuesday and nobody asked. The union's own bulletin has already explained to its members exactly who paid for their raise, and we are not mentioned.",
        },
      },
    },
    {
      id: "pay-it-under-protest",
      tone: "principled",
      text: "Pay it, and say plainly that we were not asked and will not be committed like this again.",
      sets: ["paid-the-settlement-under-protest"],
      commitment: {
        kind: "position",
        cost: { treasury: -70, standing: 0.03, stability: -0.05 },
        impact: { institutional: ["legislative-capital-spent"], divisive: true },
        domestic: {
          sectors: ["utilities"],
          magnitude: "moderate",
          signature: "settlement-top-up:utilities",
          reason: "The government paid under protest and utility states heard both the money and the complaint.",
        },
        remembered: "The government paid a bill it had not agreed to and said out loud that it had not been asked, which nobody who signed the deal had expected it to do.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The complaint ran in full on the evening news, straight after the union president thanking the workers who had held out. He did not mention Washington.",
        },
      },
    },
  ],
  context: {
    standing:
      "The strike the government chose not to enter ran several more days after that decision and ended on its own, between the two sides, in the small hours of the morning. The settlement they reached only balances if the federal government pays a wage top-up that nobody in this building agreed to.",
    precedent:
      "A previous government that stayed out of a settlement like this was written out of the story entirely — credited with neither the peace nor its cost. The unions that negotiated it remembered exactly who had not been in the room, and negotiated the next round accordingly.",
    pressures: [
      { source: "cabinet", want: "Finance has confirmed the top-up will be paid regardless of what is announced, and wants that settled before the politics are decided." },
      { source: "business", want: "The employers' side wants the government's name on the settlement, on the theory that a state-backed deal is harder for either union to walk away from later." },
      { source: "street", want: "The union that negotiated the top-up has already told its members who is paying for it, in a bulletin that went out before this room finished meeting." },
      { source: "press", want: "Reporters are asking why the strike ended without a single government statement, and are treating the silence itself as the story." },
    ],
    inaction:
      "The money goes out of an existing account whether or not the government says a word about it; the only thing decided here is whether the country watches it happen or reads about it later, from someone else.",
    unknown:
      "Whether either side would have settled for less with the government in the room, or whether the top-up figure was set precisely because both sides expected Washington to pay it without being asked.",
  },
};

const theMemoWithTwoDates: ScenarioDef = {
  id: "the-memo-with-two-dates",
  class: "scandal",
  severity: "serious",
  dilemmaShape: "disclosure",
  subject: "The memo with two dates on it",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    descriptor: "the West Wing press room where the second copy was handed out",
  },
  conditions: [{ kind: "turn", atLeast: 4 }],
  weight: 0.95,
  particulars: [
    { label: "Copies in circulation", value: "2" },
    { label: "Days apart", value: "11" },
    { label: "Outlets holding both", value: "2" },
    { label: "Oversight request", value: "Both drafts, by letter" },
  ],
  opening: [
    {
      speaker: { kind: "narrator" },
      text: "Two versions of the same memo are in circulation, drafted eleven days apart, and one of them makes this White House a liar. By the evening news the question stops being what happened and becomes what the President knew.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "justice" },
      text: "I can have investigators find out who handed it over. I want you to understand what you are asking for when you ask me that, and what it looks like if anyone finds out we went looking.",
    },
  ],
  replies: [
    {
      id: "read-the-whole-memo-out",
      tone: "principled",
      text: "Publish both versions in full this afternoon, and take whatever comes of it standing up.",
      sets: ["published-the-memo"],
      press: "{{leader}} publishes both drafts in full and answers for the difference between them the same afternoon.",
      commitment: {
        kind: "position",
        cost: { standing: 0.06, stability: -0.08, treasury: -20 },
        impact: { institutional: ["legal-authority-spent"], divisive: true },
        remembered: "Both drafts were published in full on the day they surfaced, and the government answered for the difference between them rather than for the leak.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "justice" },
          text: "It held, and I did not think it would. The official who wrote the later draft resigned at six without being asked to, and would not say why on the way out.",
        },
      },
    },
    {
      id: "hunt-the-photographer",
      tone: "coercive",
      text: "Find whoever handed this out. Everything else waits until I know that name.",
      sets: ["hunted-the-leak"],
      commitment: {
        kind: "position",
        cost: { stability: -0.09, standing: -0.04, treasury: -30 },
        // Hunting the leaker rather than answering the memo burns the source
        // and strains the service asked to do the hunting.
        impact: { institutional: ["intelligence-source-burned", "civil-service-strained"], divisive: true },
        remembered: "The government went looking for whoever had handed the memo over, and answered the question about the memo itself only once it had a name.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "justice" },
          text: "I have the name. It belongs to someone who has worked in this building for nineteen years, and half the floor already knows we went looking.",
        },
      },
    },
    {
      id: "let-it-sit-a-day",
      tone: "evasive",
      text: "Say we are reviewing it, say nothing else, and see what they actually have tomorrow.",
      sets: ["stalled-on-the-memo"],
      commitment: {
        kind: "position",
        cost: { standing: -0.05, stability: -0.02 },
        impact: { institutional: ["civil-service-strained"] },
        remembered: "The government said it was reviewing the matter, said nothing further for a day, and waited to learn how much the other side actually held.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "There was a third draft. It led the evening news, with the promise of a review read out underneath it in the government's own words.",
        },
      },
    },
  ],
  context: {
    standing:
      "Two versions of the same memo have been circulating for most of the day, drafted eleven days apart, and the later one contradicts a statement this government has already made in public. Nobody outside this room yet knows which draft is the one that matters.",
    precedent:
      "Two dated drafts of one document have sunk an administration before. It tried to explain the gap before publishing either draft, the explanation became the story, and the memos themselves were never read in full on any newscast that mattered.",
    pressures: [
      { source: "cabinet", want: "Justice wants the discrepancy explained before it is confirmed, on the theory that context offered first is context that actually gets reported." },
      { source: "press", want: "Two outlets already have copies of both drafts and are comparing them line by line on air, without waiting for the government to comment." },
      { source: "legislature", want: "An oversight committee has asked, in writing, for both drafts and a timeline of who saw which version and when." },
      { source: "street", want: "There is no organized public reaction yet, only enough private chatter that two of the cabinet's own staff have already been asked about it by name." },
    ],
    inaction:
      "Saying nothing for another day does not make the second draft disappear. It gives whoever leaked it a full cycle to explain the discrepancy first, in their own words, to a reporter who did not get those words from this government.",
    unknown:
      "Who wrote the second draft, and why it was never circulated inside the building the way the first one was, before either was ever meant to leave it.",
  },
};

// The pack's one routine week, and the register bar for every routine week
// generated after it. Nothing is on fire: the stakes are money, careers, and
// two people the player needs who cannot both win. It exists because a corpus
// that is all ultimatums has no quiet weeks to make the loud ones loud.
const theLineItemWithTwoNames: ScenarioDef = {
  id: "the-line-item-with-two-names",
  premise: {"kind": "universal", "reason": "Two cabinet secretaries writing the same budget money into next year is an accounting collision the Treasury finds at reconciliation; it deals the same in any phase of the cycle, and the finance-competence gate only means someone competent would catch it."},
  class: "economy",
  severity: "routine",
  dilemmaShape: "allocation",
  subject: "The line item with two names on it",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    descriptor: "the corridor between the two departments that share a wall and an accountant",
  },
  // Gated on the seat, not only on the clock: the double-booking reaches the
  // President as a choice because the Treasury chair was good enough to find it
  // in the shared ledger before either program had spent it.
  conditions: [
    { kind: "turn", atLeast: 2 },
    { kind: "cabinetAttribute", roleHint: "finance", attribute: "competence", atLeast: 0.6 },
  ],
  weight: 1,
  particulars: [
    { label: "Clinics promised", value: "14" },
    { label: "Patrol boats past refit", value: "9" },
    { label: "What the money covers", value: "Half of either" },
    { label: "Promised", value: "On a stage, in the north" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "One budget, two programs, and it pays for half of either. Fourteen clinics in the north or nine patrol boats that are past the date they should have been refitted. The Secretary of the Interior and I have both written it into next year as though it were already ours, and whichever one you cut walks out of here carrying a grudge with your name on it.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "interior" },
      text: "The clinics were promised in the campaign, in the north, on a stage, with a date on them. The boats were promised in a memo. I know which one people will remember us breaking, and so does the Secretary of the Treasury, which is why this is on your desk instead of being argued out between us.",
    },
  ],
  replies: [
    {
      id: "fund-the-clinics",
      tone: "principled",
      text: "The clinics were promised out loud, so the clinics get the money. I'll tell the admiral myself.",
      sets: ["funded-the-clinics-over-the-fleet"],
      commitment: {
        kind: "position",
        cost: { treasury: -80, stability: 0.04, militaryReadiness: -0.03 },
        impact: { institutional: ["legislative-capital-spent"] },
        remembered: "All fourteen clinics were funded because they had been promised on a stage, and the nine patrol boats were told to last another year.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "The fleet took it quietly, which worried me more than shouting would have. Their deputy resigned in the afternoon and the coastal papers had the letter before I did.",
        },
      },
    },
    {
      id: "fund-the-fleet",
      tone: "firm",
      text: "The coast doesn't care what was said on a stage. Fund the fleet, and the clinics wait a year.",
      sets: ["funded-the-fleet-over-the-clinics"],
      commitment: {
        kind: "position",
        cost: { treasury: -80, militaryReadiness: 0.05, standing: -0.04 },
        // The clinics that were promised do not open, and the region told to
        // wait is one region rather than the whole country.
        impact: { human: { displaced: "local", borneBy: "one-region" }, divisive: true },
        remembered: "The fleet got the money and the north got a letter, and the promise the government broke was the one it had made out loud.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "In the north they have left the stage standing in the square where the promise was made. Somebody has hung the campaign banner back on it.",
        },
      },
    },
    {
      id: "split-the-line",
      tone: "evasive",
      text: "Split it. Seven clinics and four boats, neither program whole, and both of them equally unhappy with me.",
      sets: ["split-the-budget-line"],
      commitment: {
        kind: "position",
        cost: { treasury: -80, stability: -0.02, militaryReadiness: 0.01 },
        impact: { institutional: ["civil-service-strained"] },
        remembered: "The line was cut in half so that nobody had been refused, and both programs were left owning half of what they needed.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "Both of them thanked you, which should tell you something. Neither program can begin on half, so the money sits in the account until one of them comes back for the rest.",
        },
      },
    },
  ],
  context: {
    standing:
      "The shortfall in the shared account has been building since the two secretaries both wrote next year's budget as though the same money were already theirs, and it went unnoticed until the Treasury reconciled the ledger this week and found it pays for only one of the two programs.",
    precedent:
      "Splitting a double-booked line item evenly, so as to avoid the appearance of a favorite, has been tried before and failed the same way each time. Both programs limped through the following year unable to finish anything, and the government answered for both failures instead of one hard choice.",
    pressures: [
      { source: "cabinet", want: "The Secretary of the Interior wants the clinics funded in full, and says the promise was made on a stage, in front of cameras." },
      { source: "military", want: "The fleet's own leadership has not lobbied publicly, which the Secretary of the Treasury reads as confidence, and worries is the wrong read." },
      { source: "legislature", want: "Two members from the coastal districts have asked, separately, whether the refit schedule will hold if the money goes north instead." },
      { source: "business", want: "Contractors on both projects have started calling to ask which one is proceeding, because neither can be staffed on the assumption of half funding." },
    ],
    inaction:
      "Neither program can begin on half its money, so delay costs both of them roughly what it would cost to fund one outright — the only thing decided by waiting is who is told to wait, and for how long.",
    unknown:
      "Whether the Secretary of the Interior's promise on the stage was ever cleared with the Treasury, or was made in the moment and left for this budget to discover.",
  },
};


// --- The lease: the pack's first family ------------------------------------
//
// Three scenarios, one arc, and the first content in the game to use a
// scenario family. The mechanism shipped proved by test and by nothing else:
// families, their pinning and their two audit rules all existed and no
// scenario had ever declared one, so what a family is *for* had never been
// demonstrated in writing.
//
// This is the demonstration, and the cast is the argument. The opener casts
// `closest` — the firmest friend the president has this week — which is a
// ranking that moves. Written without a family, the second beat would re-rank
// months later and arrive about whichever country happened to top the list
// that week: the room would ask the President about a crowd at the gate of a
// base in a country that had never served notice on anything. The family pins
// the counterpart at the opener and hands the same country to both later
// beats, which is the whole of what a family is.
//
// It is also written so the pinning is legible rather than merely correct. All
// three beats name the same ground, the same gate and the same lease, and the
// close reads back the opener's decision — so a player who has been through
// the arc can tell that the game remembered, which is the part a test cannot
// assert.

const theNoticeOnTheLease: ScenarioDef = {
  id: "the-notice-on-the-lease",
  class: "foreign-crisis",
  severity: "serious",
  dilemmaShape: "foot-in-the-door",
  subject: "The notice on the lease",
  cast: { pick: "closest" },
  family: { id: "the-ground-they-lease-to-us", role: "opener" },
  locus: {
    site: "coast",
    ground: "counterpart",
    descriptor: "the airfield and deep-water berth we have rented since before anyone in the room was born",
  },
  conditions: [{ kind: "relationship", field: "trust", atLeast: 0.3 }, { kind: "geography", field: "coastal", is: true, of: "counterpart" }],
  weight: 0.85,
  once: true,
  particulars: [
    { label: "Notice period", value: "18 months" },
    { label: "Our people there", value: "4,100" },
    { label: "Annual rent", value: "$310 million" },
    { label: "Other hosts asking", value: "2" },
  ],
  opening: [
    {
      speaker: { kind: "narrator" },
      text: "The friendliest government we have has told us, in writing and through the proper channel, that it wants its airfield back. Nothing about the letter is hostile. That is the part the room is having trouble with.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "Eighteen months sounds like time. It is not. Everything we fly out of there has to go somewhere, and the only somewhere is nine hundred miles further back, which changes what we can reach and how fast.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "foreign" },
      text: "Their prime minister did not want to send this. Their coalition made them. If you answer the letter, you are answering the coalition, and they read everything you say as either respect or a lecture.",
    },
  ],
  transmission: {
    relay: "cable",
    attribution: "the host government's foreign ministry",
    voice: "state",
    text: "We are not asking you to leave. We are asking you to negotiate as though we were a country and not a location. We would rather do that now, with eighteen months in hand, than in a year with none.",
  },
  replies: [
    {
      id: "reopen-the-terms",
      tone: "conciliatory",
      text: "Tell them we will reopen the whole agreement, rent and jurisdiction both, and that our team flies out this month.",
      sets: ["lease-talks-opened"],
      commitment: {
        kind: "position",
        cost: { standing: 0.03, treasury: -40 },
        remembered: "The administration agreed to renegotiate the basing agreement from the top rather than defend the one it had.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "defense" },
          text: "Understood. I would only say that everyone else who rents us ground now knows the terms are openable, and three of them will write to us inside the year.",
        },
      },
    },
    {
      id: "hold-the-agreement",
      tone: "firm",
      text: "The agreement runs to its term. We will discuss what follows it, and not one day earlier.",
      sets: ["lease-held-to-term"],
      press: "{{leader}} declines to reopen the basing agreement, and says the treaty will be honored as written.",
      commitment: {
        kind: "position",
        cost: { standing: 0.05, stability: -0.02 },
        impact: { institutional: ["alliance-credit-spent"] },
        remembered: "The administration answered a friendly request by pointing at the text, and the friendly government read that answer out to its own legislators.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "foreign" },
          text: "That will hold. It will hold the way a lid holds, and I would like it on the record that their opposition has just been handed its campaign.",
        },
      },
    },
    {
      id: "pay-for-the-quiet",
      tone: "evasive",
      text: "Raise the rent, quietly, and do not call it a renegotiation in front of anybody.",
      sets: ["lease-bought-quiet"],
      commitment: {
        kind: "position",
        cost: { treasury: -260, standing: -0.04 },
        impact: { institutional: ["legal-authority-spent"] },
        remembered: "The rent went up and the agreement did not change, and both governments described the week as routine.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The figure is in their budget office tonight, and budget offices talk. There it reads as the price of not being taken seriously, and here as a line item nobody can explain.",
        },
      },
    },
  ],
  context: {
    standing:
      "The host government served formal notice this morning that it intends to renegotiate the agreement under which we have held the airfield and the deep-water berth for two generations. The notice period is eighteen months and the letter is courteous throughout.",
    precedent:
      "The last ally to open a basing agreement did it the same way, politely and early, and got most of what it asked for. The one before that waited until an election made it impossible to be polite, and both governments spent four years unable to speak about anything else.",
    pressures: [
      { source: "military", want: "The service that flies out of the airfield wants a decision early enough to plan a move it does not want to make." },
      { source: "cabinet", want: "State wants the answer written as though the host were a partner rather than a landlord, whatever the answer turns out to be." },
      { source: "ally", want: "Two other governments that rent us ground have asked, informally, what we intend to say — and will read the answer as their own terms." },
    ],
    inaction:
      "Silence runs the eighteen months down without changing a word of the agreement, and hands the host's own opposition the argument that talking to us achieves nothing.",
    unknown:
      "Whether the coalition that forced the letter can survive long enough to sign whatever it asks for.",
  },
};

const theCrowdAtTheGate: ScenarioDef = {
  id: "the-crowd-at-the-gate",
  premise: {"kind": "introduces", "what": "The blockade is the incident: six thousand people sit across the only road into the allied airfield and turn the fuel convoy back, creating the standing protest the week reports."},
  class: "unrest",
  severity: "serious",
  dilemmaShape: "containment",
  subject: "The crowd at the gate",
  // Binds to the country the family opened against, not to whoever tops the
  // friendship ranking this week. That is the pin doing its work: without it,
  // this is a crowd at a gate in a country that never wrote to us.
  cast: { pick: "closest" },
  family: { id: "the-ground-they-lease-to-us", role: "beat" },
  locus: {
    site: "coast",
    ground: "counterpart",
    descriptor: "the main gate of the airfield, where the road narrows and the fence turns",
  },
  conditions: [{ kind: "flag", flag: "lease-talks-opened", is: false }, { kind: "geography", field: "coastal", is: true, of: "counterpart" }],
  weight: 0.8,
  once: true,
  particulars: [
    { label: "At the gate", value: "6,000" },
    { label: "Held since", value: "Tuesday" },
    { label: "Host police on site", value: "None" },
    { label: "Fuel on hand", value: "Until Friday" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "Six thousand people are sitting across the only road into the airfield and the host government has not sent a single officer to move them. Our fuel convoy turned around this morning. By Friday we are flying on what is already in the tanks.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "interior" },
      text: "Our people are behind the fence and the fence is ours. The road is theirs. Anything we do past that line, we are doing in somebody else's country to somebody else's citizens, and there is no version of that which stays small.",
    },
  ],
  transmission: {
    relay: "cable",
    attribution: "the host government's interior ministry",
    voice: "state",
    text: "The assembly at the airfield gate is lawful under our constitution. Our police will act when a court instructs them to. Until then we ask that your personnel remain inside the perimeter, and that nothing is done on our road that we would have to answer for.",
  },
  replies: [
    {
      id: "wait-them-out",
      tone: "conciliatory",
      text: "Nobody goes past the fence. We fly what we can, we wait, and we let their government decide when its own road reopens.",
      sets: ["gate-waited-out"],
      commitment: {
        kind: "position",
        cost: { militaryReadiness: -0.06, standing: 0.02 },
        remembered: "The government sat behind its own fence for as long as it took and let the host answer for its own road.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The wing is rationing what is in the tanks. The host's attorney general has asked a court to clear the road, and nobody in either capital will say how long a court takes.",
        },
      },
    },
    {
      id: "press-the-host",
      tone: "firm",
      text: "Bring our ambassador home. Say why, publicly: they will clear their own road, or we will stop pretending this is a partnership.",
      sets: ["gate-pressed-the-host"],
      commitment: {
        kind: "instrument",
        instrument: "diplomatic",
        rung: 3,
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "Our ambassador is on tonight's flight. Their foreign minister was told why before the statement went out, and asked for one word changed: consultations, not recalled. The answer was no.",
        },
      },
    },
    {
      id: "open-the-road-ourselves",
      tone: "coercive",
      text: "Our convoy goes through tomorrow with our own security on it. We are not asking anyone's permission to resupply our own people.",
      sets: ["gate-forced-the-road"],
      commitment: {
        kind: "position",
        cost: { standing: -0.12, stability: -0.05, militaryReadiness: 0.03 },
        impact: {
          human: { lives: "isolated", borneBy: "one-group", cohorts: ["frontline-services"] },
          agency: "our-doing",
          divisive: true,
          institutional: ["alliance-credit-spent"],
        },
        remembered: "Our own security drove our own convoy through a crowd of the host country's citizens, on the host country's road.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "foreign" },
          text: "The convoy is through. Their ambassador has been recalled for consultations, which is the polite version, and their parliament sits on Monday.",
        },
      },
    },
  ],
  context: {
    standing:
      "The crowd went up on Tuesday and has not moved since. The host government did not organize it and has sent no police to clear it, and its government has told reporters the protest is lawful.",
    precedent:
      "A blockade of this kind at an allied base has twice ended the same way. The host waited for its own courts, and the tenant discovered how much of its posture depended on a road it did not own.",
    pressures: [
      { source: "military", want: "The wing at the airfield wants fuel by Friday and does not much mind how it arrives." },
      { source: "street", want: "Families of our people at the base are calling their own members of Congress, and two of them have been on television." },
      { source: "cabinet", want: "State wants nothing to cross the fence line, on the grounds that everything after that is somebody else's sovereignty." },
    ],
    inaction:
      "Every day the road stays shut is a day the airfield is a place we keep aircraft rather than a place we can use them, and the host government learns exactly how little it costs to let that happen.",
    unknown:
      "Whether the host government is permitting the blockade or has simply lost the argument about it inside its own cabinet.",
  },
};

const theTermsTheyFinallySigned: ScenarioDef = {
  id: "the-terms-they-finally-signed",
  class: "foreign-crisis",
  severity: "critical",
  dilemmaShape: "allocation",
  subject: "The terms they finally signed",
  cast: { pick: "closest" },
  family: { id: "the-ground-they-lease-to-us", role: "close" },
  locus: {
    site: "capital",
    ground: "counterpart",
    descriptor: "the room where the agreement was signed the first time, with the same table still in it",
  },
  conditions: [
    // Six weeks after the notice was answered, and only if the talks it asked
    // for were never opened. The age is read off the opener's own marker.
    { kind: "flag", flag: scenarioFiredFlag("the-notice-on-the-lease"), is: true, agedAtLeast: 6 },
    { kind: "flag", flag: "lease-talks-opened", is: false },
    // The one week in the pack that reads the chair the player actually
    // seated. Whether to spend three years and four billion moving a posture
    // is a judgment the Secretary of Defense is either equipped to give or is
    // not, and the bound is loose because the question is competence at all
    // rather than competence above some line.
    { kind: "cabinetAttribute", roleHint: "defense", attribute: "competence", atLeast: 0.2 },
  ],
  weight: 0.9,
  once: true,
  particulars: [
    { label: "On the table", value: "2 texts" },
    { label: "Time left on the notice", value: "4 months" },
    { label: "Cost to move", value: "$4.1 billion" },
    { label: "Reach lost in the move", value: "About half" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "foreign" },
      text: "They have put two texts in front of us and they will sign either one this week. The first keeps the airfield and gives their courts jurisdiction over our people off base. The second is a departure schedule with our name already typed into it.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "Four billion and three years to move the aircraft, and for those three years we cannot reach half of what we are committed to reaching. I am not telling you which text to sign. I am telling you the second one is not free because it is written politely.",
    },
  ],
  transmission: {
    relay: "communique",
    attribution: "the host government's prime minister",
    voice: "state",
    text: "Either text is acceptable to us, and we will not pretend one is a favor. What we will not do is spend another eighteen months finding out which one you meant.",
  },
  replies: [
    {
      id: "sign-for-the-ground",
      resolves: "held",
      tone: "conciliatory",
      text: "Sign the first text. We keep the airfield and their courts get our people off base, and I will explain that at home myself.",
      sets: ["lease-kept-on-their-terms"],
      commitment: {
        kind: "position",
        cost: { standing: -0.06, stability: -0.04, militaryReadiness: 0.05 },
        impact: { institutional: ["alliance-credit-spent"], divisive: true },
        remembered: "The administration kept the airfield and accepted that a service member charged off base would answer to the host country's courts.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The clause was six lines long. It took four days to reach the front pages at home and has not left them since.",
        },
      },
    },
    {
      id: "take-the-schedule",
      resolves: "lost",
      tone: "principled",
      text: "Sign the second. We leave on the schedule, we leave properly, and we do not put one of our own in a foreign courtroom to keep a runway.",
      sets: ["lease-ended-on-schedule"],
      press: "{{leader}} confirms we will leave the airfield on an agreed schedule rather than accept the jurisdiction clause.",
      commitment: {
        kind: "position",
        cost: { treasury: -1400, militaryReadiness: -0.14, standing: 0.04 },
        remembered: "The administration chose to give up the ground rather than put its own people under another country's courts, and said so in those words.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "defense" },
          text: "Then I will start the move. Three years, and the first eighteen months of it we are guessing about a part of the world we used to sit in.",
        },
      },
    },
    {
      id: "ask-for-a-third-text",
      resolves: "lost",
      tone: "evasive",
      text: "Neither. Go back and ask for a third text — jurisdiction shared, review in five years — and tell them we are not signing this week.",
      sets: ["lease-asked-for-more-time"],
      commitment: {
        kind: "position",
        cost: { standing: -0.09, treasury: -60 },
        impact: { institutional: ["legal-authority-spent"] },
        remembered: "Offered two texts and a deadline, the administration asked for a third and a longer clock, having already been told there would be neither.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "foreign" },
          text: "They have declined, in one sentence, and released the sentence. The first text comes off the table when the four months run out, and nobody here expects a third.",
        },
      },
    },
  ],
  context: {
    standing:
      "Four months remain on the notice the host government served, and it has stopped asking what we want. Two finished texts are on the table and their lawmakers have the votes for either.",
    precedent:
      "Every basing agreement that has ended in the last forty years ended on a jurisdiction clause rather than on rent. The tenant that paid more kept nothing; the two that accepted local courts are still there.",
    pressures: [
      { source: "military", want: "The department wants a decision this week either way, because a three-year move that starts late is a five-year move." },
      { source: "street", want: "Two of the family associations have already said publicly that nobody in our uniform should stand in a foreign court." },
      { source: "cabinet", want: "State wants the first text and wants the President, not the department, to be the one who explains it." },
      { source: "ally", want: "The other governments that rent us ground are waiting to see whether jurisdiction is a thing this administration will trade for a runway." },
    ],
    inaction:
      "Signing nothing runs the four months out and takes the first text off the table, which leaves the departure schedule as the only text anyone is still offering.",
    unknown:
      "Whether the host's own lawmakers would actually ratify the first text, or have agreed to offer it precisely because they expect us to refuse.",
  },
};

// The pack's first bound week: a decision about a place the board chose rather
// than a place the writer did. Nothing in the prose names a state, a governor or
// a time of year, and every one of those reaches the player as a fact — the fire
// that is actually burning worst, the person actually in that office, the season
// it actually is. Withdrawn when the fire ends, because a document asking what to
// do about a fire that is out is worse than no document at all.
const theRidgeAboveTheReservoir: ScenarioDef = {
  id: "the-ridge-above-the-reservoir",
  class: "disaster",
  severity: "serious",
  dilemmaShape: "allocation",
  subject: "The ridge above the reservoir",
  cast: { pick: "stricken" },
  locus: {
    site: "interior",
    ground: "home",
    // The place follows the fire. An authored state here would be a second
    // answer to the same question, and the wrong one nine times in ten.
    bind: "condition",
    descriptor: "the fire camp on the ridge road above the reservoir that supplies the valley",
  },
  conditions: [{ kind: "conditionActive", condition: "wildfire", atLeast: 0.3 }],
  weight: 1.1,
  boosts: [{ source: "conditionSeverity", factor: 1.4, kind: "wildfire" }],
  particulars: [
    { label: "On the line", value: "2,900 crew" },
    { label: "Reservoir serves", value: "410,000 people" },
    { label: "Federal share asked", value: "75%" },
    { label: "State fund runs out", value: "Friday" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "interior" },
      text: "The fire is above the reservoir that supplies the valley, and the governor of {{state}} has asked for the federal share twice this week, in writing, at seventy-five percent. The state has the crews in the field already and is paying them out of a fund that runs out on Friday.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The ridge road is the last line anybody can hold with the equipment on the ground, and the plan the state filed at the start of the year assumed a fund it has now spent.",
    },
  ],
  replies: [
    {
      id: "sign-the-federal-share",
      tone: "firm",
      text: "Sign the seventy-five percent tonight. The crews are already on the line and they are not going to be paid by an argument about who files what.",
      sets: ["carried-the-federal-share"],
      press: "{{leader}} signs the federal share for the fire above the reservoir in {{state}} at the level the state asked for.",
      commitment: {
        kind: "position",
        cost: { treasury: -2200, standing: 0.02 },
        impact: {
          financial: { scale: "supplemental", horizon: "one-off" },
          human: { lives: "isolated", displaced: "regional", borneBy: "one-region" },
          agency: "on-our-watch",
        },
        remembered: "The administration signed the federal share at the level the state asked for, the week the crews would otherwise have stopped being paid.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "interior" },
          text: "The crews were paid federal rates and the ridge road held. Four other states have already asked what the standard is now, and I do not have an answer for them that is not this week.",
        },
      },
    },
    {
      id: "hold-them-to-the-filed-plan",
      tone: "principled",
      text: "Hold them to the plan they filed. Federal money follows the plan, and the plan says the state carries the first half.",
      sets: ["held-the-state-to-its-plan"],
      commitment: {
        kind: "position",
        cost: { treasury: -600, stability: -0.04, standing: -0.03 },
        impact: {
          financial: { scale: "discretionary", horizon: "one-off" },
          human: { lives: "dozens", displaced: "regional", borneBy: "one-region" },
          agency: "on-our-watch",
          divisive: true,
        },
        remembered: "The administration held the state to the cost-share it had filed rather than meeting the number it asked for while the fire was still burning.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The ridge road held for two more days and then it did not. The filed plan was the first document anybody asked to see, and it was read out on air beside the reservoir.",
        },
      },
    },
    {
      id: "federalize-the-response",
      tone: "coercive",
      text: "Take the response federal. If we are paying for it we are running it, and the incident commander answers to this building.",
      sets: ["federalized-a-state-response"],
      commitment: {
        kind: "position",
        cost: { treasury: -3400, standing: 0.04, stability: -0.05 },
        impact: {
          financial: { scale: "supplemental", horizon: "one-off" },
          human: { lives: "isolated", displaced: "regional", borneBy: "one-region" },
          institutional: ["legal-authority-spent"],
          agency: "our-doing",
          divisive: true,
        },
        remembered: "The administration took the fire response federal and put the incident commander under the White House rather than the state.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "interior" },
          text: "We are running it and we are being blamed for it, which are the same sentence now. Two governors who are not in this fire have written to say they will refuse the same offer.",
        },
      },
    },
  ],
  context: {
    standing:
      "A fire has been running above the reservoir that supplies the valley for nine days, and the state has crews in the field paid out of a fund that runs out at the end of the week. The governor has asked twice, in writing, for the federal government to carry three quarters of the cost, which is more than the plan the state filed says it would ask for.",
    precedent:
      "The last administration to meet a cost-share request above the filed plan met four more inside the year, each citing the first. The one before it refused, and spent the rest of the year explaining a line of burned ridge on every newscast that would carry it.",
    pressures: [
      { source: "cabinet", want: "Interior wants the share signed while the crews are still on the line, on the grounds that a fund running out on Friday is not a negotiating position." },
      { source: "press", want: "Two desks are already at the reservoir and have the filed plan, and they are reading the cost-share line against the request on air." },
      { source: "legislature", want: "The state's own delegation has asked for the full share in a joint letter, and members from four other states have asked what the standard would then be." },
      { source: "street", want: "The valley is being told to be ready to leave and has been told that twice before this year without having to." },
    ],
    inaction:
      "Another day without an answer is the fund running out with the crews still on the ridge. The state will pull them back to what it can pay for, which is the road below the reservoir rather than the ridge above it.",
    unknown:
      "Whether the ridge road holds at all, with or without the money, and whether the reservoir would have to be taken out of service either way.",
  },
};

// The pack's first week that reads what the President ran on rather than what
// they have done. It is the same allocation argument the line item is, put to a
// government whose own platform already answered it in public — which is the
// most reliably interesting week a platform produces.
const theSentenceInTheStumpSpeech: ScenarioDef = {
  id: "the-sentence-in-the-stump-speech",
  premise: {"kind": "universal", "reason": "The plank-balanced-budget ticket gate establishes the promise, and a budget that does not close with the promise in it is an annual fact of government; the week deals the same in any phase of the cycle."},
  class: "economy",
  severity: "routine",
  dilemmaShape: "allocation",
  subject: "The sentence in the stump speech",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    descriptor: "the budget room where the campaign's own language is pinned to the wall above the ledger",
  },
  conditions: [
    { kind: "turn", atLeast: 6 },
    // What was promised on a stage, not what has been done since. A President
    // who never ran on the balanced budget is being asked a different question,
    // and this is not their week.
    { kind: "ticket", plank: "plank-balanced-budget" },
  ],
  weight: 1,
  particulars: [
    { label: "Said on the stump", value: "Balanced in four years" },
    { label: "Gap this year", value: "$310 billion" },
    { label: "Programs on the list", value: "9" },
    { label: "Of those, ours", value: "4" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "You ran on balancing the budget in four years and said it in one sentence often enough that it is on a wall in this building. The gap this year is three hundred and ten billion, and the nine programs on my list are the only ones that close it without touching a benefit anybody has already been sent a letter about.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "labor" },
      text: "Four of those nine are the ones we campaigned on beside the balanced budget. I am not arguing that the arithmetic is wrong. I am telling you that the same stage carried both sentences and only one of them can survive this budget.",
    },
  ],
  replies: [
    {
      id: "keep-the-promise-on-the-book",
      tone: "principled",
      text: "The balanced budget comes first. Cut the nine, publish the list with my name on it, and I will say out loud which promise I am keeping and which I am not.",
      sets: ["chose-the-balanced-book"],
      press: "{{leader}} publishes a nine-program cut and says the balanced budget is the promise this administration will be judged on.",
      commitment: {
        kind: "position",
        cost: { treasury: 3100, standing: 0.03, stability: -0.06 },
        impact: {
          institutional: ["legislative-capital-spent"],
          divisive: true,
        },
        remembered: "The administration published the cuts under its own name and said plainly which campaign promise it was choosing over the others.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The list was read out on air beside the sentence from the stump speech, in that order, and the four programs on it had been announced by this administration in its first month.",
        },
      },
    },
    {
      id: "keep-the-programs",
      tone: "conciliatory",
      text: "Keep the nine. Balancing the budget waits a year, and I will explain a year to people who can see a clinic.",
      sets: ["chose-the-programs"],
      commitment: {
        kind: "position",
        cost: { treasury: -900, standing: -0.05, stability: 0.03 },
        impact: {
          financial: { scale: "discretionary", horizon: "multi-year" },
        },
        remembered: "The administration kept the nine programs and let the balanced budget it had campaigned on slip by a year.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "finance" },
          text: "A year is what we have said. The bond market read it as four, which is the number of years left, and Treasury yields moved this afternoon on that reading rather than on ours.",
        },
      },
    },
    {
      id: "split-it-and-say-so",
      tone: "firm",
      text: "Cut five, keep four, and publish the arithmetic beside the promise so nobody has to guess which half I chose.",
      sets: ["split-the-campaign-promise"],
      commitment: {
        kind: "position",
        cost: { treasury: 1400, standing: -0.02, stability: -0.02 },
        impact: {
          institutional: ["legislative-capital-spent"],
        },
        remembered: "The administration cut five of the nine, kept four, and published the arithmetic beside the sentence it had campaigned on.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "Each caucus called it the other side's win. The published arithmetic was the only document either of them quoted correctly.",
        },
      },
    },
  ],
  context: {
    standing:
      "The balanced budget was one sentence on a stage, said often enough to be quoted back, and the gap this year is three hundred and ten billion. The nine programs that close it without touching a benefit already promised in writing include four this administration announced in its own first month.",
    precedent:
      "Governments that publish the cut under their own name are quoted against their own campaign language for the rest of the term and are believed on the arithmetic. Governments that let the target slip quietly are believed on neither.",
    pressures: [
      { source: "cabinet", want: "The Treasury wants the nine cut this cycle, because a target missed in year two is a target nobody costs in year three." },
      { source: "press", want: "Two newspapers have the stump sentence and the program list side by side and have asked the press office which one is the policy." },
      { source: "legislature", want: "The administration's own caucus wants the four it campaigned on kept, and has said the arithmetic can be found somewhere else." },
      { source: "street", want: "The four programs have been announced in nine states, and in six of them the site work has already started." },
    ],
    inaction:
      "Saying nothing sends the budget to the floor with both promises in it and neither funded, which is the version the other caucus will read out line by line.",
    unknown:
      "Whether the five cuts survive the floor at all, and what the market reads into a target that slips without being withdrawn.",
  },
};

// --- Four weeks the pack had no class for ----------------------------------
//
// Public health, migration, espionage and technology: four of the rooms the
// charter's ownership table names and the bundled floor never put a scenario
// in front of. Each is voiced by the departments that own its class, gated on
// the board rather than on the calendar alone, and carries four particulars.

const theLotNumbersOnTheRecall: ScenarioDef = {
  id: "the-lot-numbers-on-the-recall",
  premise: {"kind": "introduces", "what": "The lab result is the incident: routine testing finds a carcinogenic contaminant in four lots of the country's most common blood-pressure pill this week, creating the recall decision the week reports."},
  class: "public-health",
  severity: "serious",
  dilemmaShape: "containment",
  subject: "The lot numbers on the recall",
  cast: { pick: "none" },
  locus: {
    site: "city",
    ground: "home",
    descriptor: "the distribution warehouse where the suspect lots are still on the shelves",
  },
  // A recall this size is only a decision if the department can run one. A
  // Secretary of Health with no competence at all does not bring the President
  // a choice; the pharmacies make it for them.
  conditions: [
    { kind: "turn", atLeast: 3 },
    { kind: "cabinetAttribute", roleHint: "health", attribute: "competence", atLeast: 0.2 },
  ],
  weight: 1,
  once: true,
  particulars: [
    { label: "Patients on the pill", value: "11 million" },
    { label: "Lots failed", value: "4" },
    { label: "Lots tested so far", value: "60 of 900" },
    { label: "Replacement supply", value: "3 weeks out" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "health" },
      text: "Four batches of the country's most common blood-pressure pill have come back from the lab with a chemical in them that causes cancer over years, not days. Pull every batch tonight and eleven million people wake up without a pill they are told never to miss, and some will have strokes before new supply arrives. Pull only the four and I am telling people the rest are safe when we have tested sixty.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The manufacturer's statement went out at six and used the word precautionary three times. Pharmacists in two states have started pulling the pill off their own shelves without waiting to be told.",
    },
  ],
  replies: [
    {
      id: "pull-every-lot",
      tone: "principled",
      text: "Pull every lot tonight, and tell people plainly not to stop taking it until their pharmacist has something to hand them.",
      sets: ["recalled-every-lot"],
      press: "{{leader}} orders every lot of the country's most common blood-pressure pill off the shelves overnight",
      commitment: {
        kind: "position",
        cost: { stability: -0.05, treasury: -60, standing: 0.02 },
        pull: { economicLeftRight: -0.05 },
        // People who stop a pill like this one without a substitute have
        // strokes. The recall is the cause, which is why the agency is ours.
        impact: { human: { lives: "isolated", borneBy: "one-group", cohorts: ["age-65-plus"] }, agency: "our-doing" },
        remembered: "Every lot of the pill was pulled the night the lab results came back, with an instruction not to stop taking it that not everyone heard.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "health" },
          text: "The recall is out. The pharmacist hotlines took more calls in the first hour than they take in a month, and the most common question was whether to take tonight's pill. A lot of the callers had already thrown theirs away.",
        },
      },
    },
    {
      id: "pull-the-four",
      tone: "firm",
      text: "Pull the four bad lots, leave the rest on the shelves, and test every other lot as fast as the labs can run them.",
      sets: ["recalled-the-failed-lots"],
      commitment: {
        kind: "position",
        cost: { stability: 0.02, standing: -0.04, treasury: -20 },
        // Nobody goes without the pill, and whoever took a bad lot that the
        // labs had not reached yet took it on this government's word.
        impact: { human: { lives: "isolated", borneBy: "one-group", cohorts: ["age-65-plus"] }, agency: "on-our-watch", divisive: true },
        remembered: "Only the four lots that failed were pulled, and the rest stayed on the shelves while the labs worked through them.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The labs are running around the clock. On the evening news a woman at a pharmacy counter held her bottle up to the camera, read out a lot number that was not on the list, and asked how anybody was supposed to know.",
        },
      },
    },
    {
      id: "let-the-maker-run-it",
      tone: "evasive",
      text: "Let the manufacturer run its own recall on its own schedule, and keep this building's name off it until the tests are back.",
      sets: ["left-the-recall-to-the-maker"],
      commitment: {
        kind: "position",
        cost: { standing: -0.06, stability: -0.02 },
        impact: { institutional: ["civil-service-strained"] },
        remembered: "The recall was left to the company that made the pill, and the government kept its own name off the notice until the tests came back.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "health" },
          text: "They have recalled the four lots and nothing else. Two senators have written to ask why the recall notice carries the company's logo and not ours, and I do not have an answer I would like to read aloud.",
        },
      },
    },
  ],
  context: {
    standing:
      "The pill is a generic that most people over sixty take every morning, made abroad and packaged here by one company that supplies nearly half the country. Routine testing found the contaminant in four lots this week, and nobody yet knows whether the problem is four bad batches or the way every batch is made.",
    precedent:
      "Contamination like this has been found in a common pill before. That recall was done in stages as the tests came in, and each new stage was reported as a new scandal, so a problem that was found once was on the news for most of a year.",
    pressures: [
      { source: "cabinet", want: "The health department wants a decision before pharmacies open, because pharmacists are already making it themselves, differently in every state." },
      { source: "business", want: "The manufacturer says a full recall would empty the market for a month and wants to test first, which it would also prefer for its own reasons." },
      { source: "press", want: "The lab results leaked with the lot numbers attached, and reporters are reading the numbers out on air and telling viewers to check their bottles." },
      { source: "legislature", want: "Members on the health committees want a briefing tomorrow and have asked why the pill is made abroad at all." },
    ],
    inaction:
      "Saying nothing leaves eleven million people and every pharmacist in the country to decide for themselves from a list of lot numbers on the news, and they will not all decide the same way.",
    unknown:
      "Whether the other lots are clean. Sixty have been tested and the labs can run about forty a day, so nobody will know for weeks, and the number of people who have already stopped taking the pill is not being counted by anyone.",
  },
};

const theBusesAtTheShelter: ScenarioDef = {
  id: "the-buses-at-the-shelter",
  class: "migration",
  severity: "serious",
  dilemmaShape: "allocation",
  subject: "The buses at the shelter door",
  cast: { pick: "none" },
  locus: {
    site: "city",
    ground: "home",
    city: "CITY-USA-chicago" as CityId,
    state: "IL",
    descriptor: "the shelter in {{city}} where the buses stopped without warning",
  },
  // Written for the cold: every beat turns on people sleeping outside, and a
  // bus in July is a different week with a different price.
  conditions: [
    { kind: "turn", atLeast: 2 },
    { kind: "calendar", months: [12, 1, 2] },
  ],
  weight: 1,
  once: true,
  particulars: [
    { label: "Buses this week", value: "14" },
    { label: "People on them", value: "700" },
    { label: "Shelter beds free", value: "None" },
    { label: "Tonight's low", value: "12°F" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "homeland" },
      text: "A border-state governor has sent fourteen buses of asylum seekers to {{city}} this week without telling the city, and the shelters were full before the first one arrived. Tonight is well below freezing. What you decide is who pays to keep seven hundred people indoors, and whether paying tells him to send more.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "justice" },
      text: "The buses are legal. People who have applied for asylum can travel, and a state can buy them a ticket. If we go to court, it will be over how they were sent, not whether, and I would not promise you we win that.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The mayor has been on television twice today, standing outside the shelter in a winter coat, asking the White House by name what it intends to do.",
    },
  ],
  replies: [
    {
      id: "fund-the-city-tonight",
      tone: "conciliatory",
      text: "Send the city the money tonight, and have federal tents and heaters on the ground before anyone sleeps outside.",
      sets: ["funded-the-shelter-city"],
      commitment: {
        kind: "position",
        cost: { treasury: -140, stability: 0.03, standing: -0.02 },
        pull: { nationalistGlobalist: -0.06 },
        impact: {
          financial: { scale: "discretionary", horizon: "one-off" },
          human: { displaced: "local", borneBy: "one-region" },
        },
        gazetteer: { stateLean: -0.02 },
        domestic: {
          urban: 1,
          values: { nationalistGlobalist: -0.5 },
          magnitude: "moderate",
          signature: "shelter-buses:funded",
          reason: "Washington paid to shelter people a border-state governor had bused north, and both ends of the route took note.",
        },
        remembered: "The federal government paid for the tents and heaters the night the buses arrived, and the city did not have to ask twice.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "homeland" },
          text: "The tents are going up. The governor has already announced that the next buses leave tomorrow, and thanked the federal government for finally finding the money.",
        },
      },
    },
    {
      id: "take-the-governor-to-court",
      tone: "firm",
      text: "Take the governor to court over how those buses were sent, and make him answer for every one that arrives without a word to the city.",
      sets: ["sued-over-the-buses"],
      commitment: {
        kind: "position",
        cost: { standing: 0.02, stability: -0.04, treasury: -10 },
        pull: { authLibertarian: 0.04 },
        impact: {
          human: { displaced: "local", borneBy: "one-region" },
          institutional: ["legal-authority-spent"],
          divisive: true,
        },
        remembered: "The government took a governor to court over the buses he sent, and left the city to find the beds while the case was filed.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "justice" },
          text: "We file on Friday. The governor has called it the first time Washington has noticed the border, and he said it standing in front of the next bus.",
        },
      },
    },
    {
      id: "leave-it-to-the-two-of-them",
      tone: "evasive",
      text: "It is a city shelter and a state's buses. Let the mayor and the governor settle it between them.",
      sets: ["left-the-buses-to-the-states"],
      commitment: {
        kind: "position",
        cost: { stability: -0.06, standing: -0.03 },
        pull: { nationalistGlobalist: 0.05 },
        // Seven hundred people with nowhere to go on a night below freezing,
        // and the government decided that was someone else's to answer.
        impact: { human: { lives: "isolated", displaced: "local", borneBy: "one-group", cohorts: ["income-struggling"] }, agency: "on-our-watch", divisive: true },
        remembered: "The government left the buses to the mayor and the governor, on a night when the people on them had nowhere to sleep.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The police opened two station lobbies overnight so that nobody slept outside. The pictures in the morning were of the station floors, and of children asleep under donated coats.",
        },
      },
    },
  ],
  context: {
    standing:
      "The buses began arriving on Monday, one or two a day, each with about fifty people who had crossed the southern border and applied for asylum. Nobody told the city they were coming, and its shelters were already full with people who arrived the same way last month.",
    precedent:
      "Governors have sent buses north before. Each time the receiving city asked for federal money, and each time the money arrived after the pictures had already run, so the argument was over who had left people in the cold rather than who had sent them.",
    pressures: [
      { source: "cabinet", want: "Homeland Security wants federal shelter on the ground tonight, and says whatever it costs is less than a death on camera." },
      { source: "legislature", want: "The governor's allies in Congress say any federal money for the city rewards a policy that is failing at the border, and have said so on the House floor." },
      { source: "street", want: "Church groups in the city have opened their basements and say they can hold about two hundred people for a few nights, not more." },
      { source: "press", want: "The mayor is asking for the White House by name on every local newscast, and the national networks have started carrying it." },
    ],
    inaction:
      "Doing nothing leaves seven hundred people to the city's police lobbies and church basements on a night well below freezing. The governor reads the silence as permission to keep sending buses.",
    unknown:
      "How many more buses the governor has chartered, and whether he is counting on the federal government to pay, so that he can say it did.",
  },
};

const theEngineerWhoCopiedTheDrives: ScenarioDef = {
  id: "the-engineer-who-copied-the-drives",
  class: "espionage",
  severity: "serious",
  dilemmaShape: "disclosure",
  subject: "The engineer who copied the drives",
  cast: { pick: "tensest" },
  locus: {
    site: "city",
    ground: "home",
    descriptor: "the storage unit near the contractor's campus where the drives turned up",
  },
  conditions: [{ kind: "relationship", field: "tension", atLeast: 0.3 }],
  weight: 1,
  once: true,
  particulars: [
    { label: "Files copied", value: "40,000" },
    { label: "Program", value: "Missile guidance" },
    { label: "His contact", value: "Their embassy's second secretary" },
    { label: "Meetings watched", value: "6" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "intelligence" },
      text: "An engineer at one of our missile contractors has been copying guidance files for {{counterpart}}, and we have watched him hand them over six times. We can arrest him tonight. Or we can leave him in place and use him, and that stays possible only until he notices he is being followed, which could be any day now.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "justice" },
      text: "The case is strong enough to charge today. Every week we wait, what he hands over is on us, and if it ever comes out that we let him keep passing files, a jury will not be the only people asking why.",
    },
  ],
  transmission: {
    relay: "cable",
    attribution: "their embassy",
    voice: "state",
    text: "We are informed that one of our accredited diplomats has been followed in your capital for some months. If he is detained, or asked to leave, we will answer in kind, and we have already drawn up the list.",
  },
  replies: [
    {
      id: "charge-him-in-public",
      tone: "principled",
      text: "Arrest him tonight, unseal the charges in the morning, and name what he took and who he gave it to.",
      sets: ["charged-the-engineer-publicly"],
      press: "Missile engineer charged with passing guidance files to a foreign government",
      commitment: {
        kind: "position",
        cost: { standing: 0.05, stability: -0.02 },
        relationship: { tension: 0.06, trust: -0.05 },
        pull: { nationalistGlobalist: 0.04 },
        impact: { institutional: ["intelligence-source-burned"] },
        remembered: "The engineer was arrested and charged in public, and the government named the country he had been passing missile files to.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "justice" },
          text: "The charges are unsealed. They name the diplomat by his title, and their embassy has already told us which three of our people it is sending home.",
        },
      },
    },
    {
      id: "turn-him",
      tone: "firm",
      text: "Put it to him tonight: he keeps meeting them, he hands over what we give him, and he does not go to prison for thirty years.",
      sets: ["turned-the-engineer"],
      commitment: {
        kind: "position",
        cost: { standing: -0.02, treasury: -20 },
        impact: { institutional: ["legal-authority-spent"] },
        remembered: "The engineer was offered his freedom in exchange for feeding his handlers what the government chose, and he took it.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "intelligence" },
          text: "He agreed within the hour. I would not call it loyalty; he has worked out what the alternative is. He meets his contact again on Thursday, and the contractor still does not know.",
        },
      },
    },
    {
      id: "send-the-diplomat-home",
      tone: "coercive",
      text: "Put out a public statement tonight naming their second secretary's post and what he has been doing, and let the engineer wonder why his contact went quiet.",
      sets: ["expelled-the-handler"],
      commitment: {
        kind: "instrument",
        instrument: "diplomatic",
        rung: 2,
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "intelligence" },
          text: "The statement is out and names his post. He cannot stay after that, so we lose everyone he would have led us to, and they now know exactly which of their people we were watching.",
        },
      },
    },
  ],
  context: {
    standing:
      "Counterintelligence agents have followed the engineer for months, since he began copying files he had no reason to open. The files cover how our missiles find their targets, and the man he meets works out of the embassy under diplomatic cover.",
    precedent:
      "The last spy the country turned instead of charging fed his handlers for two years before they caught on. When they did, he disappeared on a trip abroad, and the government could never say in public what it had gained or what it had cost.",
    pressures: [
      { source: "cabinet", want: "The Attorney General wants charges filed while the case is clean, before anyone can ask why a known spy was left at his desk." },
      { source: "military", want: "The program office wants to know exactly which files went, so it can decide what has to be redesigned, and it wants to know before anything is said in public." },
      { source: "business", want: "The contractor does not yet know one of its engineers is under investigation, and its chief executive is in Washington this week asking for a new contract." },
      { source: "adversary", want: "Their embassy has asked, through a formal cable, for assurances about the safety of its staff, which tells us they suspect we are watching." },
    ],
    inaction:
      "Leaving it another week means another handover, of files the program office has not yet been able to name. Their embassy's cable suggests he may not have another week before they pull him out themselves.",
    unknown:
      "Whether he is the only one. Two other engineers badged into the same room on the nights he copied the files, and nobody has yet worked out why.",
  },
};

const theAppOnEveryAgencyPhone: ScenarioDef = {
  id: "the-app-on-every-agency-phone",
  class: "technology",
  severity: "routine",
  dilemmaShape: "foot-in-the-door",
  subject: "The app on every agency phone",
  cast: { pick: "none" },
  locus: {
    site: "capital",
    ground: "home",
    descriptor: "the procurement office that approved the app on a form nobody can now find",
  },
  // Nobody finds this unless the intelligence chair is good enough to look.
  // A weaker Director of National Intelligence leaves the app where it is and
  // this week never reaches the desk.
  conditions: [
    { kind: "turn", atLeast: 4 },
    { kind: "cabinetAttribute", roleHint: "intelligence", attribute: "competence", atLeast: 0.4 },
  ],
  weight: 1,
  once: true,
  particulars: [
    { label: "Federal phones with it", value: "190,000" },
    { label: "Agencies using it", value: "23" },
    { label: "Replacement ready", value: "Not this year" },
    { label: "Owner", value: "Registered abroad" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "intelligence" },
      text: "Twenty-three agencies coordinate their field staff on a messaging app whose owner answers to a government we would not trust with a phone number. We have found nothing wrong with it. We have also found that we could not tell if there were, because nobody here has ever been allowed to look inside it.",
    },
    {
      speaker: { kind: "cabinet", roleHint: "commerce" },
      text: "It works, it was cheap, and the disaster teams love it. If we ban it this week, the company will say we banned it for where it is registered and not for anything it did, and it will be right.",
    },
  ],
  replies: [
    {
      id: "take-it-off-by-friday",
      tone: "firm",
      text: "Take it off every federal phone by Friday, and tell the agencies to use email until something better exists.",
      sets: ["banned-the-agency-app"],
      commitment: {
        kind: "position",
        cost: { stability: -0.02, standing: 0.02, treasury: -30 },
        pull: { nationalistGlobalist: 0.05 },
        impact: { institutional: ["civil-service-strained"] },
        remembered: "The messaging app was ordered off every federal phone before anyone had found anything wrong with it.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "homeland" },
          text: "It comes off on Friday. The disaster teams were using it to run the flood response two states over, and they have asked me what they are supposed to use on Saturday.",
        },
      },
    },
    {
      id: "open-the-code",
      tone: "principled",
      text: "Make them open the code to our people, line by line, and keep it running until we find something or we don't.",
      sets: ["audited-the-agency-app"],
      commitment: {
        kind: "position",
        cost: { treasury: -40, standing: -0.02 },
        impact: { institutional: ["civil-service-strained"] },
        remembered: "The government kept the app running and made its owner open the code to federal reviewers, and waited to see what they found.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "intelligence" },
          text: "They have offered the full source code, which is generous, and which also tells me they are not worried about what we will find in it. The review starts on Monday.",
        },
      },
    },
    {
      id: "force-a-sale",
      tone: "conciliatory",
      text: "Tell the owner to sell the business here to a buyer from here, and we keep using it once they have.",
      sets: ["forced-a-sale-of-the-app"],
      commitment: {
        kind: "position",
        cost: { standing: 0.01, stability: 0.01, treasury: -10 },
        pull: { economicLeftRight: 0.03 },
        impact: { institutional: ["legal-authority-spent"] },
        remembered: "The government told the app's foreign owner to sell its business here to a domestic buyer, and kept the app on federal phones while it waited.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "commerce" },
          text: "Their lawyers have asked for a price and a year. Their government has announced that any sale needs its approval, and it has never once given that approval to anyone.",
        },
      },
    },
  ],
  context: {
    standing:
      "The app was approved for one agency's field staff years ago and spread to twenty-three because it worked better than anything the government had built. A routine review of who owns what on federal phones found that its parent company is registered in a country under sanctions.",
    precedent:
      "Governments have banned foreign-owned apps from official phones before. The bans held, and the agencies that relied on the apps spent a year on worse tools while the replacements were built.",
    pressures: [
      { source: "cabinet", want: "The Director of National Intelligence wants it off every phone, and says a tool nobody can inspect should never have been approved." },
      { source: "business", want: "The company has offered an audit, a local data center and a board seat for one of our citizens, and says it has been singled out for its address." },
      { source: "legislature", want: "Two committees have asked for a list of every agency using the app, and one of them wants it by Friday." },
    ],
    inaction:
      "Nothing breaks if nobody decides. The app stays on the phones, the committees get their list, and the first question at the hearing is why the government knew and left it there.",
    unknown:
      "Whether anything has ever left the phones through the app. Nobody can answer that without looking inside it, and the owner decides who looks.",
  },
};

export const CORE_SCENARIOS: readonly ScenarioDef[] = [
  theWaterTheyBothClaim,
  theMorningTheCountryStopped,
  theStationPastTheRoad,
  // The depot square's three readers, one per door. Kept together and beside
  // their setter rather than filed by class: the pack's whole worked example of
  // an arc is that all three branches come back, and splitting them up is how
  // the next person to add a scenario stops noticing that they have to.
  theRunOnTheCurrency,
  theCourtTheDecreeWentPast,
  theDealTheGovernmentWasNotIn,
  theMemoWithTwoDates,
  theLineItemWithTwoNames,
  // The lease arc, kept in its dealt order and together, for the same reason
  // the depot square's readers are: the pack's whole demonstration of a family
  // is that the opener pins a country and the two later beats inherit it, and
  // filing them apart by class is how the next person to add a scenario stops
  // seeing that.
  theNoticeOnTheLease,
  theCrowdAtTheGate,
  theTermsTheyFinallySigned,
  // The two weeks the pack could not write before content could read the board's
  // own place and the administration's own platform.
  theRidgeAboveTheReservoir,
  theSentenceInTheStumpSpeech,
  // The four rooms the pack had never put a week in front of.
  theLotNumbersOnTheRecall,
  theBusesAtTheShelter,
  theEngineerWhoCopiedTheDrives,
  theAppOnEveryAgencyPhone,
];

export const corePack: ScenarioPack = {
  id: "core",
  version: 3,
  scenarios: [...CORE_SCENARIOS],
};

/**
 * Every flag the bundled content can stamp. Because it ships with every
 * install, these flags exist in any campaign — so a later pack may gate on one
 * without shipping the document that writes it, and the audit needs to know
 * that before calling such a gate unsatisfiable.
 *
 * Replies and consequence cards are one vocabulary, not two. A gate does not
 * care whether the deed was the answer a player gave or the aftermath that
 * answer produced, and splitting the derivation would have made a chain that
 * hangs off an authored aftermath read as unsatisfiable.
 */
export const CORE_FLAG_VOCABULARY: readonly string[] = [
  ...new Set([
    ...CORE_SCENARIOS.flatMap((scenario) => scenario.replies.flatMap((reply) => reply.sets ?? [])),
    ...CORE_CONSEQUENCES.flatMap((consequence) => consequence.sets ?? []),
  ]),
].sort();
