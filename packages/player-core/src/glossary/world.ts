import type { Explainer, GlossaryEntry } from "./types.js";

// Other governments, the military chain, the instruments of
// foreign policy, the War Powers clocks and emergencies at home.
//
// Real-world sentences were checked against the U.S. Code and agency pages:
// 10 U.S.C. 161-163 (combatant commands), 50 U.S.C. 1541-1548 (War Powers
// Resolution), 50 U.S.C. 3093 (covert action), 50 U.S.C. 1701 (emergency
// economic powers), 50 U.S.C. 1601-1651 (National Emergencies Act) and 42
// U.S.C. 5170 (Stafford Act major disaster declarations). The statutes stay in
// these comments; the player-facing sentences say what they do.

export const WORLD_GLOSSARY: readonly GlossaryEntry[] = [
  // intelligence.ts, collection-report.ts and security-effects.ts.
  {
    "id": "collection-report",
    "term": "Intelligence report",
    "icon": "intel",
    "definition": "A dated account of what your collection found, how it was obtained, and what analysts still can't establish.",
    "example": "Say a surveillance mission is exposed but still picks up a warning. The warning stays useful, and the exposure carries its own consequence.",
    "inGame": "Each report records what was found, what is still unknown, how confident the analysts are, and whether the mission was exposed. A report with no result doesn't mean everything is fine. Closing a tasking keeps its reports in the archive. Sharing sends one report to a foreign government you choose. It doesn't reveal your other secrets, and it doesn't automatically raise that government's trust in you.",
    "related": [
      "unread-reading",
      "their-trust"
    ]
  },
  // engine resolution-ripples.ts thirdPartyRelation (bloc-partner, bloc-peer)
  // and RELATION_SENSITIVITY; compacts.ts compactKind and selectCompactCalls;
  // coalition.ts BACKING_TRUST (0.5 on the -1..1 trust scale; the board's
  // "Trusts you" word starts at 0.2), BACKER_WEIGHT (defense 1, political .6,
  // economic .4), BACKING_SATURATION (4), BACKING_ODDS_LIFT (economic .12,
  // military .06, covert 0), BACKING_STANDING_RELIEF (.35).
  {
    id: "compact",
    term: "Compact",
    icon: "layerBlocs",
    definition:
      "A formal agreement that ties countries together as a group, such as a defense alliance, a political club, or a trade bloc. Members expect each other to act together, or at least not to act against one another.",
    example:
      "NATO (the North Atlantic Treaty Organization) is a defense compact. Its members promise that an attack on one is an attack on all. The G7, a club of large economies whose leaders meet every year, is a looser kind.",
    inGame:
      "The exact agreement matters. A shared defense commitment can turn an attack into a broken promise, but belonging to separate organizations can't create that promise. A defense partner under attack may call for help. When you ask for support on an operation, each government answers according to its own ties, interests, and obligations. Read its actual response before you count on it. Membership doesn't give you private intelligence access.",
    related: ["security-guarantee", "their-trust"],
  },
  // engine combatant-commands.ts: COMBATANT_COMMANDS (command-catalog.ts: seven
  // geographic including Space, four functional) and CommandRuntime.assignment;
  // the board is security/Theaters.tsx.
  {
    id: "combatant-command",
    term: "Combatant command",
    icon: "instrumentMilitary",
    definition:
      "A permanent military headquarters that brings forces from the Army, Navy, Air Force, and other services under one four-star commander. Some cover a region of the world. Others cover one job everywhere, such as cyber warfare or moving troops and supplies.",
    example:
      "U.S. Central Command covers the Middle East and Central Asia. U.S. Cyber Command handles cyber operations everywhere.",
    inGame:
      "The game has 11 commands. Seven cover a region, and one of those, Space Command, covers space. Four each cover one job, which are nuclear forces, special operations, transportation, and cyber. Each has a commander, a share of every service's units, and a readiness setting called its posture. A command can use only the forces assigned to it. You can move forces between commands, and you can move a country from one regional command to another.",
    related: ["chain-of-command", "theater", "unified-command-plan", "command-posture"],
  },
  // engine combatant-commands.ts: commandChain, DEFAULT_AOR_BY_REGION
  // (command-catalog.ts); the board is security/Theaters.tsx.
  {
    id: "theater",
    term: "Theater",
    icon: "layerConflict",
    definition:
      "The part of the world where one military command runs its operations, such as the Middle East or the Pacific.",
    example:
      "The Middle East is one theater, run by Central Command. Europe is another, run by European Command.",
    inGame:
      "Each regional command is a theater on the Security page. You can see who commands it, which countries it covers, and what forces are assigned to it. You'll also see an 'order delivery' percentage, which tells you how much of your order would be carried out there.",
    related: ["combatant-command", "chain-of-command"],
  },
  // engine combatant-commands.ts: secretaryLink, SECRETARY_VACANT_DRAG,
  // SECRETARY_ACTING_DRAG; reassignForces refuses with no Secretary and no
  // acting one.
  {
    id: "secretary-of-defense",
    term: "Secretary of Defense",
    icon: "departmentDefense",
    definition:
      "The member of the President's cabinet (the heads of the big departments) who runs the Department of Defense. A civilian, the Secretary is the one link between the President and the military commanders. The Senate must confirm the person.",
    example:
      "When the President decides to move warships, the Secretary of Defense passes the order down to the commanders.",
    inGame:
      "Every military order passes through this seat. If the seat is empty or held by an acting (temporary) Secretary, every theater carries out less of what you order. With nobody in the seat at all, you also can't move forces between commands.",
    related: ["chain-of-command", "joint-chiefs", "confirmation"],
  },
  // engine combatant-commands.ts header: the Chairman carries and advises but
  // never issues orders (10 U.S.C. 163).
  {
    id: "joint-chiefs",
    term: "Joint Chiefs of Staff",
    icon: "brief",
    definition:
      "The top officer of each military service, plus a Chairman who is the President's main military adviser. They advise on military questions. They have no power to command troops.",
    example:
      "Before a strike, the Chairman tells the President what the military can do, what could go wrong, and what it would cost.",
    inGame:
      "The game follows the law here. Your orders go to the Secretary of Defense and then to the commanders. They never go through the Joint Chiefs.",
    related: ["chain-of-command", "secretary-of-defense"],
  },
  // engine combatant-commands.ts: commandChain, SECRETARY_VACANT_DRAG (.3),
  // SECRETARY_ACTING_DRAG (.12), COMMANDER_ACTING_DRAG (.15), RELIEF_DRAG_EACH
  // (.05), RELIEF_DRAG_CEILING (.2), SUCCESSOR_CONFIRMATION_DAYS (84, which
  // removes the acting drag). 10 U.S.C. 162-163.
  {
    id: "chain-of-command",
    term: "Chain of command",
    icon: "order",
    definition:
      "The path an order travels. A military order goes from the President to the Secretary of Defense, who passes it to the commander of the combatant command in charge of that region or job. The Chairman of the Joint Chiefs advises but doesn't command troops.",
    example:
      "To order a strike in the Middle East, the President tells the Secretary of Defense, who tells the commander of Central Command. That command's forces then carry it out.",
    inGame:
      "A weak link anywhere along the path costs the order some of its force. Each command shows how much of your order it would carry out. An empty Secretary of Defense seat costs 30 points, an acting (temporary) Secretary 12, an acting commander 15, and each commander you have relieved there 5 more, up to 20. The result never reaches zero. The 15 for an acting commander ends after 12 weeks, when the Senate confirms the deputy. The points for relieved commanders stay for good.",
    related: ["combatant-command", "secretary-of-defense", "joint-chiefs", "theater"],
  },
  // engine combatant-commands.ts: amendUnifiedCommandPlan, UcpAmendment,
  // aorOverrides (functional commands hold no map; the homeland is not moved);
  // apps/web security/CommandActs.tsx MoveCountry. 10 U.S.C. 161.
  {
    id: "unified-command-plan",
    term: "Unified Command Plan",
    icon: "mapPin",
    definition:
      "The Pentagon's master document. It says which command covers which part of the world and what missions each one has. The Chairman of the Joint Chiefs reviews it at least every two years, and the President approves changes.",
    example:
      "In January 2021 the Pentagon announced that Israel would move from European Command to Central Command, so one headquarters would handle it along with its Middle Eastern neighbors. The move was completed that September.",
    inGame:
      "Each country starts under one regional command. From that command's panel, you can move a country to a different regional command. The move needs a written reason, and it is recorded with its date. Commands that cover one job hold no countries, and you can't move your own country.",
    related: ["combatant-command", "theater"],
  },
  // engine capacity.ts: READINESS_RECOVERY_PER_TURN (.02), MILITARY_READINESS_COST
  // (.05/.08/.15), MILITARY_READINESS_GATES (.3/.45/.6); combatant-commands.ts
  // POSTURE_READINESS_COST.
  {
    id: "military-readiness",
    term: "Readiness",
    icon: "shield",
    definition:
      "How quickly and how well forces can carry out the missions they are given. It depends on trained people, working equipment, and rested units that aren't already committed elsewhere.",
    example:
      "Picture a fire department. Readiness is how many trucks are fueled, how many crews are rested and trained, and how many aren't already out on another call.",
    inGame:
      "Readiness is one national figure from 0 to 100, and it recovers 2 points a week. Heavy military acts spend it. A blockade costs 5 points, a limited strike 8, and an invasion 15. Each also needs a minimum before you can order it, which is 30, 45, and 60. Holding a command above its routine posture drains it every week.",
    related: ["command-posture", "combatant-command"],
  },
  // engine combatant-commands.ts: CommandPosture, POSTURE_READINESS_COST (.004
  // and .012 a week), POSTURE_PRESSURE_RELIEF (.05 and .1), effectivePosture
  // and commandEngagement (an engaged theater never stands below heightened);
  // inspector in security/CommandInspector.tsx.
  {
    id: "command-posture",
    term: "Command posture",
    icon: "escalate",
    definition:
      "How much extra readiness a command holds beyond its normal state, with more forces on alert and more held back for a crisis. Holding it takes rest and maintenance time away from the rest of the force.",
    example:
      "A fire station keeps extra crews on shift during a heat wave. The town is safer, but the firefighters get tired and the budget shrinks.",
    inGame:
      "Each command has three settings. Routine costs nothing. Heightened costs 0.4 readiness points a week and surge costs 1.2, for as long as the command holds them. A theater where you are fighting or have sent forces stands at heightened at least, even if you order routine. A higher setting takes 5 percent (heightened) or 10 percent (surge) off the pressure a week of war puts on your side there. That gives you an edge, but it doesn't decide the war.",
    related: ["military-readiness", "combatant-command"],
  },
  // engine war-powers-report.ts and congress.ts (warPowersStanding).
  // 50 U.S.C. 1541-1548.
  {
    id: "war-powers-resolution",
    term: "War Powers Resolution",
    icon: "law",
    definition:
      "A 1973 law that limits how long a President can use the armed forces in a conflict without Congress's approval. The President must report to Congress within 48 hours of sending forces into combat. The operation must end after 60 days unless Congress approves it.",
    example:
      "A President orders air strikes on another country with no declaration of war. The law starts two clocks. One gives 48 hours to report to Congress. The other gives 60 days before the strikes must stop, unless Congress agrees.",
    inGame:
      "The game runs both clocks for military acts. Moving forces forward makes a report due. A blockade, strike, or invasion also starts the 60-day clock. Real Presidents of both parties have argued that the law can't bind them. In the game the clock is enforced, and ignoring it has a price.",
    related: ["war-powers-report", "sixty-day-clock", "use-of-force-authorization"],
  },
  // engine war-powers-report.ts: REPORT_WINDOW_DAYS (2), INTRODUCTION_BY_RUNG
  // (rung 2 equipped for combat, 3-5 hostilities), CANDOR_DISPOSITION_GAIN
  // (.03), LATE_DISPOSITION_COST (.05), MISSED_REPORT_DISPOSITION_COST (.07),
  // fileWarPowersReport. 50 U.S.C. 1543.
  {
    id: "war-powers-report",
    term: "48-hour report",
    icon: "dispatch",
    definition:
      "A written report the President must send to Congress within 48 hours of sending forces into combat, or into a foreign country ready for combat. It goes to the Speaker of the House and the Senate's President pro tempore. It says what happened, what legal authority is claimed, and how long the operation is expected to last.",
    example:
      "A President sends warplanes to strike a country on Monday. By Wednesday, a letter must reach Congress's leaders saying what was done, under what legal authority, and how long it is expected to last.",
    inGame:
      "Moving forces forward makes a report due 2 days after the move takes place. A blockade, strike, or invasion does too, and it also starts the 60-day clock. An order takes a few days to carry out, so the 2 days start then, not when you give the order. You state your legal authority, the scope, and an estimate in weeks, and the estimate stays on the record. File on time and Congress's goodwill goes up 3 points. If the deadline passes with nothing filed, goodwill falls 7 points that week, and filing after that costs 5 more.",
    related: ["war-powers-resolution", "sixty-day-clock"],
  },
  // engine war-powers-report.ts: TERMINATION_WINDOW_DAYS (60), terminationStartDay
  // (the earlier of the filing day and the due day), EXTENSION_DAYS (30),
  // terminationClockRuns, certifyExtension (open only in the last 14 days),
  // terminateForce, SUSTAINED_WEEKLY_STANDING_COST and _DISPOSITION_COST (.02),
  // SUSTAINED_COST_COMPOUNDING (.15, added to a multiplier of 1 per week past
  // the deadline). 50 U.S.C. 1544.
  {
    id: "sixty-day-clock",
    term: "Sixty-day clock",
    icon: "schedule",
    definition:
      "A limit in the War Powers law. Within 60 days of the report (or of the day it was due), the President must end the operation unless Congress declares war, approves it by law, or extends the deadline. A written certification that a safe withdrawal needs more time adds up to 30 days.",
    example:
      "A President orders air strikes on March 1 and reports on March 2. Sixty days later, around May 1, the strikes must stop and the troops must be home, unless Congress has voted yes.",
    inGame:
      "The clock starts on the day you file your report, or the day it was due, whichever is earlier. If you skip the report, the clock starts 2 days after the force goes in, which is the day the report was due. A blockade, strike, or invasion opens it. A vote of Congress authorizing force against that government stops it, and so does bringing the force home. You can claim the extra 30 days only in the last 14. Past the deadline, each week costs 2 points of standing abroad and 2 of goodwill in Congress, and each further week costs 0.3 points more than the one before.",
    related: ["war-powers-report", "use-of-force-authorization"],
  },
  // engine force-authorization.ts: projectForceAuthorization (majorityOf each
  // chamber, threatAppeal), AUTHORIZATION_DELAY_DAYS (3); congress.ts
  // AUTHORIZATION_TERM_TURNS (52), MAJOR_FORCE_RUNGS, WAR_POWERS_WINDOW_TURNS
  // (9), UNILATERAL_FORCE_COST, UNILATERAL_DISPOSITION_COST (.09),
  // warPowersStanding.
  {
    id: "use-of-force-authorization",
    term: "Authorization for use of military force",
    icon: "gavel",
    definition:
      "A law in which Congress approves force against a named enemy for a stated purpose. Under the War Powers law, either a declaration of war or a law like this lifts the 60-day limit. Congress has passed these authorizations, called AUMFs, far more often than it has declared war.",
    example:
      "After the September 11, 2001 attacks, Congress passed an authorization allowing force against those responsible. Presidents of both parties have relied on it for years.",
    inGame:
      "You can ask Congress to authorize force against a government. Both chambers vote after about 3 days, and each needs a simple majority. Congress is far likelier to say yes when the country is a real threat. A passed authorization lasts 52 weeks. While it stands, a blockade, strike, or invasion there is covered and no 60-day clock runs. Without one, a blockade or strike on your own authority costs 3 points of standing abroad, 2.5 of stability, and 9 of Congress's goodwill. For about 9 weeks afterward, you can't order another blockade, strike, or invasion against any country, the same one included, unless Congress has authorized force against that country.",
    related: ["sixty-day-clock", "war-powers-resolution"],
  },
  // engine instruments-economic.ts economicRungs (tradeAccess on every step
  // from the tariff up; targeted sanctions need reserves, an asset freeze a
  // GDP of 20,000, an embargo reserves and exports and cuts the actor's own
  // exports); coalition.ts BACKING_ODDS_LIFT. No declaration of emergency is a
  // gate in the game. 50 U.S.C. 1701.
  {
    id: "sanctions",
    term: "Sanctions",
    icon: "instrumentEconomic",
    definition:
      "Economic penalties aimed at a government or its officials. They include freezing money held abroad, banning trade or dealings with named people and companies, and limiting what can be exported to them. Most U.S. sanctions rest on a law that lets the President act against an outside threat after declaring a national emergency.",
    example:
      "The United States freezes the bank accounts of a foreign leader's inner circle and bars American companies from doing business with them.",
    inGame:
      "The economic steps run from mild to severe. They are trade advisory, tariff, targeted sanctions, asset freeze, and full embargo. The game doesn't require an emergency declaration first. Each step beyond the advisory needs a real trade relationship with the country. The heavier ones also need enough reserves (savings) or a big enough economy to absorb the other side's retaliation, and an embargo also cuts your own exports. Allies who back you make sanctions likelier to work.",
    related: ["covert-action", "national-emergency", "compact"],
  },
  // engine instruments.ts covertRungs, findings.ts (FindingState,
  // NotificationTier, signFinding, WITHHOLDING_DISPOSITION_COST .04, a
  // finding recorded at the time owes its written form within two days,
  // findingRefusal, UnfoundedAction),
  // capacity.ts COVERT_CAPABILITY_COST and INTEL_RECOVERY_PER_TURN;
  // coalition.ts (covert lift 0). 50 U.S.C. 3093.
  {
    id: "covert-action",
    term: "Covert action",
    icon: "instrumentCovert",
    definition:
      "An operation meant to influence another country in secret, so that the U.S. role isn't meant to be seen or admitted. The President must sign a written finding that it serves a clear foreign policy goal. The intelligence committees, the House and Senate groups that oversee the spy agencies, must be told, normally before it starts.",
    example:
      "The President signs a finding for a secret program to supply a local rebel group, and the leaders of Congress are told before the first shipment.",
    inGame:
      "The covert steps are surveillance, influence operation, sabotage, proxy support (backing a local armed group), and covert regime action (working to bring down a government). Each needs enough intelligence capability, and the top two use some of it up. Before you act on a country, sign a finding, which is the written authorization, for it. Sabotage, proxy support, or regime action without one is recorded for good as unfounded. You can sign it in advance, or record the decision at the time and put it in writing afterward. You also choose who in Congress hears first. Your options are both intelligence committees, the eight congressional leaders, or no one. Telling no one costs 4 points of goodwill in Congress and means you must state your reasons. A finding can't target American politics, opinion, or media. Allies give covert acts no help.",
    related: ["sanctions"],
  },
  // engine treaties.ts: TREATY_TERMS (bindsOn, effect), the executive-agreement
  // signing gain and withdrawal cost (EXECUTIVE_AGREEMENT_STANDING_GAIN .03,
  // _DISPOSITION_FALL -.02, _WITHDRAWAL_COST -.05), withdrawTreaty; comment on
  // Case-Zablocki.
  {
    id: "executive-agreement",
    term: "Executive agreement",
    icon: "sign",
    definition:
      "A deal with another country that the President makes alone, without a Senate vote. A treaty needs two thirds of the Senate to approve it. Most agreements the United States signs aren't treaties, and a later President can walk away from one far more easily.",
    example:
      "The 2015 nuclear deal with Iran was never sent to the Senate as a treaty. In 2018 President Trump pulled the United States out of it, and no vote was needed.",
    inGame:
      "An executive agreement takes effect the moment you sign. It raises a government's trust about a third as much as a ratified alliance. Signing gains 3 points of standing abroad and costs 2 points of goodwill in Congress, which resents being bypassed. You can revoke it later with no one's permission, at a cost of 5 points of standing and the trust it earned. A treaty needs the Senate's vote first, and once it is in force, it outlasts your presidency.",
    related: ["security-guarantee", "their-trust"],
  },
  // engine instruments-economic.ts assistance rung 5 (trustAtLeast .35 on
  // your own edge, readiness .5, projectionAccess, 48 fighters in a standing
  // basing commitment, readiness -.06, standing +.02, their trust +.15);
  // treaties.ts alliance.
  {
    id: "security-guarantee",
    term: "Security guarantee",
    icon: "instrumentAssistance",
    definition:
      "A promise to defend another country if it is attacked. A mutual defense treaty is the strongest form, and it takes two thirds of the Senate to approve.",
    example:
      "NATO's Article 5 says that an armed attack on one member is treated as an attack on all of them.",
    inGame:
      "This is the top step of assistance. You need a warm relationship (your own trust in that country at 0.35 or more on the game's scale from minus 1 to 1), readiness of at least 50, and the military reach to get forces there. It costs 6 points of readiness and ties up 48 fighter aircraft in a standing basing arrangement. It raises the government's trust in you more than any other kind of aid, and it earns you 2 points of standing. You can't give the same country one twice.",
    related: ["executive-agreement", "their-trust", "basing-arrangement"],
  },
  // engine commitments.ts KIND_WORDS "a basing arrangement with",
  // withdrawalGrudge (suspending counts half, winding down full); basing.ts
  // openingBaseCommitments (inherited at the oath); instruments-economic.ts
  // assistance rung 5.
  {
    id: "basing-arrangement",
    term: "Basing arrangement",
    icon: "building",
    definition:
      "An agreement that lets U.S. forces use a base in another country. It usually comes with a status of forces agreement, which sets the rules for American troops there, such as which country's courts handle crimes.",
    example:
      "U.S. troops stationed in Japan live and work on bases under a treaty and a separate agreement that sets the rules for them.",
    inGame:
      "You start with the bases the United States already has abroad, and a security guarantee adds one. A basing arrangement has no end date, so it binds whoever comes after you. You can suspend it or wind it down from Operations. The host government remembers. It loses trust in you and holds a grudge, a bigger one if you wind the arrangement down than if you suspend it, and a bigger one the larger the arrangement is.",
    related: ["security-guarantee"],
  },
  // player-core world/standing.ts: standingToward and boardStance read
  // Relationship.trust on the foreign government's edge toward the home nation;
  // format/figures.ts TRUST_STANCE_CUTS (.2, -.1, -.3).
  {
    id: "their-trust",
    term: "Their trust in you",
    icon: "layerTrust",
    definition:
      "How far a foreign government expects the United States to keep its word and act in its interest. No government publishes a number. Washington estimates it from diplomats, intelligence, and what leaders say and do.",
    example:
      "A country that was promised help and got it will take the next American call. A country that was promised help and didn't will be slow to pick up.",
    inGame:
      "Each country shows its own view of the United States at one of four levels. They are trusts you, on the merits, wary, and hostile. On the merits means it judges each issue as it comes. Aid, agreements, and visits move it. A deliberate strike on a trusting partner can cost you its trust even when no civilian deaths are reported. Relevant partners react too, and hostile acts affect later cooperation.",
    related: ["unread-reading", "security-guarantee", "executive-agreement"],
  },
  // player-core world/standing.ts: unread = !hasIntelOnNation(campaign, nation);
  // engine state-selectors.ts hasIntelOnNation (outreads vs
  // counterIntelOf at GOVERNMENT_READ_MARGIN). Your own read of them is always
  // shown.
  {
    id: "unread-reading",
    term: "Unread",
    icon: "hidden",
    definition:
      "A government whose real intentions your intelligence agencies can't see. That points to gaps in spying and analysis. It doesn't mean the government has no opinion of you.",
    example:
      "A closed government keeps its leaders' thinking secret, so analysts can't tell whether it trusts the United States or is planning against it.",
    inGame:
      "You can see a country's view of you only when your intelligence beats its counterintelligence (its work to stop spying) by a set margin, under the collection access rules. Shared membership alone doesn't reveal private deliberations. Otherwise the game marks its view as unread instead of guessing. Your own read of that country is always shown.",
    related: ["their-trust"],
  },
  // engine response.ts: statesConsent (GOVERNOR_CONSENT .5; it only decides whether the
  // state's own agencies join), responsePosture (standby, sustained or surge from a
  // declaration or an answer, never from the governor), POSTURE_EFFORT; obligations.ts stateAnswered (ANSWER_ATTENTION_TURNS 6);
  // emergency.ts declareEmergency (state scope). 42 U.S.C. 5121 and 5170.
  {
    id: "stafford-act",
    term: "Stafford Act",
    icon: "law",
    definition:
      "The federal law that governs disaster aid. When a disaster is too big for a state to handle, the governor (the state's elected leader) asks the President to declare a major disaster, and the President decides. The Federal Emergency Management Agency (FEMA) then coordinates the federal response.",
    example:
      "A flood wipes out roads and homes across a state. The governor asks Washington for help, the President approves, and FEMA starts sending money and supplies.",
    inGame:
      "Federal agencies work on a disaster whatever the governor wants, but only at about a third of full effort, run by career staff. Two things raise that. Answering a state's request for relief with an act aimed at that state lifts it to about 70 percent for 6 weeks. Declaring an emergency there lifts it to full effort. A governor who leans toward your administration (at least halfway between hostile and friendly) also sends the state's own agencies in. Otherwise they join only if you declare an emergency. A declaration is your call, and it costs standing every week it lasts.",
    related: ["national-emergency", "fema"],
  },
  // engine emergency.ts: EMERGENCY_RENEWAL_TURNS (52), EMERGENCY_NOTICE_TURNS
  // (13), EMERGENCY_WEEKLY_STANDING_COST (.0015), EMERGENCY_COST_COMPOUNDING
  // (.02 of the first week's cost per week since the declaration; renewal
  // does not reset it), weeklyStandingCost, underDeclaredEmergency;
  // locale-acts.ts federalize (needsDeclaration, standing .06); orders.ts
  // inEmergency and EMERGENCY_MISSING (a nationwide declaration or a war).
  // 50 U.S.C. 1601-1651.
  {
    id: "national-emergency",
    term: "National emergency",
    icon: "caution",
    definition:
      "A formal declaration by the President that a crisis is serious enough to unlock special powers written into law. It ends after one year unless the President renews it. Congress can end it with a joint resolution, but the President can veto that, so ending it over the President's objection takes two thirds of both chambers.",
    example:
      "After the September 11, 2001 attacks, President Bush declared a national emergency. Presidents have renewed it every year since.",
    inGame:
      "You can declare one over a disaster that is actually running, for one state or the whole country, where none is declared yet. It steps the federal response up to full effort and opens your strongest acts. It expires after 52 weeks unless you renew it in the last 13. It costs about 0.15 points of standing a week at first, and each week adds 2 percent of that first cost, so the weekly cost doubles after about a year. Renewing doesn't reset that growth. You can end it at any time.",
    related: ["stafford-act", "fema"],
  },
  // engine institutions.ts and response.ts RESPONSE_MEMBERS (FEMA leads
  // earthquakes, floods, storms, wildfires, tornadoes and winter storms),
  // POSTURE_EFFORT (.35, .7, 1), POSTURE_LOAD, RESPONSE_FLOOR (.55),
  // EXHAUSTION_DRAG.
  {
    id: "fema",
    term: "FEMA",
    icon: "departmentHomelandSecurity",
    definition:
      "The Federal Emergency Management Agency, the part of the federal government that coordinates help after disasters such as hurricanes, floods, and wildfires. Created in 1979, it has been part of the Department of Homeland Security since 2003.",
    example:
      "After a hurricane, FEMA coordinates rescue teams, supplies, and the money that helps people repair their homes.",
    inGame:
      "FEMA leads the response to earthquakes, floods, storms, wildfires, tornadoes, and winter storms, with other agencies helping. Other agencies lead elsewhere. The Centers for Disease Control and Prevention (CDC) leads for a pandemic, and the Energy Department leads for a heat wave. How much a response achieves depends on how well the agency is staffed and run. Each response adds to its workload, so two big disasters at once strain it. At standby an agency works at about a third of full effort, at steady about 70 percent, and in a surge at all of it. Even the best response takes at most 45 percent off what a disaster costs.",
    related: ["stafford-act", "national-emergency"],
  },
];

export const WORLD_EXPLAINERS: readonly Explainer[] = [
  // Issuance, access and recipient behavior use the same stored report.
  {
    "id": "collection-and-sharing",
    "title": "Using an intelligence report",
    "summary": "Before you act on a report, read what it found and what it couldn't establish. A report can still be useful even when the mission was exposed.",
    "steps": [
      {
        "label": "Set a requirement",
        "detail": "Choose a target, a question, and the element that will collect. Legal limits and collection limits can both cause a refusal.",
        "icon": "intel"
      },
      {
        "label": "Read the issued report",
        "detail": "Check its date, source, confidence, gaps, and exposure. If it found nothing, the question is still unanswered.",
        "icon": "dossier"
      },
      {
        "label": "Decide what to share",
        "detail": "Pick a recipient for an eligible foreign report. The receipt records what that government received. Reports about domestic public affairs can't be shared this way.",
        "icon": "world"
      },
      {
        "label": "Reassess later",
        "detail": "An old report stays on file as written. New collection can change the assessment, but it doesn't rewrite the earlier report.",
        "icon": "review"
      }
    ],
    "examples": [
      {
        "title": "A warning with a cost",
        "kind": "illustration",
        "lines": [
          "Surveillance picks up a warning about covert activity, but the target discovers the operation. The report carries both the finding and the exposure.",
          "You share the warning with a partner. The partner gets the dated finding and its limits, not open access to your intelligence.",
          "If the warning is fresh and the analysts are confident in it, it may change how that partner decides about economic support for the target. The partner still makes its own decision.",
          "A later mission finds nothing. That doesn't prove the threat has ended."
        ]
      }
    ],
    "youCan": [
      "Open the report archive in Intelligence and read the gaps along with the findings.",
      "Choose each eligible recipient yourself, and check the sharing receipt afterward.",
      "Keep a collection requirement going or close it, depending on how much it can still tell you and what authority you have."
    ],
    "terms": [
      "collection-report",
      "unread-reading",
      "their-trust"
    ],
    "next": [
      "trust-in-us"
    ]
  },
  // Weights from the engine constants named per entry: instruments-economic.ts
  // assistanceRungs (towardActor trust 0.04-0.15; only rung 5 also moves your
  // own trust in them), treaties.ts TREATY_TERMS and inForceEffects (both
  // directions), supermajorityOf (67 of 100), engagement.ts ENGAGEMENT_TERMS and
  // warmthEffects (both edges), resolution-ripples.ts RELATION_SENSITIVITY
  // (bloc partner .12, ally .08, bloc peer .05, trade partner .04), war-tick.ts
  // worldOpinionEffects, relationships.ts deedPressure/grudgeWeight.
  {
    id: "trust-in-us",
    title: "What moves a country's trust in you",
    summary:
      "Each country has its own view of the United States. That view shapes whether it takes your calls, signs your deals, and backs your moves. Aid, treaties, and visits raise it, a war you start lowers it a little everywhere, and a deliberate strike on a trusting partner damages it even without reported civilian deaths. You can build trust on purpose, and the biggest acts need it first.",
    cast: [
      { label: "The country you act on", role: "Its view of you responds to aid, treaties, meetings, and betrayal. Its own interests still shape each decision.", icon: "layerTrust", term: "their-trust" },
      { label: "Its allies and treaty partners", role: "They read a move against their friend as a threat, and they cool toward you.", icon: "layerBlocs", term: "compact" },
      { label: "Countries in a defense compact with both of you", role: "They judge an attack on a fellow member by the defense promise they actually made.", icon: "layerBlocs" },
      { label: "Its biggest trading partners", role: "They absorb the disruption, and they cool a little.", icon: "subjectTrade" },
      { label: "Governments not involved", role: "They lose a little trust in you each week a war you started keeps running.", icon: "world" },
    ],
    thresholds: [
      { label: "Senate: approve a treaty", needed: 67, of: 100, note: "Two thirds of the Senate. A ratified treaty raises trust more than an executive agreement, which needs no vote." },
    ],
    links: [
      // assistance rung 5 towardActor trust 0.15 (gate: your trust in them >= 0.35)
      { from: "A security guarantee", to: "Their trust in you", direction: "raises", weight: "strong", outcome: "helps", how: "This is the biggest single boost of any kind of aid, and it needs a warm relationship first." },
      // TREATY_TERMS.alliance trust 0.18, both directions, ratification
      { from: "A mutual defense treaty", to: "Their trust in you", direction: "raises", weight: "strong", outcome: "helps", how: "It takes effect for both countries once the Senate approves it, and it warms both views." },
      // TREATY_TERMS trade 0.10, arms-control 0.12 (alliance 0.18)
      { from: "Trade and arms-control treaties", to: "Their trust in you", direction: "raises", weight: "moderate", outcome: "helps", how: "An approved trade treaty raises trust about half as much as an alliance does, and an arms-control treaty about two thirds as much." },
      // assistance arms 0.10, stabilization 0.09, grant 0.07
      { from: "Arms, stabilization and development aid", to: "Their trust in you", direction: "raises", weight: "moderate", outcome: "helps", how: "This raises the receiving government's trust in you, not yours in it, and it makes that government more dependent on you." },
      // TREATY_TERMS.executive-agreement trust 0.06; assistance rung 1 relief 0.04
      { from: "An executive agreement or relief shipment", to: "Their trust in you", direction: "raises", weight: "weak", outcome: "helps", how: "The effect is smaller on purpose. An executive agreement needs no vote, and the next President isn't bound by it." },
      // ENGAGEMENT_TERMS visit 0.05, summit 0.03, call/envoy 0.02; ENGAGEMENT_BOUND 0.06
      { from: "Calls, envoys, visits and summits", to: "Trust, both ways", direction: "raises", weight: "weak", outcome: "helps", how: "An accepted engagement can improve both governments' views. Each kind has a waiting period before you can repeat it, and the other side can refuse." },
      // war-tick.ts worldOpinionEffects: -0.02 * (0.5 + intensity) on every uninvolved capital
      { from: "A war you start", to: "Third countries' trust in you", direction: "lowers", weight: "weak", outcome: "hurts", how: "Each week it runs, every uninvolved government loses a little trust in you, and more when the fighting is intense. You also lose 1 point of standing a week, plus 1 more for each earlier war you started." },
      // deedPressure: DEED_FAMILY_WEIGHT military 1, covert 0.8, economic 0.6, diplomatic 0.3; floor -0.2
      { from: "Force, covert action or sanctions that land", to: "How they act toward you", direction: "lowers", weight: "moderate", outcome: "hurts", how: "Hostile conduct counts against cooperation. A deliberate first strike on a trusting partner also records a breach of trust. Belonging to an economic association isn't a defense promise." },
      // grudgeWeight x 0.5 in disposition; BASE_GRUDGE_DECAY 0.12 x (1 - vengefulness)
      { from: "An act that fails where the target can see it", to: "How they act toward you", direction: "lowers", weight: "moderate", outcome: "hurts", how: "Any kind of act can do this. Examples are a snubbed diplomatic move, a sanction that draws retaliation, a covert operation that is exposed, a strike that is repulsed, or aid that is diverted. A failure kept out of view, such as a covert asset lost without anyone noticing, doesn't count. A visible failure leaves a grudge that fades week by week, slowest in a government known for holding grudges." },
    ],
    examples: [{
      kind: "illustration",
      title: "After striking a trusted partner",
      lines: [
        "You order a deliberate strike on a government that trusted the United States. Even if no civilian deaths are reported, that government can treat the attack as a breach of trust.",
        "When it later weighs a treaty or a visit, it takes the damaged relationship into account. A government may go along under pressure and still be unwilling to cooperate by choice.",
        "An accepted diplomatic visit can begin to repair the relationship. It doesn't erase the recorded attack, and it doesn't guarantee that the next agreement will be accepted.",
        "Look at both directions of the relationship and at the history you know. A shared economic organization doesn't create a defense promise, and an unread assessment isn't proof of trust.",
      ],
    }],
    youCan: [
      "Try a call or an envoy. Read the cost and the waiting period first, and allow for a refusal.",
      "Visit a government you want to impress. A visit is the biggest single meeting.",
      "Send aid to raise its trust in you, and sign treaties to raise both views.",
      "Look at each country's page before you use force or sanctions, to see who will react.",
    ],
    next: ["foreign-instruments"],
    terms: ["their-trust", "unread-reading", "security-guarantee", "executive-agreement", "compact"],
  },
  // Chain: combatant-commands.ts commandChain and its drags (execution =
  // 1 - Secretary drag - commander drag - min(.2, reliefs x .05)); congress.ts
  // warPowersStanding; SUCCESSOR_CONFIRMATION_DAYS (84); setCommandPosture;
  // reassignForces; relieveCommander. 10 U.S.C. 162-163 and the Goldwater-Nichols
  // Act of 1986.
  {
    id: "order-to-theater",
    title: "From your order to a theater",
    summary:
      "A military order goes from you to the Secretary of Defense (the civilian who runs the Defense Department) and then to the commander of a theater (the region where a military command works). Each theater can use only the forces assigned to it, and every empty or temporary post along the way weakens the order. Keeping those posts filled helps, and relieving a commander is a decision worth some thought.",
    cast: [
      { label: "You, the President", role: "You give the order and set how ready each command stays.", icon: "sign" },
      { label: "The Secretary of Defense", role: "Passes your order down and decides which forces each command gets.", icon: "departmentDefense", term: "secretary-of-defense" },
      { label: "The Joint Chiefs", role: "They advise you on what the military can do. They stand outside the chain and don't command troops.", icon: "brief", term: "joint-chiefs" },
      { label: "A combatant commander", role: "A four-star officer who runs one region or one job with the forces assigned to it.", icon: "mapPin", term: "combatant-command" },
    ],
    steps: [
      { label: "President", detail: "You give the order or set a command's readiness level.", icon: "sign", term: "chain-of-command", youCan: "Order a military act, or change a command's posture from its panel." },
      { label: "Defense Secretary", detail: "Passes the order on and assigns forces between commands. An empty seat costs the order 30 points, and an acting Secretary costs it 12.", icon: "departmentDefense", youCan: "Move forces between commands, if someone holds the seat.", exit: "With no Secretary at all, forces can't be moved between commands." },
      { label: "Combatant commander", detail: "Runs the theater with the forces assigned to it. An acting commander costs the order 15 points, and each commander you relieve costs 5 more, up to 20.", icon: "mapPin", term: "combatant-command", duration: "An acting commander is confirmed after 12 weeks", youCan: "Relieve a commander, with a written reason. The deputy takes over at once as acting commander.", exit: "An order never fails completely. A broken chain weakens it, but it doesn't stop it." },
      { label: "Forces in the field", detail: "Units from the services assigned to the commander. The posture setting decides how much readiness the theater uses each week.", icon: "flag", term: "command-posture", youCan: "Raise a theater to heightened or surge, and pay for it in readiness." },
    ],
    links: [
      { from: "An empty Secretary of Defense seat", to: "How well every theater carries out orders", direction: "lowers", weight: "strong", outcome: "hurts", how: "Every command loses 30 points at once. An acting Secretary costs 12." },
      { from: "Relieving a commander", to: "How well that theater carries out orders", direction: "lowers", weight: "moderate", outcome: "hurts", how: "The deputy takes over as acting commander (15 points) until the Senate confirms them 12 weeks later. Each relief also costs 5 points for good, up to 20." },
      { from: "Heightened or surge posture", to: "Military readiness", direction: "lowers", weight: "weak", outcome: "hurts", how: "0.4 and 1.2 readiness points a week for each command, for as long as you hold it." },
    ],
    examples: [
      {
        kind: "illustration",
        title: "An order through a weak chain",
        lines: [
          "An acting Secretary of Defense holds the seat. You relieve the Central Command commander, so the deputy becomes acting commander.",
          "You order a strike in the Middle East. The order loses 12 points for the acting Secretary, 15 for the acting commander, and 5 for the relief. Of 100, 68 gets carried out.",
          "After 12 weeks the Senate confirms the deputy, and the 15 points come back. The 5 for the relief stay.",
        ],
      },
      {
        kind: "history",
        title: "Why the chain skips the service chiefs",
        lines: [
          "The Goldwater-Nichols Act of 1986 spelled out the chain. It runs from the President to the Secretary of Defense to the combatant commanders. The service chiefs and the Joint Chiefs advise, and they sit outside it.",
        ],
      },
    ],
    youCan: [
      "Fill the Secretary of Defense seat quickly. An empty seat there costs more than any other empty post.",
      "Relieve a commander only when you have to. The 5 points stay for good.",
      "Raise a theater's posture for a real crisis, and lower it when the crisis ends.",
      "Move forces between commands when a second crisis opens.",
    ],
    next: ["war-powers-clocks", "foreign-instruments"],
    terms: ["chain-of-command", "secretary-of-defense", "joint-chiefs", "combatant-command", "theater", "unified-command-plan", "military-readiness", "command-posture"],
  },
  // Timing: action-timing.ts (a military order executes after 2, 4, 5, 2 or 14 days
  // by rung, up to twice as long for a far target) and instrument-issued.ts
  // resolveDueInstruments; instruments-military.ts resolve runs at execution, so the
  // readiness spent, the unilateral-force costs (congress.ts recordUnilateralForce)
  // and the report obligation (war-powers-report.ts recordForceIntroduction, due 2
  // days after that day) all start then. congress.ts warPowersStanding returns
  // "authorized" first, so a country with a standing authorization is exempt from
  // the pause, and the pause covers the original target as well as any other.
  // Clock: war-powers-report.ts (REPORT_WINDOW_DAYS, terminationStartDay,
  // TERMINATION_WINDOW_DAYS, EXTENSION_DAYS, the sustained-force costs, the
  // missed-report cost); congress.ts warPowersStanding; force-authorization.ts
  // (majorityOf 218 and 51); 50 U.S.C. 1543-1544.
  {
    id: "war-powers-clocks",
    title: "How the War Powers deadlines run",
    summary:
      "The Constitution gives Congress the power to declare war, so a law from 1973 makes a President tell Congress quickly and stop after 60 days unless Congress agrees. In the game, sending forces abroad starts a 48-hour deadline for a report, and fighting starts a 60-day clock. A vote of Congress or bringing the forces home stops the clock, and letting it run out costs you more every week.",
    cast: [
      { label: "You, the President", role: "You send forces, file the report, and decide when to bring them home.", icon: "brief" },
      { label: "Congress", role: "Receives your report and can vote to authorize force. Its goodwill drops when you skip these steps.", icon: "subjectChamber", term: "congress" },
      { label: "The Speaker and the President pro tempore", role: "The two officers your report goes to. One presides over the House. The other is the senator who presides over the Senate when the Vice President doesn't.", icon: "gavel", term: "war-powers-report" },
      { label: "The forces", role: "What you sent. What they do decides which clocks start.", icon: "shield" },
    ],
    steps: [
      { label: "Force goes in", detail: "Moving forces forward requires a report. Blockades, strikes, and invasions require a report and also start the 60-day clock. Exercises require neither. The clocks start when the move takes place. That is 2 to 14 days after you order it, depending on the move, and up to twice that for a far-off target.", icon: "conflict", term: "war-powers-resolution", youCan: "Pick a lower step if you want to avoid starting the clock." },
      { label: "Report within 48 hours", detail: "State what happened, your legal authority, and how big and how long the operation will be. Filing on time earns goodwill in Congress, and a missed deadline costs more.", icon: "dispatch", term: "war-powers-report", duration: "Due 2 days after the move takes place", youCan: "File the report under War Powers deadlines on the Security page." },
      { label: "60 days", detail: "It starts on the day you report, or on the day the report was due, whichever is earlier. The law requires you to end the use of force unless Congress authorizes it or extends the deadline.", icon: "schedule", term: "sixty-day-clock", duration: "60 days", youCan: "Ask Congress to authorize force from that country's page.", exit: "A vote authorizing force against that government ends the clock, and so does bringing the force home." },
      { label: "30 more days", detail: "In the last 14 days, you can certify in writing that you need more time to bring the forces out safely.", icon: "law", duration: "Adds up to 30 days", youCan: "Certify the extension, with your reason, in the last 14 days." },
      { label: "Past the deadline", detail: "Your forces are still there after the law says your authority has run out. Each week costs standing abroad and goodwill in Congress, and the cost rises every week.", icon: "caution", exit: "Until Congress votes or the force comes out, you can't order a blockade, strike, or invasion against any country, the same one included, unless Congress has already authorized force against it." },
    ],
    thresholds: [
      { label: "House: authorize force", needed: 218, of: 435, note: "A simple majority of the House. The game counts a simple majority for this vote." },
      { label: "Senate: authorize force", needed: 51, of: 100, note: "A simple majority of the Senate. Congress is likelier to vote yes against a government that is a real threat." },
    ],
    links: [
      { from: "A blockade, strike or invasion without Congress's approval", to: "Your standing, stability and Congress", direction: "lowers", weight: "moderate", outcome: "hurts", how: "Acting on your own authority costs 3 points of standing, 2.5 of stability, and 9 of Congress's goodwill, charged when the act takes place. For about 9 weeks after, you can't order another blockade, strike, or invasion against any country, the same one included, unless Congress has authorized force against it." },
      { from: "A missed or late report", to: "Congress's goodwill", direction: "lowers", weight: "weak", outcome: "hurts", how: "A deadline that passes unfiled costs 7 points, and filing after that costs 5 more. Filing on time adds 3." },
      { from: "Letting the clock run out", to: "Standing and goodwill in Congress", direction: "lowers", weight: "strong", outcome: "hurts", how: "The first week past the deadline costs 2 points of each, and every further week the forces stay costs 0.3 points more." },
      { from: "A vote authorizing force", to: "The 60-day clock", direction: "shifts", weight: "strong", outcome: "helps", how: "This stops the clock for that country for 52 weeks, and a strike there no longer counts as acting alone." },
    ],
    examples: [
      {
        kind: "illustration",
        title: "One strike, start to finish",
        lines: [
          "Day 0: you order a limited strike on a country. A strike takes about 2 days to carry out (up to 4 for a far-off target), so nothing has happened yet.",
          "Day 2: the strike takes place. Congress hasn't authorized force there, so it costs 3 points of standing, 2.5 of stability, and 9 of Congress's goodwill, plus 8 points of readiness. A report is now due on Day 4.",
          "Day 4: you file the report, naming your legal authority, the scope, and how many weeks you expect. Goodwill rises 3 points. The 60-day clock starts, and it runs out on Day 64.",
          "From Day 50 to Day 64, Congress still hasn't voted. In those last 14 days, you can certify that you need more time to bring the forces out, which moves the deadline to Day 94.",
          "After that, one of three things happens. Congress votes to authorize force, you bring the forces home, or the deadline passes. After the deadline, each week costs 2 points of standing and 2 of goodwill, plus 0.3 more for each further week.",
        ],
      },
      {
        kind: "history",
        title: "Why the Resolution exists",
        lines: [
          "Congress passed the War Powers Resolution in 1973, over President Nixon's veto, after years of fighting in Vietnam that had never been declared. It set the 48-hour report and the 60-day limit used here.",
        ],
      },
      {
        kind: "history",
        title: "When the clock was disputed",
        lines: [
          "In 2011 the United States joined air operations over Libya. As the 60 days ran out, the administration told Congress that the limited American role wasn't 'hostilities' in the law's sense, so the clock didn't require it to stop. Some members of Congress disagreed.",
        ],
      },
    ],
    youCan: [
      "File the report before its 2 days run out.",
      "Ask Congress to authorize force against a government, either before or after you act.",
      "Certify the extra 30 days in the last 14 if the forces need time to leave safely.",
      "Bring the forces home at any point to end the obligation.",
      "Choose a lower step, such as exercises or a forward deployment, if you don't want a 60-day clock to start.",
    ],
    next: ["order-to-theater", "foreign-instruments"],
    terms: ["war-powers-resolution", "war-powers-report", "sixty-day-clock", "use-of-force-authorization"],
  },
  // instruments.ts diplomatic/covert rungs, instruments-economic.ts,
  // instruments-military.ts; action-timing.ts actionTiming (base days per rung,
  // operational and assistance acts up to twice as long for far targets);
  // capacity.ts costs; coalition.ts BACKING_ODDS_LIFT and
  // BACKING_STANDING_RELIEF; consultation.ts.
  {
    id: "foreign-instruments",
    title: "The five instruments of foreign policy",
    summary:
      "A President deals with other governments using five tools. They are diplomacy, economic pressure, covert action, military force, and aid. Each tool has five steps, from mild to severe, and a higher step does more, takes longer, and costs more of something hard to get back. You can pick a step on a country's page to see its price before you order it.",
    steps: [
      { label: "Diplomatic", detail: "The steps are private warning, public statement, recalling the ambassador, coalition pressure (pushing through allies), and severing relations. The first two happen right away. The severe ones take up to 5 days.", icon: "instrumentDiplomatic", duration: "Immediate to 5 days", youCan: "Start here when you want to send a signal without spending anything." },
      { label: "Economic", detail: "The steps are trade advisory (a warning to businesses), tariff, targeted sanctions, asset freeze, and full embargo. An embargo also cuts your own exports. Every step past the advisory needs a real trade relationship with the country, and the heavier ones need reserves or a big economy.", icon: "instrumentEconomic", term: "sanctions", duration: "First report in 1 to 7 days", youCan: "Use it on a country you already trade with." },
      { label: "Covert", detail: "The steps run from surveillance up to covert regime action (working to bring down a government). The top two use up some intelligence capability. From sabotage up, you need to sign a finding (written authorization) first, or the act is recorded as unfounded.", icon: "instrumentCovert", term: "covert-action", duration: "First report in 2 to 14 days", youCan: "Sign a finding for the country before the higher steps." },
      { label: "Military", detail: "The steps are exercises, forward deploy (moving forces closer), blockade, limited strike, and invasion. From the third step on, each uses up national readiness and starts the War Powers clock. A blockade counts as an act of war, so it starts the clock the first time.", icon: "instrumentMilitary", term: "war-powers-resolution", duration: "First report in 2 to 14 days, up to twice as long for far-off targets", youCan: "Check the readiness cost before you order the third step or a higher one." },
      { label: "Assistance", detail: "The steps are relief shipment, development grant, stabilization package, arms transfer, and security guarantee. This is the tool that raises a government's trust in you directly.", icon: "instrumentAssistance", term: "security-guarantee", duration: "First report in 3 to 10 days, up to twice as long for far-off targets", youCan: "Send relief when a friend is having a bad week." },
    ],
    links: [
      { from: "Military steps 3 to 5", to: "National readiness", direction: "lowers", weight: "strong", outcome: "hurts", how: "They cost 5, 8, and 15 points, and readiness recovers 2 a week." },
      { from: "Covert proxy support and regime action", to: "Intelligence capability", direction: "lowers", weight: "moderate", outcome: "hurts", how: "They cost 5 and 10 points, and capability recovers 1.5 a week." },
      { from: "Military blockade, strike or invasion", to: "The War Powers clock", direction: "shifts", weight: "strong", how: "When the move takes place, it starts the 48-hour report deadline and the 60-day clock." },
      { from: "Any assistance step", to: "Their trust in you", direction: "raises", weight: "moderate", outcome: "helps", how: "It raises the receiving government's trust in you." },
      { from: "A full coalition of backing allies", to: "What an economic or military act costs your standing", direction: "lowers", weight: "strong", outcome: "helps", how: "It takes up to 35 percent off the standing cost. It also makes sanctions 12 percent likelier to work and force 6 percent likelier. Covert acts get no help." },
    ],
    examples: [{
      kind: "illustration",
      title: "Climbing the steps against one country",
      lines: [
        "You start with a private warning. It works the same day and lowers your own trust in that country slightly.",
        "The warning fails, so you choose targeted sanctions. You trade with the country and have the reserves, so the step is open. Allies who share a compact with you and trust you back the move, which makes it likelier to work and cheaper in standing abroad.",
        "If you then order a strike, it goes out after about 2 days (up to 4 for a far-off target). Only then does it spend 8 points of readiness. A report becomes due 2 days later, and the 60-day clock starts from the report.",
        "Picking a step on a country's page doesn't order anything yet. It shows the cost, the timing, the odds, and who will react. Only the order button commits you, and the operation then appears in Operations until its first report is due.",
      ],
    }],
    youCan: [
      "Preview any step on a country's page before you order it.",
      "Start low and climb. Each step up costs more and is harder to undo.",
      "Build a coalition of allies before sanctions or force, to raise the odds and cut the cost.",
      "Watch readiness and intelligence capability. Heavy steps spend them, and they recover slowly.",
    ],
    next: ["trust-in-us", "war-powers-clocks"],
    terms: ["sanctions", "covert-action", "security-guarantee", "war-powers-resolution", "military-readiness", "compact"],
  },
  // emergency.ts (declareEmergency, endEmergency, renewEmergency, weeklyStandingCost,
  // EMERGENCY_RENEWAL_TURNS, EMERGENCY_NOTICE_TURNS), response.ts (GOVERNOR_CONSENT,
  // POSTURE_EFFORT, RESPONSE_MEMBERS), obligations.ts ANSWER_ATTENTION_TURNS (6),
  // locale-acts.ts federalize, orders.ts inEmergency; 42 U.S.C. 5170; 50 U.S.C. 1622.
  {
    id: "domestic-emergencies",
    title: "How a disaster becomes a federal emergency",
    summary:
      "Disasters start local. Under the Stafford Act, the governor asks for federal help and the President decides. The game gives you the same choices, plus an emergency declaration that raises the federal response to full effort and opens your strongest powers. A declaration costs standing every week, and the cost grows.",
    cast: [
      { label: "The governor", role: "The state's elected leader. A governor who is friendly to you sends the state's agencies into the response.", icon: "flag" },
      { label: "The state's agencies", role: "The state's own emergency teams. They join only if the governor is friendly or you declare an emergency.", icon: "building" },
      { label: "FEMA and other federal agencies", role: "Federal teams that work the disaster, led by the Federal Emergency Management Agency (FEMA). They run at low effort unless you act.", icon: "departmentHomelandSecurity", term: "fema" },
      { label: "You, the President", role: "You decide whether to declare an emergency, renew it, or end it.", icon: "sign", term: "national-emergency" },
    ],
    steps: [
      { label: "It starts at home", detail: "Cities and states respond first. The Emergency page lists each disaster, how severe it is, and who is responding.", icon: "caution", youCan: "Watch the Emergency page for new disasters." },
      { label: "The governor asks", detail: "By law, a major disaster declaration starts with a governor's request. In the game, federal help doesn't wait for the request. A governor who leans toward you sends the state's own agencies into the response.", icon: "flag", term: "stafford-act", youCan: "Answer a state's request for relief with an act aimed at that state, to raise federal effort for 6 weeks." },
      { label: "Federal standby", detail: "Unless you answer the state or declare an emergency, federal help stays at about a third of full effort, run by career staff, whatever the governor does.", icon: "building", term: "fema" },
      { label: "You declare", detail: "Pick one state or the whole nation. A disaster must be running there, and none can already be declared. Every agency on the disaster steps up to full effort, and the state's agencies join. A state declaration opens acts like federalizing the Guard (taking command of a state's National Guard over the governor's objection). A nationwide one, like a war, also opens the strongest executive orders.", icon: "law", term: "national-emergency", duration: "Lapses after 52 weeks unless renewed in the last 13", youCan: "Declare an emergency from the Emergency page.", exit: "You can end it early, and the response steps back down." },
      { label: "The price", detail: "It costs standing every week, and the cost grows by 2 percent of the first week's cost each week, so it doubles after about a year. Renewing doesn't reset it.", icon: "caution", youCan: "End the emergency when the need has passed." },
    ],
    links: [
      { from: "A friendly governor or a declaration", to: "The states' agencies joining the response", direction: "raises", weight: "strong", outcome: "helps", how: "These are the only two ways. You can't order a state to join a federal response." },
      { from: "A declaration", to: "Federal response effort", direction: "raises", weight: "strong", outcome: "helps", how: "Every agency working on the disaster moves from about a third of full effort to all of it." },
      { from: "Answering a state's request for relief", to: "Federal response effort", direction: "raises", weight: "moderate", outcome: "helps", how: "Effort goes up to about 70 percent for 6 weeks, without a declaration." },
      { from: "Each week a declaration stands", to: "Your standing", direction: "lowers", weight: "weak", outcome: "hurts", how: "It costs about 0.15 points the first week, and the cost rises by 2 percent of that for every week it stands." },
    ],
    examples: [
      {
        kind: "illustration",
        title: "A flood in a state that doesn't lean your way",
        lines: [
          "Week 1: a flood hits. The governor doesn't lean toward you, so the state's agencies stay out and FEMA works at about a third of full effort.",
          "You declare an emergency over the flood. The state's agencies join, FEMA surges to full effort, and the flood costs the country less. Even a perfect response takes at most 45 percent off the bill.",
          "Each week the declaration stands costs about 0.15 points of standing, and a little more each week. At week 52 it lapses unless you renewed it in the last 13 weeks.",
        ],
      },
      {
        kind: "history",
        title: "A governor asks first",
        lines: [
          "In August 2005, with Hurricane Katrina heading for the Gulf Coast, Louisiana's governor asked for a federal emergency declaration. President Bush approved it before the storm made landfall.",
        ],
      },
    ],
    youCan: [
      "Answer a state's request with an act aimed at that state when you want more effort without a declaration.",
      "Declare an emergency when a disaster is large and the governor won't bring the state in.",
      "Renew within the last 13 weeks, and only if the emergency is still needed.",
      "End it as soon as the need has passed, because each week costs more than the one before.",
    ],
    next: ["war-powers-clocks"],
    terms: ["stafford-act", "national-emergency", "fema"],
  },
];
