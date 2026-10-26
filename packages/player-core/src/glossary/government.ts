import type { Explainer, GlossaryEntry } from "./types.js";

// Congress, the Executive, the courts and the people in their chairs.

export const GOVERNMENT_GLOSSARY: readonly GlossaryEntry[] = [
  // The civics floor: the bodies every other entry names. engine congress.ts
  // (chambers, seats), bill-stages.ts (a bill's passage), legislation.ts (the desk),
  // hill.ts HILL_POSTS (the Speaker's influence, .14), judiciary.ts
  // JUDICIARY_SEAT_COUNT (9); cabinet.ts discipline and revoltPacket (the Chief
  // of Staff scales a break's odds and its cost by up to 15 percent).
  {
    id: "congress",
    term: "Congress",
    icon: "subjectCapitol",
    definition:
      "Congress writes the country's laws and decides how the government spends its money. It has two halves, the House of Representatives and the Senate, and a bill has to pass both before it can reach the President.",
    example: "Before the government can build a new highway program, Congress has to pass a law that pays for it.",
    inGame:
      "Congress votes on your bills, your budget and your nominees. It can also investigate you, and in the end remove you. The more goodwill it has toward you, the easier each vote gets. The Congress page shows its mood and its counts.",
    related: ["house", "senate", "bill", "hill-mood", "executive-branch"],
  },
  {
    id: "house",
    term: "House of Representatives",
    icon: "subjectChamber",
    definition:
      "The larger half of Congress, with 435 members. Each member is elected for two years to speak for one district in a state, and bigger states get more seats. The majority party chooses the Speaker, who leads the House.",
    example: "California has 52 seats in the House and Wyoming has 1, because seats follow population.",
    inGame:
      "A bill passes the House with a simple majority, which is 218 of 435 when every seat is filled. Every seat is up for election at the midterm, halfway through your term.",
    related: ["congress", "senate", "speaker", "majority", "midterm-election"],
  },
  {
    id: "senate",
    term: "Senate",
    icon: "subjectChamber",
    definition:
      "The smaller half of Congress. It has 100 senators, two from every state no matter its size, and each serves a six-year term. The Senate also confirms the President's nominees and approves treaties.",
    example: "Wyoming and California each have two senators, so a small state counts as much here as a large one.",
    inGame:
      "Most bills, including the yearly spending bills, need 60 of 100 senators, because anything less can't end a debate the other side wants to keep going. Nominees need only a majority, which is 51. So do tax and spending bills passed through the special budget process called reconciliation.",
    related: ["congress", "house", "filibuster", "cloture", "confirmation"],
  },
  {
    id: "speaker",
    term: "Speaker of the House",
    icon: "gavel",
    definition:
      "The Speaker leads the House of Representatives and comes from the party with the most seats. The Speaker decides which bills come up for a vote, so a bill the Speaker opposes rarely gets one.",
    example: "A bill can have enough votes to pass the House and still never get a vote, if the Speaker won't put it on the schedule.",
    inGame:
      "About 14 percent of the House follows the Speaker's lead in the game, more than any other single leader. When the House changes hands at a midterm, the Speaker changes too.",
    related: ["house", "congress", "committee-leaders"],
  },
  {
    id: "bill",
    term: "Bill",
    icon: "law",
    definition:
      "A proposed law. Only a member of Congress can formally introduce one, so a President's proposals are introduced by allies on the Hill. A bill becomes law when the House and Senate pass the same text and the President signs it, or when Congress overrides a veto.",
    example: "A bill to raise the federal minimum wage has to pass the House and the Senate in identical words before it goes to the President.",
    inGame:
      "Bills reach Congress two ways. You can send one yourself, or Congress can take one up on its own when conditions call for it. Either kind moves one week at a time, and it can die along the way.",
    related: ["congress", "markup", "veto"],
  },
  // engine congress.ts floorThreshold: the Senate's ordinary track needs
  // clotureOf(seats); every other track needs a majority.
  {
    id: "cloture",
    term: "Cloture",
    icon: "gavel",
    definition:
      "The Senate vote that ends debate so a measure can come to a final vote. It takes three fifths of the Senate, 60 of 100, which is why a determined minority can stall most bills. For nominations a simple majority is enough, a rule the Senate adopted in 2013 and extended to the Supreme Court in 2017.",
    example: "A bill has 55 senators in favor, but it can't get a final vote until 60 senators agree to end the debate.",
    inGame:
      "Before an ordinary bill gets its final vote, 60 senators have to agree to end debate. A budget reconciliation bill and a nominee need only a majority.",
    related: ["filibuster", "majority", "reconciliation", "veto-override"],
  },
  {
    id: "filibuster",
    term: "Filibuster",
    icon: "microphone",
    definition:
      "A Senate tactic where senators keep a debate going, or only threaten to, so a measure never reaches a vote. Ending debate takes 60 votes, so 41 senators can stop most bills. Today the threat alone is usually enough.",
    example: "If 41 senators say they'll keep debating a tax bill, it can't come to a final vote unless 60 senators vote to end the debate.",
    inGame:
      "You won't see any speeches. The game stands in for the threat of a filibuster with the 60-vote bar on an ordinary bill. Budget reconciliation bills and nominees skip it.",
    related: ["cloture", "senate", "reconciliation"],
  },
  // engine legislation.ts owns the veto and the override; congress-votes.ts
  // counts an override as a vote to bind the President.
  {
    id: "veto-override",
    term: "Veto override",
    icon: "reject",
    definition:
      "Congress can make a vetoed bill law anyway if two thirds of each chamber vote for it. It's rare, since Congress has overridden only a small share of regular vetoes.",
    example: "You veto a bill, and Congress votes again. If 290 representatives and 67 senators say yes, it becomes law over your objection.",
    inGame:
      "The game counts an override as a vote against you. The more Congress leans against you, the more of the other side votes to override. When it leans against you strongly, up to about a third of your own caucus may cross over too.",
    related: ["veto", "cloture", "two-thirds"],
  },
  // engine signing-window.ts: SIGNING_DAYS, and the pocket veto is not modeled.
  {
    id: "veto",
    term: "Veto",
    icon: "veto",
    definition:
      "The President's refusal to sign a bill. The President sends it back to Congress with the reasons, and has ten days, not counting Sundays, from the day the bill arrives to decide.",
    example: "Congress passes a bill that cuts a program you care about. You veto it and send it back with your objections.",
    inGame:
      "A bill you leave unsigned for 10 days becomes law without your signature. The game leaves out the pocket veto, where a bill dies unsigned because Congress has adjourned, since Congress never adjourns here.",
    related: ["veto-override", "bill"],
  },
  // engine bill-stages.ts BILL_STAGES markup stage, STAGE_BIAS (markup 0,
  // referral .15, floor .1), BILL_SETBACK_LIMIT (3).
  {
    id: "markup",
    term: "Markup",
    icon: "review",
    definition:
      "The committee meeting where members debate and amend a bill. They then vote on whether to send it to the full chamber or hold it back. Most bills that die, die here.",
    example: "A committee hearing a farm bill rewrites two sections, drops a third, and votes to send the new version to the full House.",
    inGame:
      "Markup is the hardest of a bill's three stages, and it depends on how friendly that one committee is to you. Three stalled weeks in total, at any stage, kill a bill. They don't have to come in a row.",
    related: ["senate-committee", "committee-leaders", "bill"],
  },
  // engine congress.ts majorityOf and floorThreshold; confirmation-count.ts
  // confirmationQuestion and nomination-stages.ts clotureWouldSucceed both
  // count a nominee against majorityOf the Senate's seats.
  {
    id: "majority",
    term: "Majority",
    icon: "ballot",
    definition:
      "More than half of the members voting. With every seat filled, that's 218 of 435 in the House and 51 of 100 in the Senate. In a 50-50 Senate, the Vice President casts the deciding vote.",
    example: "If all 435 representatives vote, 218 yes votes pass a bill and 217 do not.",
    inGame:
      "The House needs a majority to pass a bill. The Senate needs one to confirm a nominee, to end debate on a nominee, and to pass a reconciliation bill. The Congress page draws the line at more than half of the seats each chamber holds right now.",
    related: ["cloture", "two-thirds", "reconciliation"],
  },
  // engine congress.ts supermajorityOf, used by legislation.ts (override,
  // both chambers), treaties.ts (Senate) and removal-votes.ts (Senate conviction).
  {
    id: "two-thirds",
    term: "Two thirds",
    icon: "ballot",
    definition:
      "The bar the Constitution sets for overriding a veto, for the Senate to consent to a treaty or convict an impeached official, and for Congress to propose an amendment. It means two thirds of the members present and voting, or 290 of 435 in the House and 67 of 100 in the Senate.",
    example: "A treaty with another country needs the consent of two thirds of the senators present, which is 67 if all 100 vote. The President then ratifies it, which makes it official.",
    inGame:
      "Overriding a veto takes it in both chambers. A treaty and a conviction need it in the Senate, which is 67 of 100.",
    related: ["veto-override", "majority", "conviction"],
  },
  // engine reconciliation.ts: a matching adopted budget instruction activates
  // the expedited route; continuing resolutions and appropriations stay ordinary.
  {
    id: "reconciliation",
    term: "Reconciliation",
    icon: "budget",
    definition:
      "A budget procedure for spending, revenue and debt-limit legislation. Debate on a reconciliation bill is capped by law, so it can't be filibustered and a simple majority can pass it.",
    example: "After both chambers adopt a budget instruction, an eligible tax bill can pass the Senate with 51 votes. A stopgap funding bill still needs cloture.",
    inGame:
      "An eligible spending, revenue or debt-limit bill gets the majority route only after Congress adopts a budget instruction for it. Without one, the bill faces ordinary cloture. Continuing resolutions and regular appropriations never qualify.",
    related: ["cloture", "majority", "filibuster", "debt-limit", "continuing-resolution"],
  },
  // Real: Constitution, Article II, Section 2, clause 2. Game: nomination-stages.ts
  // NOMINATION_LEGS, resolveStage; confirmation-count.ts confirmationQuestion.
  {
    id: "confirmation",
    term: "Advice and consent",
    icon: "appoint",
    definition:
      "The Constitution lets the President nominate cabinet secretaries, judges, ambassadors and other senior officers, but they can take office only with the advice and consent of the Senate. A committee holds a hearing and decides whether to send the nomination on, then the full Senate votes. A majority confirms.",
    example: "Before a new Secretary of State can take the job, a Senate committee holds a hearing and the full Senate votes on the nomination.",
    inGame:
      "A nomination goes through four stages: White House vetting, a Senate committee, the full Senate, and the swearing-in. It can fail three ways. The committee may never send it on, the Senate may be unable to end debate on it, or the Senate may vote it down. A majority of the Senate confirms.",
    related: ["senate-committee", "majority", "cloture", "cabinet"],
  },
  // engine committees.ts committeePanel, blend, GAVEL_SHARE; bill-stages.ts
  // markup reads committeeDisposition; nomination-stages.ts committeeWouldReport.
  {
    id: "senate-committee",
    term: "Committee",
    icon: "review",
    definition:
      "A standing panel of senators that handles one subject. It holds hearings, amends measures, and decides whether to send them to the full Senate. A chair from the majority party runs it, and a ranking member speaks for the minority.",
    example: "The Armed Services Committee holds the hearing on a nominee for Secretary of Defense before the full Senate votes.",
    inGame:
      "Each Senate committee handles the nominations for the offices it oversees, along with the bills sent to it. How friendly it is toward you is an even mix of Congress's overall goodwill and the views of its chair and its ranking member, the senior member of the minority. A hostile committee can sit on a nomination until it's sent back to you.",
    related: ["markup", "confirmation", "committee-leaders"],
  },
  // engine committees.ts blend: within the pair, the chair's weight is GAVEL_SHARE
  // (.5) plus half of the majority's share of the panel, so never under .75 (the
  // ranking member takes the rest); then PANEL_GRAVITY (.5) puts the committee
  // exactly halfway between the room's goodwill and the pair's combined view. So
  // the pair is half of the committee's own view, and the chair at least three
  // quarters of the pair.
  {
    id: "committee-leaders",
    term: "Committee chair and ranking member",
    icon: "subjectPerson",
    definition:
      "The chair of a committee belongs to the party that runs the chamber and controls the committee's agenda. The ranking member is the most senior member of the other party on the committee and speaks for it.",
    example: "On the committee that handles farm bills, the chair decides when a hearing is held, and the ranking member leads the other party's questions.",
    inGame:
      "Every Senate committee has both. Together, their view of you makes up half of the committee's own view, and Congress's overall goodwill makes up the other half. The chair counts for at least three quarters of that pair, and more when the chair's party holds a wide majority on the committee. The ranking member counts for the rest.",
    related: ["senate-committee", "speaker", "hill-mood"],
  },
  // engine congress.ts dispositionTarget, DISPOSITION_DRIFT; the figure is
  // congress.disposition.
  {
    id: "hill-mood",
    term: "Congress's goodwill",
    icon: "layerTrust",
    definition:
      "How willing members of Congress are to take the President's calls, back the President's bills and approve the President's nominees. It tends to follow public approval, and it drops when a President goes around Congress or comes under investigation.",
    example: "When a President's approval keeps falling, committee chairs get slower to schedule hearings for the President's nominees.",
    inGame:
      "The Congress page shows it as \"Toward you,\" on a scale from 0 to 100. Each week it moves up to 4 points toward a target set by your approval and by what Congress sees you doing. Higher goodwill helps your bills through committee and your nominees through the Senate.",
    related: ["majority", "confirmation", "committee-leaders"],
  },
  // Real: Art. III, Sec. 1 (good behavior); Marbury v. Madison (1803);
  // Youngstown v. Sawyer (1952). Game: judicial-review.ts judicialReviewPhase,
  // orders.ts JUDICIAL_REVIEW_TURNS and the review record.
  {
    id: "judicial-review",
    term: "Judicial review",
    icon: "court",
    definition:
      "The power of federal courts to rule that a law or an executive act violates the Constitution, and to refuse to enforce it. The Supreme Court claimed it over acts of Congress in 1803, and it used it on President Truman's 1952 seizure of the steel mills.",
    example: "A group sues over a presidential order, and a court rules that the President had no power to issue it. The order stops having effect.",
    inGame:
      "A challenge moves through the docket in stages: threshold review, interim relief, a lower-court decision, and a possible appeal. Review can be denied. Some cases test a particular power Congress granted. The case record shows the stage a case has reached and how far the ruling goes.",
    related: ["struck-down", "congress-word", "supreme-court"],
  },
  // engine judicial-review.ts STRUCK_DOWN_COST; congress.ts STRUCK_ORDER_MOOD_COST,
  // STRUCK_ORDER_MOOD_CAP, STRUCK_ORDER_SEASON_TURNS; elections.ts RECORD_PENALTIES.
  {
    id: "struck-down",
    term: "Struck down",
    icon: "reject",
    definition:
      "A court's ruling that an order or law is unconstitutional or unlawful, so it can't stand. The opposite ruling, upheld, means it stands.",
    example: "A court rules that an order closing a federal program went beyond the President's powers, and the program reopens.",
    inGame:
      "The remedy names what the decision stops or limits. Effects that can be reversed are removed once. Money already spent, debt and harm already suffered aren't refunded. A limited ruling doesn't repeal unrelated provisions.",
    related: ["judicial-review", "hill-mood"],
  },
  // Real: Justice Jackson, concurring, Youngstown Sheet & Tube Co. v. Sawyer
  // (1952). Game: legislative-acts.ts ConstitutionalGround; strike-odds.ts
  // groundFactor (AUTHORIZED_RELIEF .45) and STRIKE_MAX (.9).
  {
    id: "congress-word",
    term: "Congress's word on an order",
    icon: "law",
    definition:
      "In the steel seizure case, Justice Jackson sorted presidential action into three kinds. When Congress has authorized it, a President's power is at its greatest. When Congress is silent, the power is uncertain. When the President acts against Congress's will, it's at its lowest ebb.",
    example: "Congress passes a law allowing emergency tariffs. A tariff order that rests on that law stands on much firmer ground than one Congress has banned.",
    inGame:
      "If Congress passes a law that authorizes an order, the game lowers that order's overreach by 45 percent when it works out the odds of a strike-down. If a law forbids the order, the odds rise to the 90 percent maximum. Most orders have neither, and face the usual odds.",
    related: ["judicial-review", "struck-down", "executive-order"],
  },
  {
    id: "executive-branch",
    term: "Executive branch",
    icon: "subjectSeal",
    definition:
      "The part of the federal government that carries out the laws. It includes the President, the cabinet, and the departments and agencies they run. Congress writes the laws, the executive branch puts them to work, and the courts settle disputes about them.",
    example: "Congress passes a law setting a safety standard for toys. The executive branch writes the detailed rules and sends inspectors to the factories.",
    inGame:
      "You head it. You sign or veto bills, issue executive orders, nominate officials, and answer the decisions that reach your Desk. The cabinet secretaries run the departments and advise you, and the Executive page shows who sits where.",
    related: ["cabinet", "congress", "supreme-court", "executive-order", "attorney-general"],
  },
  // Real: the President removes cabinet secretaries at will. Game: appointments.ts
  // vacates (the senior deputy acts), DISMISSAL_STANDING_FLOOR (.02) and
  // DISMISSAL_CHARISMA_WEIGHT (.05); counsel.ts (for, against, wary).
  {
    id: "cabinet",
    term: "Cabinet",
    icon: "dossier",
    definition:
      "The President's senior advisers, each of whom runs a large department such as State, Defense, Treasury or Justice. The Senate has to confirm each one, but the President can dismiss any of them at will.",
    example: "The Secretary of Defense runs the military's department and tells the President what the military can and cannot do in a crisis.",
    inGame:
      "You nominate each secretary, and the Senate confirms. When you face a decision, the secretaries with a stake argue for or against each answer. Each one has loyalty, ambition, competence and integrity, and each week one of them may break with you. If a chair is empty, the department's senior deputy runs it until a nominee is confirmed.",
    related: ["executive-branch", "cabinet-loyalty", "cabinet-ambition", "cabinet-competence", "cabinet-integrity", "chief-of-staff", "confirmation"],
  },
  // engine cabinet.ts chiefOfStaffDiscipline (DISCIPLINE_BOUND .15, centered on a
  // reading of .75 from competence and loyalty), breakRateOf; cabinet-revolt.ts
  // revoltPacket (contained = 1 minus the discipline).
  {
    id: "chief-of-staff",
    term: "Chief of Staff",
    icon: "westWing",
    definition:
      "The President's top aide. The chief runs the White House staff, decides what reaches the President, and keeps the cabinet working together. The chief doesn't run a department, and the Senate doesn't vote on the job, though presidents usually give the chief cabinet rank anyway.",
    example: "When two secretaries disagree about a plan, the chief of staff decides how the argument reaches the President.",
    inGame:
      "A strong chief, with both competence and loyalty high, cuts every secretary's weekly chance of breaking with you by up to 15 percent. A strong chief also trims what a break costs by the same share. A weak chief raises both by up to 15 percent.",
    related: ["cabinet", "cabinet-loyalty"],
  },
  // Real: Art. III (nine is set by statute). Game: judiciary.ts JUDICIARY_SEAT_COUNT;
  // judicial-review.ts; a vacant seat fills only by Senate confirmation.
  {
    id: "supreme-court",
    term: "Supreme Court",
    icon: "court",
    definition:
      "The highest court in the country. Nine justices decide by majority vote what the Constitution allows, and they serve for life unless they resign or are removed. The President nominates each justice, and the Senate confirms.",
    example: "If a state and the federal government disagree about what the Constitution allows, the Supreme Court has the last word.",
    inGame:
      "The Court has nine seats. A death or retirement can open one, and then you nominate and the Senate considers your pick. A ruling needs six participating justices. The Courts page keeps pending proceedings and completed decisions.",
    related: ["judicial-review", "struck-down", "ideology"],
  },
  // Real: the three axes' names. Game: world IDEOLOGY_AXIS_POLES; strike-odds.ts
  // ideologyDistanceFromLean (mean gap over the three axes) and orderDomainLean.
  {
    id: "ideology",
    term: "Political leaning",
    icon: "graph",
    definition:
      "Where a person stands on the big political questions. The game uses three scales. One covers the economy (how much government should do, left to right), one covers power over people (libertarian to authoritarian), and one covers the nation versus the world (nationalist to globalist).",
    example: "A senator who wants lower taxes and fewer regulations sits toward the right on economics. One who wants large public programs sits toward the left.",
    inGame:
      "Political differences are one input in the simulation. A justice's vote also depends on the power being challenged, the statutory authority, and the justice's professional characteristics. A political chart can't predict a recorded vote.",
    related: ["supreme-court", "judicial-review"],
  },
  // Real: the President removes cabinet secretaries at will. Game: cabinet.ts
  // cabinetRiskRate; loyalty.ts OVERRULED_COST (-.02), HEEDED_GAIN (.008),
  // POLITICAL_FLOOR (.1, politics only, never overruling), CROSSING_WEEKLY,
  // DISTANCE_WEEKLY, SLUMP_*.
  {
    id: "cabinet-loyalty",
    term: "Loyalty",
    icon: "layerTrust",
    definition:
      "How far an officer stays with the President when their own interests or views pull the other way. Cabinet secretaries serve at the President's pleasure, so a disloyal one usually shows it through leaks and resignations rather than open refusal.",
    example: "A secretary whose advice is brushed aside again and again starts talking to reporters.",
    inGame:
      "Low loyalty is what drives a secretary to leak, resign or build a rival faction. Each time you pick an answer a secretary argued against, their loyalty drops 2 points. Picking one they argued for wins back 0.8 of a point. Politics wears loyalty down slowly, as with a secretary from the other party or one whose views sit far from yours, but never more than 10 points below where it started. Being overruled has no such floor.",
    related: ["cabinet-integrity", "cabinet-ambition", "rival-faction"],
  },
  // engine cabinet.ts CHALLENGE_AMBITION_FLOOR, CHARISMATIC_AMBITION_DISCOUNT,
  // CHALLENGE_LOYALTY_CEILING; loyalty.ts SLUMP_AMBITION (.65), SLUMP_APPROVAL
  // (.4); appointments.ts RESENTMENT_AMBITION_FLOOR (.65). The same numbers are
  // restated in player-core dossier/attribute-consequence.ts.
  {
    id: "cabinet-ambition",
    term: "Ambition",
    icon: "flag",
    definition:
      "How much an officer wants a bigger role, in this administration or after it. A loyal, ambitious secretary wants a promotion. One who has lost faith in the President may build a following of their own.",
    example: "A secretary who is already talking about running for governor someday is ambitious.",
    inGame:
      "Ambition doesn't decide whether a secretary breaks with you. That weekly chance follows loyalty and integrity. Ambition decides what kind of break it is. When the roll hits a secretary with ambition of 65 or more (55 if charismatic) and loyalty of 60 or below, they build a rival faction inside your administration instead of resigning or leaking. That adds to the pressure to remove you. A secretary who already leads a faction resigns instead. While your approval is under 40 percent, a secretary with ambition of 65 or more also loses a little loyalty each week. An ambitious secretary you fire leaves as a rival faction.",
    related: ["cabinet-loyalty", "cabinet-integrity", "rival-faction"],
  },
  // player-core dossier/attribute-consequence.ts COMPETENCE_CABINET;
  // engine confirmation-count.ts nomineeAppeal (competence .6 of the record);
  // stewardship.ts STEWARD_SWAY (.2, so up to 10 percent either way, an empty
  // chair counts as .3); counsel.ts ODDS_BLUR; loyalty.ts competenceDecayFor.
  {
    id: "cabinet-competence",
    term: "Competence",
    icon: "dossier",
    definition:
      "How capable an officer is at running a department and giving the President sound advice. When the Senate weighs a nominee, it reads the record for this.",
    example: "A Treasury Secretary who has run a bank and a budget office is competent for the job.",
    inGame:
      "When you act through an instrument, such as a military, economic or diplomatic move, the secretary who owns that area shifts its odds of success by up to 10 percent either way. An empty chair counts as weak. A less competent secretary also reads the odds less accurately when advising you. Competence wears down slowly while a department is failing to deliver. When the Senate votes on a nominee, competence is 60 percent of the record it judges.",
    related: ["cabinet-loyalty", "cabinet-integrity"],
  },
  // engine cabinet.ts INTEGRITY_RESTRAINT (.6); nomination.ts vettingFindings
  // (integrity under .35 is a controversy); confirmation-count.ts nomineeAppeal.
  {
    id: "cabinet-integrity",
    term: "Integrity",
    icon: "shield",
    definition:
      "What keeps an officer from acting on a grievance. An officer with integrity can be unhappy with a President and still not leak or sabotage.",
    example: "Two secretaries are equally unhappy with you. The one with integrity complains to you in private, and the other leaks to the press.",
    inGame:
      "At full integrity, the weekly chance that an unhappy secretary leaks, resigns or turns on you is cut by 60 percent. No one is completely safe. A nominee with integrity under 35 draws a controversy at vetting, and integrity is 40 percent of the record the Senate judges.",
    related: ["cabinet-loyalty", "cabinet-ambition"],
  },
  // engine cabinet-faction.ts FACTION_SEATED_WEIGHT (.6), FACTION_DEPARTED_WEIGHT
  // (.25), FACTION_RIPENS_OVER_DAYS (168), FACTION_NEW_SHARE (.25),
  // RECONCILE_STANDING_FLOOR (.02), RECONCILE_STANDING_PER_MEMBER (.01),
  // RECONCILE_LOYALTY_LIFT (.08); cabinet-revolt.ts primaryPacket (stability
  // .04 plus .04 times ambition); removal.ts PRESSURE_WEIGHTS.faction (.08).
  {
    id: "rival-faction",
    term: "Rival faction",
    icon: "conflict",
    definition:
      "A group of officials who gather around a leader of their own instead of the President. Inside a party or an administration, it usually means someone is preparing to challenge the person at the top.",
    example: "A cabinet secretary starts meeting donors and party activists who want a different candidate at the top of the ticket.",
    inGame:
      "A faction forms when an ambitious, disloyal secretary breaks with you, or when you fire an ambitious one. A break costs 4 points of stability, plus up to 4 more for a very ambitious leader, and a firing costs 3. The faction adds to the pressure to remove you, starting at a quarter of its weight and reaching full weight after 24 weeks. Firing the leader doesn't end it. From the Executive page you can bring a faction back inside, which costs 2 points of standing plus 1 for each member and raises the loyalty of members still in your cabinet by 8 points.",
    related: ["cabinet-ambition", "cabinet-loyalty", "caucus-break"],
  },
];

export const GOVERNMENT_EXPLAINERS: readonly Explainer[] = [
  // engine bill-stages.ts: BILL_STAGES, BILL_SETBACK_LIMIT (3), STAGE_BIAS
  // (referral easiest, markup hardest), advanceChance (markup reads the
  // committee's disposition, the other stages Congress's), outcomeOf (the four
  // weekly outcomes), resolveWeek (setbacks add up across the bill's whole life, in
  // every stage; a floor vote that cannot carry stalls; a floor draw that succeeds
  // on a bill whose count at introduction did not carry, and still does not, is
  // voted down and dies, whoever sponsored it, via everCarried and bill.passage;
  // a bill that carries waits for a free desk);
  // congress.ts floorThreshold, majorityOf, clotureOf; signing-window.ts
  // SIGNING_DAYS (10, Sundays excepted; the pocket veto is not modeled);
  // legislation.ts override at two thirds of both chambers.
  {
    id: "bill-to-law",
    title: "How a bill becomes law",
    summary:
      "A bill is a proposed law. To become one, it has to clear a committee, win votes in both halves of Congress, and get your signature. Most bills that fail die in committee, before anyone votes.",
    cast: [
      { label: "You, the President", role: "Propose bills, then sign or veto the ones Congress passes.", icon: "sign" },
      { label: "A committee", role: "A small group of members who handle one subject, like farming or defense. They rewrite a bill or hold it.", icon: "review", term: "senate-committee" },
      { label: "The House", role: "435 members. A bill needs a simple majority here.", icon: "subjectChamber", term: "house" },
      { label: "The Senate", role: "100 senators. Most bills need 60 votes to end debate, then a separate majority to pass. Reconciliation takes a different route.", icon: "subjectChamber", term: "senate" },
    ],
    steps: [
      {
        label: "Sent to committee",
        detail: "The bill goes to the committee that covers its subject. This step is usually a formality.",
        icon: "folder",
        duration: "Often 1 to 2 weeks",
        youCan: "Send your own bills from the Congress page.",
      },
      {
        label: "Markup",
        detail: "The committee debates the bill, changes it, or sets it aside. This is the hardest step, and what matters is how friendly that one committee is to you, not Congress as a whole.",
        term: "markup",
        icon: "review",
        duration: "Often several weeks",
        exit: "Three stalled weeks in total, counted across every step and not necessarily in a row, kill the bill.",
      },
      {
        label: "Votes in Congress",
        detail: "Each chamber votes on the bill, and it moves on only if it has the votes in both. If the count isn't there, the bill waits and can stall.",
        term: "cloture",
        icon: "subjectChamber",
        duration: "1 week if the votes are there",
        exit: "A bill that lacked the votes when it was introduced, and still lacks them when the floor takes it up, is voted down and dies. That can happen to your own bills too.",
        youCan: "Check the public support assessment and its evidence. Recorded votes appear only after a vote happens.",
      },
      {
        label: "Your desk",
        detail: "You have 10 days, not counting Sundays, to sign the bill into law or veto it. If you do nothing, it becomes law anyway. Only one bill sits on your desk at a time, so a bill that has passed waits its turn.",
        term: "veto",
        icon: "sign",
        duration: "Up to 10 days",
        youCan: "Sign it or veto it from your Desk.",
        exit: "If two thirds of both chambers vote to override your veto, the bill becomes law without you.",
      },
    ],
    thresholds: [
      { label: "House: pass a bill", needed: 218, of: 435, note: "A simple majority of the House." },
      { label: "Senate: most bills", needed: 60, of: 100, note: "Fewer than 60 can't end a debate the other side keeps going, so 60 is the real bar for most bills." },
      { label: "Senate: reconciliation", needed: 51, of: 100, note: "Some tax and spending bills go through a special budget process, called reconciliation, that needs only a majority." },
      { label: "Override a veto", needed: 290, of: 435, note: "Two thirds of the House. The Senate needs 67 of 100 as well." },
    ],
    examples: [
      {
        title: "Following one bill",
        kind: "illustration",
        lines: [
          "You send a housing bill to committee. Introducing it spends no program money and builds no homes.",
          "A targeted amendment changes who receives support and lowers the annual cost. The bill document shows the text and the price before you choose it.",
          "The two chambers can adopt different texts. Conference settles on one text, and both chambers must then accept it.",
          "Ending Senate debate doesn't pass the bill. After the separate passage votes, the enrolled text reaches your desk. Its program begins only if it becomes law.",
        ],
      },
      {
        title: "A bill that failed, then passed",
        kind: "history",
        lines: [
          "In September 2008, during the financial crisis, the House voted down a $700 billion plan to rescue the banks, 228 against and 205 for. Stock markets fell sharply that day.",
          "Congressional leaders changed the bill to win more votes. The Senate passed the new version on October 1 and the House on October 3, and President Bush signed it the same day.",
        ],
      },
    ],
    youCan: [
      "Keep Congress's goodwill up. It raises your odds at every step, and markup reads the goodwill of the committee that has your bill.",
      "Send your own bills from the Congress page, and watch them move week by week.",
      "Read the support assessment and its uncertainty before a bill reaches the floor.",
      "Sign or veto the bills that reach your Desk. A veto sticks unless two thirds of both chambers override it.",
    ],
    next: ["congress-counts", "hill-mood-drivers"],
    terms: ["bill", "house", "senate", "markup", "cloture", "filibuster", "veto", "veto-override"],
  },
  // Weights on the links below read the size of the engine's own constant:
  // strong is 0.3 or more of the thing it moves (or a gate that decides an
  // outcome outright), moderate 0.1 to 0.3, weak under 0.1.
  //
  // engine nomination-stages.ts STAGE_DAYS, NOMINATION_LEGS, DISPOSITION_STRETCH
  // (1.6), CONTROVERSY_STRETCH_PER (.35), CONGESTION_STRETCH_PER (.06),
  // CONGESTION_FREE (4), stageDisposition (the committee stages, COMMITTEE_STAGES, run on
  // the committee's own goodwill; every later Senate stage on Congress's overall
  // goodwill), committeeWouldReport (.62, .12 per controversy), resolveStage; nomination.ts vettingFindings (integrity under .35, competence
  // under .4, ambition over .85); confirmation-count.ts nomineeAppeal,
  // CROSSING_OWN_SIDE (-.06), CROSSING_OTHER_SIDE (.08). Day counts are the median
  // for a cooperative Senate: 14+30+7+1, 3+21+14+1+14, 7+14+2+1 and 7, a total of
  // 136. With the committee's goodwill at .5 its five stages run 1 + .5 x 1.6 = 1.8
  // times as long (5 + 38 + 25 + 2 + 25 = 95 days once each is rounded), and with
  // Congress's goodwill at .5 the four floor stages do too (13 + 25 + 4 + 2 = 44).
  {
    id: "nomination-to-oath",
    title: "How a nominee is confirmed",
    summary:
      "The President names people for the top jobs, such as cabinet secretaries and judges, but the Senate has to approve each one before they can serve. In the game, a nomination takes about 19 weeks even with a friendly Senate. It takes longer when Congress is cold toward you, and it can die without a vote.",
    cast: [
      { label: "You, the President", role: "Pick the nominee, send the name to the Senate, and can withdraw it.", icon: "appoint" },
      { label: "A Senate committee", role: "Holds the hearing and decides whether to send the name to the full Senate.", icon: "review", term: "senate-committee" },
      { label: "The full Senate", role: "Ends debate on the name and votes. A majority decides both.", icon: "subjectChamber", term: "senate" },
      { label: "The nominee", role: "Their competence and integrity are most of what senators weigh, and a problem in their past slows every Senate stage.", icon: "subjectPerson" },
    ],
    steps: [
      {
        label: "White House",
        detail: "A shortlist, background checks and paperwork come first, and then the name goes to the Senate. Popularity can't shorten this.",
        icon: "westWing",
        duration: "About 52 days",
        youCan: "Pick the nominee from the candidates on offer.",
      },
      {
        label: "Committee",
        detail: "The committee does its paperwork, holds a hearing, and then votes on whether to send the name to the full Senate.",
        term: "senate-committee",
        icon: "review",
        duration: "About 53 days at best, longer if the committee is cool toward you",
        exit: "A committee that won't send the name on can hold it until the Senate returns it to you without a vote.",
      },
      {
        label: "Floor",
        detail: "The name waits for time on the Senate schedule, then the Senate ends debate and votes. A majority decides each step.",
        term: "cloture",
        icon: "subjectChamber",
        duration: "About 24 days at best",
        exit: "If debate can't be ended, the nomination goes no further. If the vote is lost, the nominee is rejected.",
      },
      {
        label: "Oath",
        detail: "Once confirmed, the nominee is sworn in. Until then, the seat stays empty.",
        term: "confirmation",
        icon: "sign",
        duration: "About 7 days",
      },
    ],
    thresholds: [
      { label: "Senate: end debate, then confirm", needed: 51, of: 100, note: "A simple majority decides both votes on a nominee. A nominee doesn't need 60." },
    ],
    links: [
      { from: "Low goodwill toward you", to: "Every Senate stage", how: "The colder a committee is toward you, the longer each committee stage takes. The colder Congress as a whole is, the longer each floor stage takes. A hostile Senate can more than double the wait.", direction: "raises", weight: "strong" },
      { from: "Each controversy on the nominee", to: "Every Senate stage", how: "A controversy is a problem that vetting turns up, such as unresolved questions in the background file, a thin record, or past statements the committee will read back. Each one adds 35 percent to each stage's length.", direction: "raises", weight: "strong" },
      { from: "Names already waiting on the floor", to: "Floor stages", how: "Each name past the fourth adds 6 percent.", direction: "raises", weight: "weak" },
      { from: "A hostile panel and a controversial nominee", to: "Whether the committee reports", how: "The committee holds the nomination once its hostility, plus 0.12 for each controversy, reaches 0.62 on a 0 to 1 scale.", direction: "lowers", weight: "strong" },
      { from: "Nominee's competence and integrity", to: "The Senate count", how: "Competence is 60 percent and integrity is 40 percent of the nominee's record, which is one of the biggest factors in how senators vote.", direction: "shifts", weight: "strong" },
      { from: "A nominee from the other party", to: "The Senate count", how: "The nominee wins a little support from the other party and loses a little from yours.", direction: "shifts", weight: "weak" },
    ],
    examples: [
      {
        title: "Following one nominee",
        kind: "illustration",
        lines: [
          "On day 1, you nominate a Secretary of Energy. White House vetting takes about 52 days, and nothing you do shortens it.",
          "On day 53, the name goes to the Senate energy committee. That committee's own goodwill toward you is 50 out of 100, so each committee stage takes 1.8 times its base length, about 95 days in all.",
          "The committee isn't hostile enough to sit on the name, so it sends it to the full Senate.",
          "On the floor, Congress's goodwill toward you is also 50, so those stages take 1.8 times their base length too, about 44 days. The Senate votes to end debate and then to confirm, and a majority is 51.",
          "About a week later, the new Secretary is sworn in, roughly 28 weeks after you picked them.",
        ],
      },
      {
        title: "The 2017 rule change",
        kind: "history",
        lines: [
          "Until 2013, 41 senators could stall any nomination. On November 21, 2013, the Senate set a precedent that a majority can end debate on every nomination except the Supreme Court.",
          "On April 6, 2017, it extended that to the Supreme Court, and cloture on Neil Gorsuch was invoked 55 to 45 the same day.",
        ],
      },
    ],
    youCan: [
      "Send up nominees with clean records. Each problem that vetting finds slows every Senate stage and brings the committee closer to sitting on the name.",
      "Send names one at a time. Once four are waiting on the floor, each extra one slows the floor stages.",
      "Keep Congress's goodwill up, and check the goodwill of the committee that has your nominee. Both shorten the Senate stages.",
      "Withdraw a nomination that's going badly, and start again with someone else.",
    ],
    next: ["hill-mood-drivers", "cabinet-breaks"],
    terms: ["confirmation", "senate-committee", "cloture", "majority", "cabinet"],
  },
  // engine cabinet.ts BASE_RISK (.022), cabinetRiskRate, CORRUPT_RISK_SHARE (.43),
  // PRINCIPLED_RISK_SHARE (-.43), RECLUSIVE_RISK_SHARE (-.23), INTEGRITY_RESTRAINT
  // (.6), CHALLENGE_AMBITION_FLOOR (.65), CHARISMATIC_AMBITION_DISCOUNT (.1),
  // CHALLENGE_LOYALTY_CEILING (.6), RESIGNATION_LOYALTY_CEILING (.55),
  // DISCIPLINE_BOUND (.15), cabinetOutcomeFor, cabinetOutcomeOf (a second
  // challenge from a seat already leading a bloc is a resignation),
  // ORDINARY_EXITS_PER_SEAT_YEAR; cabinet-revolt.ts leakPacket (standing .02 plus
  // .02 times ambition), primaryPacket (stability .04 plus .04 times ambition),
  // exitPacket (quiet .02 standing; public .04 standing and .01 stability, chosen
  // by minister-will.ts decideMinister), vacates (the deputy acts);
  // cabinet-transition.ts TRANSITION_WEEKS (6); loyalty.ts OVERRULED_COST (-.02),
  // HEEDED_GAIN (.008); appointments.ts DISMISSAL_CHARISMA_WEIGHT (.05),
  // RESENTMENT_AMBITION_FLOOR (.65). A secretary at loyalty .66 and integrity .6
  // with no trait breaks at .34 x .022 x .64 = .48 percent a week, which over a
  // 208-week term is about one break; at .54, .65. chiefOfStaffDiscipline is zero
  // at a reading (the mean of competence and loyalty) of .75 or with no chief
  // seated, reaches its full 15 percent at .825 or above, and is the full penalty
  // at .675 or below, so a chief at .5 and .5 raises every break and its cost by
  // the whole 15 percent. Restated for players in dossier/attribute-consequence.ts.
  {
    id: "cabinet-breaks",
    title: "What a secretary's traits do",
    summary:
      "Cabinet secretaries serve at your pleasure, and one who loses faith in you can leak, resign or turn on you. Each week, every secretary has a small chance of breaking with you. That chance rises when you overrule their advice, and it falls when you listen and choose a strong Chief of Staff.",
    cast: [
      { label: "You, the President", role: "Choose which advice to follow. Picking an answer a secretary argued against overrules that secretary.", icon: "sign" },
      { label: "A cabinet secretary", role: "Runs a department and argues for or against each answer. Loyalty gives a secretary the motive to break with you, integrity holds that back, and ambition shapes the kind of break.", icon: "subjectPerson", term: "cabinet" },
      { label: "The Chief of Staff", role: "Runs the White House staff. A strong one cuts the chance of a break and what a break costs.", icon: "westWing", term: "chief-of-staff" },
    ],
    steps: [
      {
        label: "You decide",
        detail: "When you answer a decision, the secretaries with a stake argue for or against each answer. If you pick one a secretary argued against, their loyalty drops 2 points. If you pick one they argued for, it rises 0.8 of a point.",
        term: "cabinet-loyalty",
        icon: "decision",
        duration: "Each decision",
        youCan: "Weigh each secretary's advice before you choose.",
      },
      {
        label: "The weekly chance",
        detail: "Each week the game checks every secretary once. The less loyal the secretary, the likelier a break, and integrity holds it back. A secretary with the typical starting loyalty (66) and integrity (60) breaks about once in a four-year term.",
        term: "cabinet-integrity",
        icon: "schedule",
        duration: "Checked every week",
      },
      {
        label: "Which break",
        detail: "The game checks in this order. An ambitious secretary (ambition 65 or more, or 55 if charismatic) with loyalty 60 or below builds a rival faction, which is a following of their own. If that doesn't apply, a secretary with loyalty 55 or below resigns. Anyone else leaks to the press, which means passing a private matter to reporters.",
        term: "cabinet-ambition",
        icon: "conflict",
        exit: "A secretary who already leads a faction resigns instead of starting a second one.",
      },
      {
        label: "What it costs",
        detail: "These figures assume a Chief of Staff in the middle of the range, whose competence and loyalty average 75 (or an empty job). A leak then costs 2 points of standing abroad, plus up to 2 more for an ambitious secretary. A faction costs 4 points of stability, plus up to 4 more. A quiet resignation costs 2 points of standing. A public one costs 4 points of standing and 1 of stability, and it's likelier when you've overruled that secretary often. A strong chief, averaging 83 or more, trims every cost by 15 percent. A weaker one, averaging 67 or less, adds 15 percent.",
        term: "rival-faction",
        icon: "adverse",
      },
      {
        label: "The empty seat",
        detail: "A resignation or a firing leaves the seat empty. The department's senior deputy runs it as acting head until your next nominee is confirmed.",
        icon: "appoint",
        youCan: "Nominate a replacement from the Executive page.",
        exit: "Secretaries also leave for ordinary reasons, about two a term across the cabinet, whatever you do. They announce it, then serve on for 6 weeks or until a successor is confirmed, whichever is longer.",
      },
    ],
    links: [
      { from: "Low loyalty", to: "The weekly chance of a break", how: "The less loyal a secretary is, the likelier a break. Loyalty is the only motive.", direction: "raises", weight: "strong", outcome: "hurts" },
      { from: "Integrity", to: "The chance of a break", how: "At full integrity the chance falls by 60 percent.", direction: "lowers", weight: "strong", outcome: "helps" },
      { from: "A corrupt or principled trait", to: "The chance of a break", how: "Corrupt raises the chance by 43 percent. Principled lowers it by the same.", direction: "shifts", weight: "strong" },
      { from: "A reclusive trait", to: "The chance of a break", how: "Lowers it by 23 percent, because a loner has no press contacts to leak to.", direction: "lowers", weight: "moderate", outcome: "helps" },
      { from: "The Chief of Staff's competence and loyalty", to: "Every secretary's chance of a break, and its cost", how: "Up to 15 percent either way. A strong chief lowers both, and a weak one raises both.", direction: "shifts", weight: "moderate" },
      { from: "Overruling their advice", to: "Their loyalty", how: "Drops 2 points each time. Taking their advice wins back 0.8 of a point.", direction: "lowers", weight: "weak", outcome: "hurts" },
      { from: "Their charisma", to: "Standing abroad lost if you fire them", how: "2 points, plus up to 5 more for a very charismatic secretary.", direction: "raises", weight: "weak" },
    ],
    examples: [{
      title: "Overruling a Secretary of Defense",
      kind: "illustration",
      lines: [
        "Your Secretary of Defense starts with loyalty 66 and integrity 60, and no special traits. Each week she has about a 0.5 percent chance of breaking with you.",
        "Over several months, you pick a different answer from the one she argued for, six times. Each costs 2 points of loyalty, so 66 falls to 54.",
        "Her weekly chance rises to about 0.65 percent. A break now would be a resignation, or a rival faction if her ambition is 65 or more.",
        "If her loyalty had stayed at 62, the same break would only be a leak to the press.",
      ],
    }],
    youCan: [
      "Weigh each secretary's advice before you answer. Each overruling costs 2 points of loyalty, and listening wins back only 0.8 of a point.",
      "Choose a strong Chief of Staff. You'll see up to 15 percent fewer breaks, and cheaper ones.",
      "Check a secretary's weekly chance on the cabinet roster, and read their dossier on the Executive page.",
      "Fire a secretary who has gone cold, and nominate a replacement. A firing costs standing, and an ambitious secretary leaves as a rival faction.",
    ],
    next: ["nomination-to-oath", "removal-ladder"],
    terms: ["cabinet", "cabinet-loyalty", "cabinet-ambition", "cabinet-integrity", "cabinet-competence", "rival-faction", "chief-of-staff"],
  },
  // engine congress.ts dispositionTarget (approval .55, unilateral force .06
  // each capped at .3, OVERSIGHT_MOOD_COST .2, STRUCK_ORDER_MOOD_COST .05 each
  // capped at .15 inside STRUCK_ORDER_SEASON_TURNS 26), DISPOSITION_DRIFT (.04);
  // congress.ts UNILATERAL_DISPOSITION_COST (.09, taken from the figure itself the
  // day recordUnilateralForce runs, on top of the .06 off the target);
  // nomination-stages.ts DISPOSITION_STRETCH (committee stages read the
  // committee's goodwill, the floor stages Congress's); committees.ts blend,
  // GAVEL_SHARE, PANEL_GRAVITY (.5). The illustration: .25 + .55 x .6 = .58; the
  // strike takes .09 at once (.58 to .49) and .06 off the target (.52), and a drift
  // of .04 snaps to a target within .04.
  {
    id: "hill-mood-drivers",
    title: "What sets Congress's goodwill toward you",
    summary:
      "Congress's goodwill, from 0 to 100, is how the game scores how willing members are to help you. It follows your approval, how often you act without Congress, and any investigation into you. It also sets how fast nominees clear the Senate and how easily bills clear committee.",
    cast: [
      { label: "You, the President", role: "Your approval rating and your actions set the target that goodwill moves toward.", icon: "sign" },
      { label: "Members of Congress", role: "The 435 representatives and 100 senators who vote on your bills and nominees.", icon: "subjectCapitol", term: "congress" },
      { label: "Committee chairs", role: "The chair and ranking member of each committee set that committee's own view of you.", icon: "subjectPerson", term: "committee-leaders" },
    ],
    links: [
      { from: "Your approval rating", to: "Congress's goodwill", how: "The target starts at 25 and adds 0.55 of your approval. At 60 percent approval, the target is 58.", direction: "raises", weight: "strong", outcome: "helps" },
      { from: "Military force used without Congress's approval", to: "Congress's goodwill", how: "Takes 9 points off at once, and lowers the level goodwill heads toward by 6 points each time, up to 30.", direction: "lowers", weight: "weak", outcome: "hurts" },
      { from: "A public investigation into you", to: "Congress's goodwill", how: "Takes 0.2 of the investigation pressure, up to 20 points.", direction: "lowers", weight: "moderate", outcome: "hurts" },
      { from: "An order struck down in the last 26 weeks", to: "Congress's goodwill", how: "Takes 5 points each, up to 15. After 26 weeks, an order stops counting.", direction: "lowers", weight: "weak", outcome: "hurts" },
      { from: "Goodwill toward you", to: "Senate confirmation stages", how: "The lower the goodwill, the longer each stage takes, up to 2.6 times as long. The committee stages follow that committee's own goodwill, and the floor stages follow Congress's.", direction: "lowers", weight: "strong" },
      { from: "A committee's chair and ranking member", to: "That committee's own goodwill", how: "The committee sits halfway between Congress's overall goodwill and the view of its chair and ranking member. Of those two, the chair counts for at least three quarters.", direction: "shifts", weight: "strong" },
    ],
    examples: [{
      title: "A President whose approval is 60 percent",
      kind: "illustration",
      lines: [
        "The target for goodwill is 25 plus 0.55 of 60, which is 58. Goodwill is at 40 and moves up to 4 points a week, so it goes 44, 48, 52, 56, and then 58 in the fifth week.",
        "You then order a military strike without asking Congress. Goodwill drops 9 points at once, from 58 to 49, and the target falls 6 points to 52.",
        "The next week, goodwill climbs back toward the new target and settles at 52, because it's within 4 points of it. Nominees and bills now move a little slower than before.",
      ],
    }],
    youCan: [
      "Keep your approval up. It's the biggest single piece of the target.",
      "Ask Congress for approval before you use military force. Each use without it takes 9 points off goodwill at once and 6 off the target.",
      "Avoid signing orders that courts are likely to strike down.",
      "Open the People view on the Congress page to see which committee chairs are cold toward you.",
    ],
    next: ["nomination-to-oath", "inquiry-cost"],
    terms: ["hill-mood", "senate-committee", "committee-leaders"],
  },
  // engine congress.ts clotureOf, floorThreshold, majorityOf, supermajorityOf;
  // legislation.ts veto override; removal-votes.ts conviction; treaties.ts;
  // CHAMBERS (house 435, senate 100); congress-votes.ts sharesWith (OWN_PARTY_FLOOR
  // .8, OWN_PARTY_RANGE .2: the President's caucus votes at 80 to 100 percent, so
  // 218 of a 224-seat caucus is 97.3 percent) and sharesAgainst (an override counts
  // the opposition at .8 to 1 and the President's own caucus at up to
  // DEFECTION_CEILING .35, and only once Congress leans against him; seats are not
  // votes). Real: in 1868 the Senate voted 35 to 19
  // on the first article against Andrew Johnson, one short of the 36 needed.
  {
    id: "congress-counts",
    title: "The counts that decide things",
    summary:
      "Congress decides by counting votes, and what you need to win depends on what is being decided. A simple majority passes a bill in the House, 60 senators are needed to end debate on an ordinary bill, and two thirds of both chambers can overrule your veto.",
    cast: [
      { label: "The House", role: "One half of Congress, with 435 members who vote on their own. Each chamber keeps its own count.", icon: "subjectChamber", term: "house" },
      { label: "The Senate", role: "The other half, with 100 senators, two per state. It has its own count.", icon: "subjectChamber", term: "senate" },
      { label: "The Vice President", role: "Presides over the Senate and votes only to break a 50-50 tie.", icon: "subjectPerson" },
    ],
    thresholds: [
      { label: "House: pass a bill", needed: 218, of: 435, note: "A majority passes an ordinary bill in the House." },
      { label: "Senate: majority", needed: 51, of: 100, note: "A majority confirms a nominee, ends debate on one, and passes a budget reconciliation bill." },
      { label: "Senate: end debate on a bill", needed: 60, of: 100, note: "This is three fifths. Without it, a determined minority of 41 can stop an ordinary bill. Reconciliation bills and nominees skip it." },
      { label: "House: override a veto", needed: 290, of: 435, note: "Two thirds of the House. The Senate must also reach two thirds." },
      { label: "Senate: two thirds", needed: 67, of: 100, note: "Two thirds of the Senate overrides a veto (together with the House), consents to a treaty, and convicts an impeached President." },
    ],
    examples: [
      {
        title: "Reading the counts",
        kind: "illustration",
        lines: [
          "Your caucus is your own party in Congress. If you ran as an independent, it's the major party nearest you, and the independents in Congress don't join it.",
          "Imagine your caucus holds 224 House seats and 53 Senate seats.",
          "Take a bill to fund new bridges. It needs 218 votes to pass the House. In the game, your caucus's members vote with you 80 to 100 percent of the time, depending on how you stand with Congress. Reaching 218 from 224 seats takes about 97 percent of your own members, so your caucus carries the bill only if nearly all of them say yes or some of the other side joins in. It's likely, but not certain.",
          "In the Senate, the bridge bill is an ordinary one and needs 60, so you need 7 senators from the other side even if all 53 of yours vote yes.",
          "A nominee for Secretary of Labor needs only 51 in the Senate, so your 53 senators are enough as long as at least 51 of them vote yes.",
          "If Congress tries to override one of your vetoes, it needs 67 senators. With 34 seats, you can block that unless members of your caucus cross over to vote against you, and they do that only when Congress is cold toward you.",
        ],
      },
      {
        title: "One vote short",
        kind: "history",
        lines: [
          "In 1868, the Senate voted on removing President Andrew Johnson. Thirty-five senators voted to convict and 36 were needed, so he stayed in office by one vote.",
        ],
      },
    ],
    youCan: [
      "Check the count on each pending bill on the Congress page before it reaches the floor.",
      "Plan around the 60-vote bar. In the game, a tax or debt-limit bill on the budget track needs only 51.",
      "Hold more than a third of either chamber to make a veto override hard. It isn't a guarantee, because when Congress is cold toward you, some of your own members cross over and vote to override.",
    ],
    next: ["bill-to-law", "removal-ladder"],
    terms: ["majority", "cloture", "two-thirds", "reconciliation", "filibuster"],
  },
  // engine elections.ts projectVote (APPROVAL_LEVERAGE .36, RECORD_PENALTIES,
  // RECORD_DRAG_CAP .15), holdElection; election-seating.ts HOUSE_MIDTERM
  // (sensitivity 1.4, neutralShare .61, ceiling .31) for the House, and
  // MIDTERM_PENALTY (.04) with SENATE_MIDTERM_SENSITIVITY (.05), senateClassUpIn
  // and SENATE_FLIP_MARGIN for the Senate. Nothing in the count draws a random
  // number. INCUMBENCY (.03) is in the share; PARTY_VOTE_FLOOR (.415) and
  // recordScale hold the record's drag to the room between the standing share and
  // that floor, at most RECORD_DRAG_CAP (.15). The illustration: .5 minus .036 plus
  // .03 is .494 standing; one struck order is .04 (under the .079 of room above the
  // floor), so .454; (.454 - .61) x 1.4 = -.218, bent toward the .31 ceiling to
  // -.157 of the seats held in close states (seatsAtRisk), which on a founded map
  // with 248 seats held is 33 (election-seating.ts midtermHouseSeatsMoved).
  {
    id: "midterm-seats",
    title: "What a midterm changes",
    summary:
      "A midterm is the national election halfway through your four-year term, when every House seat and about a third of the Senate are on the ballot. It can't remove a President, but it decides how much of Congress is on your side for the rest of the term. The result follows your record, with no chance involved.",
    steps: [
      { label: "Election Day", detail: "The national vote follows how the three blocs rate you and how many of each turn out. You get 3 points for being the sitting President, and you lose points for overstepping. Struck-down orders, force used without Congress, overridden vetoes, and a few others such as broken first-hundred-days promises all count. Your record can take at most 15 points off, and it can't push your ticket's share below 41.5 percent.", icon: "ballot", youCan: "Check the projected vote on the Congress page." },
      {
        label: "The seats",
        detail: "In the House, only close districts change hands. In the Senate, only the third of seats up that year can change, and only in close states.",
        icon: "subjectChamber",
        exit: "The President's party starts behind, so an evenly split vote still costs it seats.",
      },
      { label: "January 3", detail: "The new members are sworn in about 9 weeks after the election. Committee chairs go to whichever party holds the Senate.", icon: "schedule", duration: "About 9 weeks after the vote" },
    ],
    links: [
      { from: "How the blocs rate you", to: "The national vote", how: "Each bloc votes for you at its approval rate, pulled toward its own party, so a partisan who disapproves of you still mostly votes for their party. The blocs are weighted by how many of each turn out.", direction: "shifts", weight: "strong" },
      { from: "Each order the courts struck down", to: "The national vote", how: "Takes 4 points each, up to 12.", direction: "lowers", weight: "weak", outcome: "hurts" },
      { from: "Each time force was used without a vote", to: "The national vote", how: "Takes 3 points each, up to 12.", direction: "lowers", weight: "weak", outcome: "hurts" },
      { from: "Each veto Congress overrode", to: "The national vote", how: "Takes 3 points each, up to 9.", direction: "lowers", weight: "weak", outcome: "hurts" },
      { from: "The national vote", to: "House seats", how: "Below about 61 percent of the vote, your party loses some of the seats it holds in close states. It loses about 1.4 percent of them for each point under, and never more than about three in ten. Above 61 percent, it gains some of the other party's.", direction: "shifts", weight: "moderate" },
      { from: "The national vote", to: "Senate seats", how: "Each point your share sits above or below 50 percent moves about 0.1 percent of the seats, but only in the class up that year and in close states.", direction: "shifts", weight: "weak" },
    ],
    examples: [
      {
        title: "A midterm in the game's terms",
        kind: "illustration",
        lines: [
          "Say the blocs, weighted by who turns out, add up to a vote share near 46 percent. Holding the office adds 3, so you start near 49 percent.",
          "One of your orders was struck down, which takes 4 more points. Your ticket's share of the vote is about 45 percent. However long your record gets, it can't take the share below 41.5 percent.",
          "In the House, that share costs your party about a sixth of the seats it holds in close states. With 248 seats held, that's about 33. It's fewer when you hold fewer seats or fewer of them are close. The Senate moves far less.",
        ],
      },
      {
        title: "A historical case",
        kind: "history",
        lines: [
          "The 2010 midterm, two years into Barack Obama's first term, cost the President's party 63 House seats and its majority there.",
        ],
      },
    ],
    youCan: [
      "Keep the blocs' approval up, along with the turnout of your own. Together they are the biggest piece of the national vote.",
      "Avoid force without Congress, orders likely to be struck down, and vetoes Congress is likely to override. Each one costs you votes.",
      "Read the projected vote in the Term view on the Congress page, well before the election.",
    ],
    next: ["court-challenge", "hill-mood-drivers"],
    terms: ["midterm-election", "majority", "house", "senate"],
  },
  // court-procedure.ts, court-votes.ts, statutory-matters.ts and judicial-review.ts.
  {
    "id": "court-challenge",
    "title": "How a challenge moves through the courts",
    "summary": "A lawsuit asks whether the government acted lawfully. Filing, temporary relief, a ruling on the merits and an appeal are separate decisions, and the docket shows which ones have happened.",
    "cast": [
      {
        "label": "The challengers",
        "role": "Have to show a concrete injury and a legal basis for relief.",
        "icon": "conflict"
      },
      {
        "label": "The lower court",
        "role": "Takes up threshold questions, temporary relief and the merits.",
        "icon": "court"
      },
      {
        "label": "The Supreme Court",
        "role": "Chooses whether to review an appeal before it decides the merits.",
        "icon": "court",
        "term": "supreme-court"
      }
    ],
    "steps": [
      {
        "label": "Threshold review",
        "detail": "The court first asks whether the case can go forward at all. If it's dismissed here, that doesn't mean the court approves of the policy.",
        "icon": "folder"
      },
      {
        "label": "Interim relief",
        "detail": "A temporary order can govern what happens while the case continues. Check its scope, because a pending case alone doesn't suspend every action.",
        "icon": "review"
      },
      {
        "label": "Lower judgment",
        "detail": "The lower court rules on the merits. The record says what it decided and whether enforcement is stayed.",
        "icon": "gavel"
      },
      {
        "label": "Appeal",
        "detail": "The higher court can grant or deny review. A denial leaves the lower ruling in place. A remand sends an issue back for more proceedings.",
        "icon": "court"
      },
      {
        "label": "Final disposition",
        "detail": "A finished case keeps its bench, its votes, its legal question and its remedy. The remedy decides what changes in practice.",
        "icon": "gavel"
      }
    ],
    "examples": [
      {
        "title": "An appeal does not start the case over",
        "kind": "illustration",
        "lines": [
          "Manufacturers challenge a production priority after it displaces their contracts. Their injury comes from the actual order.",
          "The lower court reaches the merits, and either side can win there. Review by the Supreme Court is a separate stage.",
          "If review is denied, the lower ruling stays. If the justices split evenly, it stays too, and no new national precedent is set.",
          "A national ruling on how to read a statute can narrow the grant it names. The Act's other provisions stay in force."
        ]
      }
    ],
    "youCan": [
      "Open the case file to see whether a case is at an earlier stage or has a final decision.",
      "Read the remedy before you choose another action under the same authority.",
      "If the existing grant isn't enough, ask Congress for legislation. Appointing a justice later doesn't change a past ruling."
    ],
    "next": [
      "justice-position"
    ],
    "terms": [
      "judicial-review",
      "struck-down",
      "executive-order",
      "supreme-court"
    ]
  },
  {
    "id": "justice-position",
    "title": "How the participating bench decides",
    "summary": "Each participating justice votes on the same case, shaped by their own legal assessment and professional characteristics. Vacancies and recusals change who can take part, but they never add votes.",
    "steps": [
      {
        "label": "Eligible bench",
        "detail": "Six participating justices are required. With fewer, the case waits, and no ruling on the merits is made.",
        "icon": "court"
      },
      {
        "label": "Shared case, individual votes",
        "detail": "Every justice faces the same factual uncertainty. Each has a legal threshold of their own, which decides their vote, and the holding follows the votes.",
        "icon": "review"
      },
      {
        "label": "Majority or equal division",
        "detail": "A majority decides the merits. When the Court splits evenly, the lower ruling stays in force and no national holding on the merits is made.",
        "icon": "gavel"
      }
    ],
    "thresholds": [
      {
        "label": "Supreme Court quorum",
        "needed": 6,
        "of": 9,
        "note": "Six eligible justices have to take part before merits voting can start."
      }
    ],
    "examples": [
      {
        "title": "An eight-member Court",
        "kind": "illustration",
        "lines": [
          "One seat is vacant, and eight justices take part. A four-to-four split leaves the lower ruling in force.",
          "That can keep relief against the government in place. A tie doesn't automatically uphold the President.",
          "A later confirmation fills the seat for future cases. It doesn't rewrite the votes already recorded."
        ]
      }
    ],
    "youCan": [
      "When a seat is vacant, nominate a candidate. The Senate has to confirm.",
      "Read the recorded vote and the reasoning in a completed case.",
      "Choose an action you have solid authority for, rather than counting on a friendly justice to approve it."
    ],
    "next": [
      "court-challenge"
    ],
    "terms": [
      "supreme-court",
      "judicial-review",
      "struck-down",
      "ideology"
    ]
  },
];
