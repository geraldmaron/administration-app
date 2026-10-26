import type { Explainer, GlossaryEntry } from "./types.js";

// The record and the press: what the ledger says, how a story forms around
// it, and how a promise, a scandal or a damage report is judged along the way.

export const RECORD_GLOSSARY: readonly GlossaryEntry[] = [
  // engine pledges.ts PLATFORM_MAX_PLANKS (5), plankRejections (two planks on
  // one program are refused); world platform.ts platformPlanks (ten).
  {
    id: "plank",
    term: "Plank",
    icon: "flag",
    definition:
      "A plank is one goal in a party's platform. The platform is the list a party adopts at its national convention, the big meeting where it picks its candidate. \"Balance the budget\" is one plank.",
    example: "A candidate who runs on \"secure the border\" has put that plank on the platform, and voters can later check whether it happened.",
    inGame:
      "Before you take the oath, you choose up to five planks from ten. Two planks that set the same kind of program, such as two budget plans, can't both be on your platform. Each plank you run on becomes a dated pledge on the Record the day you take the oath.",
    related: ["pledge", "first-hundred-days"],
  },
  // engine pledges.ts pledgeVerdict; player-core record/promises.ts
  // PLEDGE_WARNING_DAYS (14); opinion-causes.ts PROMISE_MEMORY_WEEKS (52).
  {
    id: "pledge",
    term: "Pledge",
    icon: "sign",
    definition:
      "A pledge is a specific promise a candidate makes to voters. \"I will sign an order to secure the border\" is a pledge, while \"I care about the border\" is only a hope. Once in office, the press and voters can hold a President to a pledge.",
    example: "\"I'll sign a border order by spring\" is a pledge. If spring passes with no order, reporters will write that the promise was broken.",
    inGame:
      "Every plank becomes a pledge with a due date. You keep it by signing the order or putting the program in place. A promise to keep a program breaks the week you drop it. On the due date, it's also judged on whether the program did what the plank promised. The Record lists every pledge as open, kept or broken, and the Desk warns you once one is within 14 days of its due date. The public remembers a kept or broken pledge for a year.",
    related: ["plank", "first-hundred-days", "midterm-election"],
  },
  // engine pledges.ts FIRST_HUNDRED_DAYS, FIRST_HUNDRED_DAYS_MAX (3),
  // plankFitsFirstHundredDays; elections.ts RECORD_PENALTIES
  // .brokenFirstHundredDays (3 each, cap 9); opinion-causes.ts PROMISE_INTEGRITY
  // (.12 broken against .05). Real: Miller Center, millercenter.org/first-100-days-meaningful-milestone-or-debunked-benchmark
  {
    id: "first-hundred-days",
    term: "First hundred days",
    icon: "schedule",
    definition:
      "The first 100 days of a presidency. Reporters use them as a yardstick because Franklin Roosevelt, who took office in 1933, got Congress to pass a burst of new laws in his first months, known as the New Deal.",
    example: "A new President who promises to sign a border order \"in the first hundred days\" is judged on whether it is signed by late April, if the swearing-in was in January.",
    inGame:
      "You can mark up to three of your pledges as first-hundred-days pledges, and they fall due 100 days after the oath. A plank whose program starts on your first day, like a budget plan, can't be one, because doing nothing would keep it. Breaking one costs your honesty rating more than twice what an ordinary pledge costs. Each broken one also takes 3 points off your vote share at the next election, up to 9.",
    related: ["pledge", "midterm-election"],
  },
  // engine pledges.ts pledgeDueDate (a term pledge falls due at the first
  // midterm); election-seating.ts HOUSE_MIDTERM.neutralShare (.61, the share at
  // which the President's party holds its House seats) and MIDTERM_PENALTY (.04,
  // the Senate's drag). Real: Constitution, Article I (two-year House terms).
  {
    id: "midterm-election",
    term: "Midterm election",
    icon: "ballot",
    definition:
      "The national election held halfway through a President's four-year term. Every seat in the House of Representatives and about a third of the Senate are on the ballot. The President is not.",
    example: "A President who takes office in January 2025 faces the voters' first midterm in November 2026.",
    inGame:
      "A pledge you made for the whole term falls due on the first midterm election day after your oath. The midterm also reshapes Congress. Your vote share decides how many seats change hands, and your caucus starts behind, so even an evenly split vote costs it seats. Nothing is left to chance, because the result follows your record.",
    related: ["pledge", "vote-share"],
  },
  // engine elections.ts projectVote, holdElection ("pure and seed-independent");
  // turnout.ts selectBallot; electorate.ts ballotOf, blocVote, PARTY_LOYALTY (.9).
  {
    id: "vote-share",
    term: "Vote share",
    icon: "graph",
    definition: "The percentage of all votes that a candidate or party receives. A 52 percent vote share means 52 of every 100 votes.",
    example: "If 100 million people vote and you receive 52 million of those votes, your vote share is 52 percent.",
    inGame:
      "The game projects your vote share all term from how the three blocs rate you, how many of each turn out, the penalties on your record, and a few smaller movers. On election night it counts that same figure, so the projection you watched is the result. A presidential election is still won state by state, so the national share alone doesn't win it.",
    related: ["voter-blocs", "electoral-college", "midterm-election"],
  },
  // engine electorate.ts BLOCS, displayRollup, blocVote (PARTY_LOYALTY .9),
  // BLOC_HABIT; turnout.ts selectBlocTurnout, BLOC_TURNOUT_CAP (.04).
  {
    id: "voter-blocs",
    term: "Voter blocs",
    icon: "layerBlocs",
    definition:
      "A bloc is a broad group of voters who tend to back the same side because they share a party or a lean. Campaigns plan around a few big groups like this instead of around individual voters.",
    example: "A party's identifiers rarely leave it however a President is doing, while independents who lean neither way can swing either way.",
    inGame:
      "The game reads the country as three blocs: your party and its leaners, the independents, and the other party and its leaners. Behind the scenes, each party's identifiers and leaners are counted separately because they turn out differently. Every bloc judges the same six things (prosperity, security, services, honesty, competence and unity) from its own starting point. At the ballot, a partisan who disapproves of you still mostly votes their party, so the vote follows party far more than approval does. Which blocs actually turn out matters too. Hurt a group where your own blocs live and they stay home, and the other side's come out.",
    related: ["vote-share", "approval-rating", "polarization"],
  },
  // engine elections.ts presidentialVerdict; states.ts allocationOf, districtVotes,
  // HOME_STATE_PRESIDENT (.03), HOME_STATE_RUNNING_MATE (.01). Real: 538 electors,
  // 270 to win, Maine and Nebraska by district, https://www.archives.gov/electoral-college/allocation
  {
    id: "electoral-college",
    term: "Electoral College",
    icon: "election",
    definition:
      "The 538 electors who formally choose the President. Each state has one elector for each of its senators and House members, and the District of Columbia has three. A candidate needs 270 to win. In most states, the winner of the state's vote takes every elector. If no one reaches 270, the House picks.",
    example: "California has 54 electors and Wyoming has 3. A candidate who narrowly wins California takes all 54, so one close big state can outweigh a lopsided win in a small one.",
    inGame:
      "Each state is called from your national vote share and how that state usually leans, with a 3-point bonus in your home state and 1 point in your running mate's. The state results add up to the national count, and that count, not the national share, decides the winner. Maine and Nebraska split by district, as in real life. An exact 269 to 269 tie goes to the House.",
    related: ["contingent-election", "vote-share", "midterm-election"],
  },
  // engine opponent.ts contingentHouseVote, senateChoice (a majority of the whole
  // Senate, 51 of 100, picks the Vice President; with no majority the Speaker
  // acts as President, nobody picks the Speaker). Real: Twelfth
  // Amendment (one vote per state delegation, a majority of states), Twentieth
  // Amendment section 3 and the succession statute (the Vice President-elect,
  // then the Speaker, acts). The House chose Adams after the 1824 election.
  {
    id: "contingent-election",
    term: "Contingent election",
    icon: "subjectChamber",
    definition:
      "The backup way to choose a President when no candidate wins a majority of electors. The House of Representatives decides, and each state's delegation (its group of House members) casts a single vote. A candidate needs a majority of the states, which is 26 of 50.",
    example: "In 1824 no candidate won a majority of electors, so the House chose John Quincy Adams as President.",
    inGame:
      "Only an exact 269 to 269 tie sends the election to the House. Each state votes the way most of its House members do. An evenly split delegation casts no vote, and the District of Columbia has none. If nobody reaches 26 states by Inauguration Day, the Senate picks a Vice President from the two running mates, by a majority of its 100 members, and that person acts as President. If the Senate can't pick either, the Speaker of the House acts as President.",
    related: ["electoral-college", "house"],
  },
  // engine press-outlets.ts PRESS_OUTLETS (18 invented, 4 regional); press.ts
  // meanDisposition (the plain average).
  {
    id: "press-corps",
    term: "Press corps",
    icon: "press",
    definition:
      "The reporters and news outlets that cover the White House and the government day to day. What they print and broadcast shapes what the public hears about the President.",
    example: "A wire service sends the same plain report to hundreds of newsrooms, while a talk-radio show may react mostly to which party the President belongs to.",
    inGame:
      "The game has 18 invented outlets, each modeled on a kind of real one: a wire service, a daily paper, a TV network, a cable channel, a website, talk radio, a podcast and four regional papers. None is a real outlet, and each has its own attitude toward you. The press's overall view is the plain average of all 18, and only a small part of it reaches what the public believes about you.",
    related: ["press-briefing", "press-secretary", "anonymous-sourcing", "legs"],
  },
  // engine press.ts SECRETARY_SHARE (conference .35, leak 1, interview 0),
  // podiumSkill (a secretary who has taken a bad cycle briefs at half).
  {
    id: "press-secretary",
    term: "Press secretary",
    icon: "microphone",
    definition: "The White House staff member who speaks for the President to reporters and runs the regular question-and-answer sessions, called briefings.",
    example: "When reporters ask why the President vetoed a bill, the press secretary answers from the podium in the briefing room.",
    inGame:
      "Your press secretary's charm and competence set how well the podium goes. They carry about a third of a press conference, none of an interview (that's you alone), and all of a leak. A press secretary who has already taken the blame for a bad cycle briefs at half strength. With the post empty, your own skill counts.",
    related: ["press-briefing", "press-corps"],
  },
  // engine press.ts PRESS_PLAYS, SECRETARY_SHARE. Real: briefings from the James
  // S. Brady Press Briefing Room, https://www.whitehousehistory.org/the-president-the-press-and-proximity
  {
    id: "press-briefing",
    term: "Press briefing",
    icon: "microphone",
    definition:
      "A regular session in which the White House press secretary answers reporters' questions on behalf of the administration, usually held in the James S. Brady Briefing Room in the West Wing.",
    example: "The press secretary says the President will sign an order next week. A reporter asks why not today, and the answer is in that night's news.",
    inGame:
      "You have three ways to deal with the press: an interview with one outlet, a press conference with all of them, or a leak. The game shows you how likely each is to go well before you commit. Your press secretary's skill counts for about a third of a press conference.",
    related: ["press-corps", "press-secretary", "anonymous-sourcing"],
  },
  // engine press.ts PRESS_PLAYS.leak (good .08, bad -.14, spillover bad 1,
  // moodBackfire.integrity -.02); scandal-origins.ts leakIdentity. Real: "on
  // background" briefings, obamawhitehouse.archives.gov/the-press-office/2011/11/30/background-briefing-senior-administration-official-journalists-traveling
  {
    id: "anonymous-sourcing",
    term: "Anonymous sourcing",
    icon: "hidden",
    definition:
      "Officials sometimes brief reporters \"on background,\" with the remarks credited only to something like \"a senior administration official\". The reporter can print the information without naming the person.",
    example: "A story that says \"a senior administration official said the President will veto the bill\" tells readers what was said but not who said it.",
    inGame:
      "A leak puts a story in one outlet without your name on it. If it goes well, that outlet moves 8 points toward you. If it is traced back to your administration, every outlet runs the story in full and falls 14 points, the public's belief in your honesty drops, and a scandal opens about the leak.",
    related: ["press-briefing", "legs", "scandal"],
  },
  // engine scandal-origins.ts ScandalOrigin, OwnActCharge; press-scandal.ts selectScandals.
  {
    id: "scandal",
    term: "Scandal",
    icon: "caution",
    definition: "A public controversy over possible wrongdoing or a serious mistake by a government. It lasts as long as reporters keep finding new angles.",
    example: "A cabinet member is reported to have steered a contract to a friend. Over the next weeks more documents surface, and officials are asked to explain.",
    inGame:
      "A scandal can start in several ways. A leak of yours can be traced back to your staff. One of your own decisions can draw a charge, such as emergency powers, a covert operation that came apart, a lost source or questions about your conduct. A cabinet member can talk to reporters about what the government did, an inspector general's report can be published, or a situation can arrive on your Desk. How serious the charge is decides how much it can hurt. A running scandal pulls down belief in your honesty and can bring a congressional investigation.",
    related: ["legs", "inspector-general-report", "press-corps"],
  },
  // engine press-scandal.ts SCANDAL_LEGS_BAR (.25), hasLegs, pressClimate (half
  // the most hostile national outlet, half the national average);
  // scandal-origins.ts SCANDAL_GRAVITY (.5 to 1).
  {
    id: "legs",
    term: "Legs",
    icon: "press",
    definition: "Newsroom shorthand for a story that keeps producing new coverage after the first day, because reporters keep finding more or readers keep asking.",
    example: "Two reporters ask about a report on Tuesday. By Friday a third newsroom has its own documents. That story has legs. If nobody followed up, it would be gone by Monday.",
    inGame:
      "A new scandal lasts past its first week only if the seriousness of its charge, multiplied by how hostile the press is that week, comes to more than 0.25. Seriousness runs from 0.5 (a cabinet member talking to reporters) to 1 (questions about your own conduct), and hostility runs from 0 to 1. A grave charge needs only a mildly hostile press, and a minor one needs a press that is largely against you. Most stories die quickly. Once a story has legs, a friendlier week doesn't end it.",
    related: ["scandal", "inspector-general-report", "press-corps"],
  },
  // engine scandal-origins.ts SCANDAL_GRAVITY (ig-finding .6, cabinet leak .5,
  // leak .7, conduct 1), inspectorIdentities (breaks the week a report goes
  // public). Real: Inspector General Act of 1978, https://www.congress.gov/crs-product/R43814
  {
    id: "inspector-general-report",
    term: "Inspector general's report",
    icon: "review",
    definition:
      "A report from an inspector general, an independent auditor who works inside a federal department to look for waste, fraud and abuse. Congress created these offices in 1978. They report what they find to the department head and to Congress.",
    example: "An inspector general finds that a department handed out millions of dollars in contracts without taking bids. The report is published, and reporters write about it.",
    inGame:
      "An audit stays private until its report is published, and a published report can start a scandal. Its charge counts 0.6, more serious than a cabinet member's leak (0.5) and less serious than a leak traced to you (0.7) or questions about your own conduct (1).",
    related: ["inspector-general", "legs", "scandal"],
  },
  // engine impact-calculation.ts impactReport (error 0.6 / 0.3 / 0.1: the range is the
  // true total times 1 minus the error to 1 plus the error, so the true figure is
  // its midpoint, though no report states it). Real:
  // preliminary damage assessment, https://www.congress.gov/crs-product/R44977
  {
    id: "impact-assessment",
    term: "Impact assessment",
    icon: "caution",
    definition:
      "An official estimate of who was hurt and what was lost after a disaster or attack. After a disaster, federal, state and local officials run a preliminary damage assessment to size the harm before aid is decided.",
    example: "After a flood, officials count damaged homes street by street. That count helps decide whether the state can ask Washington for aid.",
    inGame:
      "Each report gives a range, never a single figure, and says how confident it is: low, medium or high. The range stretches 60, 30 or 10 percent either side of the true total, and no report states the total itself. If the true toll is 500 deaths, a low-confidence report says 200 to 800.",
    related: ["fema", "stafford-act", "the-record"],
  },
  // engine causality.ts CausalOrigin and the stamps apply() writes onto an ActionRecord.
  {
    id: "the-record",
    term: "The Record",
    icon: "record",
    definition:
      "In politics, a person's record is everything they have done in office that voters and reporters can judge them on: the votes they cast, the orders they signed, the promises they kept or broke.",
    example: "\"Her record on the economy\" means what she actually did, whatever she said.",
    inGame:
      "The Record is the game's one list of everything that has happened in your administration: your decisions, what agencies and other governments did, events from the calendar, and situations that arrived on your Desk. Each entry says where it came from and what it caused. It also holds your pledges and the impact reports from disasters.",
    related: ["pledge", "impact-assessment"],
  },
];

export const RECORD_EXPLAINERS: readonly Explainer[] = [
  // engine elections.ts ELECTORATE_ANCHOR .5, APPROVAL_LEVERAGE .36, INCUMBENCY .03,
  // RECORD_PENALTIES, RECORD_DRAG_CAP .15, PARTY_VOTE_FLOOR .415,
  // LAWS_EXPECTED_PER_TERM 6, holdElection, contingentHouseVote; turnout.ts
  // TURNOUT_DRIVER_CAP .03; momentum.ts MOMENTUM_CAP .02; opponent.ts MARGIN_BOUND
  // .03; states-acting.ts NON_COOPERATION_CAP .01; removal.ts BEAT_THRESHOLDS and
  // advanceRemovalArc (the 45 stage always opens at that pressure, but the 52 and 60
  // stages are added to the arc's beats only when the House and Senate counts
  // carry, and only beats count in RECORD_PENALTIES.removalBeats).
  // Link weight: strong is a slope of 0.3 or more, moderate a most-cost of 10
  // points or more, weak under 10. 78 and 30 percent ratings give 50 + 28 * .36
  // and 50 - 20 * .36 before incumbency and the other movers.
  {
    id: "election-vote-share",
    title: "How the election is decided",
    summary:
      "An election is how voters decide whether a President or a party keeps power. In the game, election night counts the same projection you've watched all term, with no chance involved. The result comes from what the country thinks of you and what's on your record, so those are the two things to change before election night.",
    cast: [
      { label: "Voters, in three blocs", role: "Your party and its leaners, the independents, and the other party and its leaners. How each rates you, and how many of each turn out, is where your vote share starts.", icon: "layerBlocs", term: "voter-blocs" },
      { label: "The other party's candidate", role: "A figure drawn from the other party's senior ranks. They are worth up to 3 points either way, and their effect fills in as the election year goes on.", icon: "subjectPerson" },
      { label: "The states", role: "Fifty states and the District of Columbia. Each one has its own electors and its own lean, and decides its electors on its own result.", icon: "mapPin", term: "electoral-college" },
      { label: "The House of Representatives", role: "Breaks an exact tie in the Electoral College, one vote per state.", icon: "subjectChamber", term: "contingent-election" },
    ],
    steps: [
      {
        label: "An evenly split country",
        detail:
          "The count starts at 50 percent. Each point your voter groups' average rating sits above or below 50 moves your share 0.36 of a point. On ratings alone, a hugely popular administration (about 78 percent) would reach about 60 percent and a badly failing one (about 30 percent) about 43.",
        icon: "ballot",
        term: "vote-share",
      },
      {
        label: "Other movers",
        detail:
          "A few small extras, each with a cap. Who turns out to vote can move you up to 3 points either way, and the other party's candidate up to 3. Which way the country has been moving lately counts up to 2, and statehouses that refuse your programs take up to 1 from you. How cities and states have shifted since your term began also counts, and the sitting President gets a flat 3 points.",
        icon: "graph",
      },
      {
        label: "Your record",
        detail:
          "Your record then takes votes away. It counts force used without Congress's approval, orders courts threw out, vetoes Congress overrode, a government running without a budget, broken first-hundred-days pledges, and too few laws signed over the term. It also counts the stages of the push to remove you that actually opened. Committee talk at 45 percent pressure always counts. The House stage at 52 and the Senate stage at 60 count only if that chamber's vote carried. Together these cost at most 15 points.",
        term: "first-hundred-days",
        icon: "record",
      },
      {
        label: "State by state",
        detail: "Your national share becomes a result in every state, from that state's usual lean plus a bonus for your home state and your running mate's. The state results add up to the national count.",
        icon: "mapPin",
      },
      {
        label: "The count",
        detail: "At a presidential election, each state's electors are added up, and 270 of 538 wins outright. At a midterm, the same share decides how many seats in Congress change hands.",
        term: "electoral-college",
        icon: "subjectChamber",
        exit: "An exact 269 to 269 tie goes to the House, which votes one state at a time.",
      },
    ],
    thresholds: [
      { label: "Electoral College: win outright", needed: 270, of: 538, note: "A candidate who reaches 270 electors is President. The states' results are what count, not the national share." },
      { label: "House tiebreak: states needed", needed: 26, of: 50, note: "Used only if the electors tie at 269 each. Each state's House members cast one vote for the state." },
    ],
    links: [
      { from: "How the blocs rate you", to: "Your vote share", how: "Each bloc votes for you at its approval, pulled toward its own party, because a partisan who disapproves still mostly votes their party. Your share is the blocs added up, weighted by how many of each turn out.", direction: "raises", weight: "strong" },
      { from: "An order the courts struck down", to: "Your vote share", how: "4 points each, up to 12.", direction: "lowers", weight: "moderate" },
      { from: "Each stage of removal that opened", to: "Your vote share", how: "3.5 points each, up to 10.5. Committee talk counts once pressure reaches 45 percent. The House and Senate stages count only if their votes carried.", direction: "lowers", weight: "moderate" },
      { from: "Force used without Congress's approval", to: "Your vote share", how: "3 points each, up to 12.", direction: "lowers", weight: "moderate" },
      { from: "Too few laws signed", to: "Your vote share", how: "Up to 12 points. The charge grows as the term runs, and it shrinks with each law you sign, to nothing at six.", direction: "lowers", weight: "moderate" },
      { from: "A veto Congress overrode", to: "Your vote share", how: "3 points each, up to 9.", direction: "lowers", weight: "weak" },
      { from: "A broken first-hundred-days pledge", to: "Your vote share", how: "3 points each, up to 9.", direction: "lowers", weight: "weak" },
      { from: "A government running without a budget", to: "Your vote share", how: "2 points while it runs on last year's numbers.", direction: "lowers", weight: "weak" },
      { from: "Holding the office", to: "Your vote share", how: "A flat 3 points for being the sitting President.", direction: "raises", weight: "weak" },
      { from: "Everything on your record together", to: "Your share, after the record", how: "The total is capped at 15 points, and it can't push your share below 41.5 percent.", direction: "lowers", weight: "moderate" },
    ],
    examples: [
      {
        title: "One election night, worked through",
        kind: "illustration",
        lines: [
          "Imagine your three voter groups rate you 60 percent on average. That's 10 points above an even split, so you start at 50 + 10 x 0.36 = 53.6 percent.",
          "Holding office adds 3 points, for 56.6 percent. Say turnout, momentum and the other party's candidate net out to nothing.",
          "Your record has two orders struck down (8 points) and one use of force Congress never approved (3 points). That's 11 points, under the 15-point cap, so all of it counts and you land at 45.6 percent.",
          "Each state is then called from that national share plus how it leans. You add up the electors from the states you carry, and you need 270 of 538 to win.",
        ],
      },
      {
        title: "Why the states decide",
        kind: "history",
        lines: [
          "In 2000, George W. Bush won the presidency with 271 electoral votes to Al Gore's 266, although Gore received about half a million more votes nationwide. The Electoral College counts states, not the national total.",
        ],
      },
    ],
    youCan: [
      "Raise your voter groups' ratings by governing well. They are the biggest mover in the count.",
      "Ask Congress before you use force, and sign orders likely to survive a court challenge, so these penalties never start.",
      "Sign enough laws over the term, and pass a budget, so the \"too few laws\" and \"no budget\" charges stay small.",
      "Keep your first-hundred-days pledges.",
      "Check the projected race in the Executive page as the term goes on, and past results on the elections and term page.",
    ],
    next: ["midterm-seats", "promise-lifecycle", "what-moves-approval"],
    terms: ["vote-share", "voter-blocs", "electoral-college", "contingent-election", "first-hundred-days", "midterm-election"],
  },
  // engine press.ts pressDrivers, outletDrivers, PRESS_DRIFT .03, DRIVER_CAP .3,
  // SILENCE_TOLERANCE_TURNS 6; press-outlets.ts LEAN_WEIGHT .35,
  // FORMAT_PARTISANSHIP; press-beliefs.ts PRESS_BELIEF_WEIGHT .4; press-framing.ts
  // FRAMING_WEIGHT .15; opinion-causes.ts PRESS_COVERAGE_WEIGHT .5, _CAP .15.
  // Link weight: strong is a factor of 0.3 or more, moderate a move of 6 points
  // or more, weak under 6. Per-link: struck * .07, unauthorized * .06, contested
  // * .03, silence * .02, ballot of the blocs.
  {
    id: "press-story-spreads",
    title: "How coverage forms and spreads",
    summary:
      "Every news outlet judges a President from the same facts, then adds its own politics and its audience's. In the game, 18 invented outlets each have an attitude toward you. The press's overall view is their plain average, and only a small, capped part of it reaches what the public believes about you. You can change the record the outlets read from and how you talk to reporters.",
    cast: [
      { label: "Wires, dailies, weeklies, networks, trade and business press", role: "Read your politics at face value, with no extra weight on who you are.", icon: "press", term: "press-corps" },
      { label: "Websites and podcasts", role: "React to who you are twice as strongly as the outlets above do.", icon: "microphone" },
      { label: "Cable channels and talk radio", role: "React to who you are harder still, at 2.5 times as strongly for cable and 3 times for talk radio. Each comes in a left and a right pair.", icon: "microphone" },
      { label: "Four regional papers", role: "Each covers one part of the country and files only home news. They never carry a national story's legs.", icon: "mapPin" },
    ],
    steps: [
      {
        label: "The record",
        detail:
          "Every outlet reads the same facts: orders courts threw out, orders you had to defend in court, force used without Congress's approval, how your voter groups feel, how long since you took questions, and the country's own press freedom.",
        icon: "record",
      },
      {
        label: "Each outlet's view",
        detail:
          "On top of the record, each outlet adds its general attitude toward any administration, how its audience sees you, what it thinks of the acts you signed, and how you explained them. That sets where the outlet is heading.",
        icon: "press",
        duration: "Moves at most 3 points a week",
      },
      {
        label: "The press's overall view",
        detail: "The plain average of all 18 outlets. A bigger outlet doesn't count for more.",
        term: "press-corps",
        icon: "graph",
      },
      {
        label: "What the country believes",
        detail: "The press's view feeds the public's judgments of your honesty and your competence. It doesn't set your approval directly.",
        icon: "ballot",
        exit: "Coverage is capped. At worst, hostile coverage costs about 3 to 4 points of approval.",
      },
    ],
    links: [
      { from: "Orders the courts struck down", to: "Every outlet's view", how: "Lowers the level every outlet drifts toward by 7 points per order.", direction: "lowers", weight: "moderate" },
      { from: "Force used without Congress's approval", to: "Every outlet's view", how: "Lowers it by 6 points each time.", direction: "lowers", weight: "moderate" },
      { from: "Orders you had to defend in court", to: "Every outlet's view", how: "Lowers it by 3 points per order, even when the court upholds it.", direction: "lowers", weight: "weak" },
      { from: "Weeks without taking questions", to: "Every outlet's view", how: "Lowers it by 2 points a week once you have gone 6 weeks without taking questions.", direction: "lowers", weight: "weak" },
      { from: "How your voter groups rate you", to: "Every outlet's view", how: "Each point of their average rating above or below 50 moves it 0.4 of a point.", direction: "shifts", weight: "strong" },
      { from: "What you sign, against each outlet's beliefs", to: "That outlet's view", how: "Pulls each outlet in a different direction, because the same act can please one and annoy another.", direction: "shifts", weight: "strong" },
      { from: "How you explained an act", to: "That outlet's view", how: "Counts less than the act itself. An explanation that contradicts the act is caught a week later, and the outlets that bought it swing back harder.", direction: "shifts", weight: "weak" },
      { from: "The press's overall view", to: "Honesty and competence judgments", how: "Moves them by half its distance from neutral, at most 0.15.", direction: "shifts", weight: "weak" },
    ],
    examples: [
      {
        title: "One ruling, many outlets",
        kind: "illustration",
        lines: [
          "A court strikes down one of your orders. Every outlet reads that the same way, so the level all 18 drift toward falls 7 points.",
          "An outlet whose beliefs favor the order's goal judges your act more kindly than one that opposes it. Cable and talk radio swing furthest on who you are rather than what you did.",
          "Each outlet moves at most 3 points a week, so the 7-point drop shows up fully in about three weeks.",
          "The overall view is the average of all 18. It nudges the public's honesty and competence judgments by half its distance from neutral, and no more than 0.15.",
        ],
      },
    ],
    youCan: [
      "Read where each outlet stands, and why, in the media directory.",
      "Hold a press conference or sit for an interview to move outlets directly.",
      "Take questions at least every 6 weeks, so silence doesn't become the story.",
      "Explain a recent order to the press, within two weeks of signing it and one act a week. Explain it honestly, because a line that contradicts the order is caught.",
    ],
    next: ["press-three-plays", "scandal-lifecycle", "what-feeds-the-judgments"],
    terms: ["press-corps", "press-briefing", "press-secretary", "anonymous-sourcing", "legs"],
  },
  // engine press.ts PRESS_PLAYS, playMovement, projectPressAction (chance = .35 +
  // skill * .4 + (record - .5) * .5 - exposure; exposure interview .1,
  // conference .25, leak .35), podiumSkill, podiumSubject. Points are moves in an
  // outlet's 0 to 100 attitude; "strong" is 0.12 or more, "weak" under 0.06.
  {
    id: "press-three-plays",
    title: "Three ways to talk to the press",
    summary:
      "Presidents reach the public through reporters, and they can do it in the open or through a source nobody names. In the game, an interview is small and safe, a press conference is the only move that shifts every outlet in one week, and a leak buys coverage until it's traced back to you. Each goes well or badly, and the game shows you how likely it is to go well before you commit.",
    cast: [
      { label: "You, at the podium", role: "Pick the play. Your own skill, your record and your press secretary set the odds.", icon: "microphone", term: "press-briefing" },
      { label: "Your press secretary", role: "Carries a third of a press conference and all of a leak, and none of an interview.", icon: "subjectPerson", term: "press-secretary" },
      { label: "The outlet you pick", role: "Takes an interview or a leak in full. The other outlets feel only a share of it.", icon: "press", term: "press-corps" },
    ],
    steps: [
      {
        label: "Choose a play",
        detail: "An interview with one outlet, a press conference with all of them, or a leak. The game shows how likely it is to go well first. For the same skill and record, an interview has the best odds, a press conference lower, and a leak the lowest.",
        icon: "brief",
        youCan: "Compare the forecasts on the Press page before you commit.",
      },
      {
        label: "Reporters pick the topic",
        detail: "You don't choose the topic. A running scandal comes first, then your most recent act, and your record in general only if neither exists.",
        icon: "gavel",
      },
      {
        label: "It goes well or badly",
        detail: "The outcome is settled once, against the odds shown in the forecast. A skilled speaker and a clean record raise them.",
        icon: "review",
        exit: "A leak that goes badly is a leak traced back to you.",
      },
      {
        label: "The outlets move",
        detail: "Every outlet's attitude toward you shifts by the amounts below. A bad press conference also dents your competence rating, and a bad leak dents your honesty rating and opens a scandal.",
        icon: "graph",
        term: "scandal",
      },
    ],
    links: [
      { from: "A press conference that goes well", to: "Every outlet", how: "Up 12 points with every outlet, because all of them were there.", direction: "raises", weight: "strong" },
      { from: "A press conference that goes badly", to: "Every outlet", how: "Down 10 points, and your competence takes a small hit.", direction: "lowers", weight: "moderate" },
      { from: "An interview", to: "That outlet", how: "Up 5 or down 2 there. A fifth of a good result and two fifths of a bad one spread to the others.", direction: "shifts", weight: "weak" },
      { from: "A leak that lands", to: "That outlet", how: "Up 8 points with the outlet that got the scoop.", direction: "raises", weight: "moderate" },
      { from: "A leak traced back to you", to: "Every outlet", how: "Down 14 points everywhere, and the public's belief in your honesty drops.", direction: "lowers", weight: "strong" },
      { from: "A leak traced back to you", to: "A running scandal", how: "Opens a story about the leak, with a charge that counts 0.7 out of 1.", direction: "raises", weight: "strong" },
    ],
    examples: [
      {
        title: "The same bad week, three ways",
        kind: "illustration",
        lines: [
          "You hold a press conference and it goes badly: all 18 outlets fall 10 points, and your competence rating slips a little.",
          "You sit for an interview with one outlet and it goes badly. That outlet falls 2 points, and each of the others falls 0.8.",
          "You leak to one outlet and it is traced to you: all 18 outlets fall 14 points, your honesty rating drops, and a scandal opens. The scoop was worth almost nothing to the outlets that didn't get it, but the tracing costs you the full amount with all of them.",
        ],
      },
    ],
    youCan: [
      "Use an interview when you want a small, safe gain with one outlet.",
      "Hold a press conference when you need to move the whole press in one week and your record can take the questions.",
      "Leave leaks for when a bad result is survivable, because a leak is the one play that hurts everywhere at once.",
      "Keep a skilled press secretary in the post.",
    ],
    next: ["press-story-spreads", "scandal-lifecycle"],
    terms: ["press-briefing", "press-secretary", "anonymous-sourcing", "press-corps", "scandal"],
  },
  // engine causality.ts CausalOrigin and the stamps apply() writes onto an
  // ActionRecord (causeIds, effectiveDate); projection.ts MagnitudeBand.
  // RecordDetail reads only stamped fields.
  {
    id: "record-causal-trail",
    title: "How the Record traces cause",
    summary:
      "A politician's record is the list of what they did. In the game, the Record is one list of everything that happened. Each entry notes where it came from, what it changed and which earlier entries caused it, so you can trace any effect back to the decision behind it.",
    cast: [
      { label: "A decision of yours", role: "An order you signed, a bill you vetoed, a program you adopted.", icon: "sign" },
      { label: "An institution", role: "An agency, a court or another body doing its own job.", icon: "building" },
      { label: "The wider world", role: "Another country, a disaster, the economy moving on its own.", icon: "world" },
      { label: "The calendar", role: "Something scheduled that arrived on its date, such as an election.", icon: "schedule" },
      { label: "A situation on your Desk", role: "An event the game put in front of you to answer.", icon: "desk" },
    ],
    steps: [
      {
        label: "Where it came from",
        detail: "Every entry names its source, one of the five above. An entry that names no earlier cause started its chain.",
        icon: "record",
      },
      {
        label: "Predicted",
        detail: "If the decision showed an estimate, the Record keeps it. That is the expected effect on each figure (slight, moderate or major) and how confident the estimate was.",
        icon: "review",
      },
      {
        label: "What it did",
        detail: "The figures that actually changed, set beside the estimate. A figure that changes later shows up as something the act caused.",
        icon: "graph",
      },
      {
        label: "What followed",
        detail: "Later entries name this one as their cause. An effect can arrive after a delay, and the Record keeps both the decision date and the date it took effect.",
        icon: "dispatch",
        exit: "An entry with no recorded cause started its chain, begun by the world or the calendar.",
      },
    ],
    examples: [
      {
        title: "A signature and a figure that slipped",
        kind: "illustration",
        lines: [
          "In March you sign a tariff. The Record lists it as a decision of yours, with the estimate the card showed, if it showed one.",
          "In July a state's employment figure slips. Without a trail, those are two unrelated lines.",
          "With one, the July entry names the March signature as its cause, and the March entry lists July among its consequences. The Record also keeps both dates, the day you signed and the day the tariff reached shelves.",
        ],
      },
    ],
    youCan: [
      "Open any entry in the Record to see what caused it and what it caused.",
      "Compare an estimate with what happened, to learn how far to trust the next one.",
      "Follow a bad figure back to the decision behind it before you decide what to change.",
    ],
    next: ["decision-cost-and-impact", "impact-assessment-firms-up"],
    terms: ["the-record"],
  },
  // engine impact-calculation.ts impactReport (low for a country-level proxy,
  // high only for a site assessment with a calibrated model, else medium; error
  // .6 / .3 / .1; stages by status; totals never fall, serviceDisruption can;
  // last 12 reports kept); impact-lifecycle.ts advanceImpactEvents (a report a
  // day, a feed line on day one, every seventh day and at resolution).
  {
    id: "impact-assessment-firms-up",
    title: "How an impact assessment is reported and updated",
    summary:
      "After a disaster or attack, officials estimate how many people were hurt and what was lost. In the game, each report gives a range rather than an exact number, and the range is as wide as the evidence allows. New reports follow as the event unfolds, and totals such as deaths can only go up.",
    steps: [
      {
        label: "Initial",
        detail: "The first day's report, with the widest margin its evidence allows.",
        icon: "caution",
        duration: "The first day",
        youCan: "Read the range, and plan for the high end.",
      },
      {
        label: "Update",
        detail: "A new report arrives each day while the event runs, and the newest one stands. Totals like deaths and injuries never drop. The count of people cut off from a service can come back down as it is restored.",
        icon: "schedule",
        duration: "A report a day, and a headline about once a week for incidents at home",
      },
      {
        label: "Final",
        detail: "Issued when the incident is resolved. It is still a range, because the evidence never becomes exact.",
        icon: "sign",
        exit: "Economic loss combines damaged property and missed output. It is an estimate of harm to the economy, not money out of the federal budget.",
      },
    ],
    links: [
      { from: "A country-level estimate only", to: "Report range", how: "With low confidence, each end sits 60 percent above or below the true figure.", direction: "shifts", weight: "strong" },
      { from: "A regional estimate, or a site visit with an unchecked model", to: "Report range", how: "With medium confidence, each end sits 30 percent above or below.", direction: "shifts", weight: "moderate" },
      { from: "A site visit and a model checked against real records", to: "Report range", how: "With high confidence, each end sits 10 percent above or below.", direction: "shifts", weight: "weak" },
    ],
    examples: [
      {
        title: "One flood, three reports",
        kind: "illustration",
        lines: [
          "A flood hits a region. After the first day the true toll in the game's hidden figures is 500 deaths, and no report ever states that figure.",
          "A report built on a country-level estimate says 200 to 800 deaths, low confidence. One built on a regional estimate says 350 to 650. One built on a site visit and a model checked against real records says 450 to 550.",
          "As the flood goes on, the true toll climbs to 1,000. The site-visit report updates to 900 to 1,100. It never goes back down.",
          "When the flood is over, the final report is still a range, not an exact count.",
        ],
      },
    ],
    youCan: [
      "Open the Record's impacts view to read the latest range for each event.",
      "Treat a low-confidence range as a rough guide and a high-confidence one as a firm one.",
      "Act on the emergency itself. For an incident tied to an ongoing emergency, a stronger government response lowers the totals later reports show.",
    ],
    next: ["record-causal-trail", "domestic-emergencies"],
    terms: ["impact-assessment", "fema"],
  },
  // engine press-scandal.ts SCANDAL_BREAK_INTENSITY .5, SCANDAL_LEGS_STEP .09,
  // SCANDAL_DEVELOP_TURNS 6, SCANDAL_FADE_STEP .18, SCANDAL_LEGS_BAR .25,
  // SCANDAL_WRONG_ANSWER_LEGS 4, SCANDAL_INTEGRITY_WEIGHT .25, crestAge;
  // scandal-response.ts INTEGRITY_BY_PRICE (.02, .05, .09), CHARGE_BIAS,
  // SCANDAL_COUNSEL_ACCURACY .6; opinion.ts SALIENCE_MULTIPLIERS.scandalLive
  // (integrity 1.6 on a base .14, about half again once renormalized);
  // committee-inquiry.ts INQUIRY_OPENS_BELOW .5; removal.ts congressionalPressure
  // (oversight * .1) inside PRESSURE_WEIGHTS.congress (.129).
  {
    id: "scandal-lifecycle",
    title: "How a scandal runs its course",
    summary:
      "A scandal is a public controversy over possible wrongdoing by your administration. In the game, a story breaks and either dies after a week or keeps going. A story that keeps going builds for up to 6 weeks, peaks and fades. While it runs it costs you the public's trust in your honesty, and your answer can end it sooner or add weeks.",
    cast: [
      { label: "The press", role: "A story keeps going only if enough outlets keep asking. The most hostile national outlet counts for half, and the average of the 14 national outlets for the other half.", icon: "press", term: "press-corps" },
      { label: "You", role: "You answer a story once. You can come clean, fight it, or give them someone, which means an officer takes responsibility and leaves.", icon: "sign" },
      { label: "Your lawyer", role: "Reads how much the press can prove, and is right about three times in five.", icon: "subjectPerson" },
      { label: "A committee of Congress", role: "Can open its own investigation into the biggest running story, if its members lean against you.", icon: "gavel", term: "congressional-inquiry" },
    ],
    steps: [
      {
        label: "Breaking",
        detail: "The week it breaks, a story starts at half strength, scaled by how serious the charge is.",
        icon: "caution",
        duration: "1 week",
        youCan: "Answer it now. The sooner a fitting answer comes, the lower the story peaks.",
        exit: "If it doesn't take off, it costs one week and ends. To keep going, the charge's seriousness times how hostile the press is that week has to be above 0.25.",
      },
      {
        label: "Developing",
        detail: "A story that takes off grows a little stronger each week.",
        term: "legs",
        icon: "press",
        duration: "Up to 6 weeks",
        youCan: "Answer it from the story's page in the press room. You get one answer per story.",
      },
      {
        label: "Fading",
        detail: "After its peak, it loses strength about twice as fast as it gained it.",
        icon: "schedule",
        duration: "Up to about 6 weeks",
        exit: "Of the three answers, one fits what the press can prove and stops the story growing that week. One is a step off and changes nothing. The worst fit adds 4 more weeks of growth.",
      },
      { label: "Resolved", detail: "Its strength reaches zero, or the story is closed. A closed story stays closed.", icon: "sign" },
    ],
    links: [
      { from: "A live scandal", to: "Belief in your honesty", how: "Pulls it down while the story runs, by up to a quarter point on a 0 to 1 scale for the most serious charge at full strength. Honesty also counts for about half again as much in your approval while any story runs.", direction: "lowers", weight: "strong" },
      { from: "An answer that fits what the press can prove", to: "The story", how: "It stops growing that week and starts to fade. Costs a little honesty (0.02).", direction: "lowers", weight: "strong", outcome: "helps" },
      { from: "An answer one step off", to: "The story", how: "It keeps its course. Costs 0.05 of honesty.", direction: "shifts", weight: "weak" },
      { from: "The worst answer for the file", to: "The story", how: "Adds 4 weeks of growth, and costs 0.09 of honesty.", direction: "raises", weight: "strong", outcome: "hurts" },
      { from: "The biggest running scandal", to: "A congressional investigation", how: "Opens one only when the committee's goodwill toward you is below half. Only the biggest story counts.", direction: "raises", weight: "moderate" },
      { from: "A public investigation", to: "Removal pressure", how: "A small part of Congress's share of the pressure to remove you. Congress is about an eighth of the total, and an investigation about a tenth of that.", direction: "raises", weight: "weak" },
    ],
    examples: [
      {
        title: "A story, week by week",
        kind: "illustration",
        lines: [
          "In week 0, an inspector general's report on a department is published. Its charge counts 0.6, so the story breaks at half strength.",
          "In week 1, the press reads 0.5 hostile. 0.6 x 0.5 = 0.3, above the 0.25 bar, so the story has legs. At 0.4 hostile, 0.24 would fall short and the story would have ended after one week.",
          "In week 2, your lawyer reads the file as thin, and you fight the story. If the file really was thin, the answer fits, so the story stops growing and begins to fade.",
          "On the other branch, the file names a specific person, and fighting the story is the worst answer. The denial becomes the story, it grows for 4 more weeks than it would have, and you lose 0.09 of honesty instead of 0.02.",
        ],
      },
      {
        title: "A story with legs",
        kind: "history",
        lines: [
          "In June 1972, men were caught breaking into the Democratic Party's offices at the Watergate complex in Washington. The White House called it a \"third-rate burglary\". Reporting and later investigations kept the story alive for more than two years, until President Richard Nixon resigned on August 9, 1974.",
        ],
      },
    ],
    youCan: [
      "Answer a live story from its page in the press room: come clean, fight it, or give them someone. Two of the three miss the file, and one of those is the worst fit.",
      "Ask for your lawyer's read on the file. Thin favors fighting it, a name in it favors giving someone, and thick favors coming clean. The read is right about three times in five.",
      "Answer early. A fitting answer stops the story growing that week.",
      "Avoid answers you can't afford. Giving someone costs you that officer, and a department runs on an acting chief until the Senate confirms a successor.",
    ],
    next: ["inquiry-stages", "removal-ladder", "press-three-plays"],
    terms: ["scandal", "legs", "inspector-general-report", "press-corps"],
  },
  // engine pledges.ts pledgeVerdict, pledgeDueDate, PLEDGE_STAKES, strainDecay
  // (a missed deadline is held longer than a reversal); platform-deliverables.ts;
  // pledge-outcomes.ts HELD_OUTCOMES; player-core record/promises.ts
  // PLEDGE_WARNING_DAYS 14; opinion-causes.ts PROMISE_INTEGRITY, PROMISE_MEMORY_WEEKS 52,
  // promisesCause (the honesty judgment's target is shifted by the stakes times a
  // memory that fades in a straight line to zero at 52 weeks); pledges.ts
  // PLEDGE_STAKES (the one-time jolt in the week of settling: first hundred days
  // broken -.12, kept .06; term broken -.02, kept .01; applyMoodDeltas); opinion.ts OPINION_DRIFT (.06: the judgment closes
  // 6 percent of its gap to the target each week). Simulated at the era's level of division:
  // a broken first-hundred-days promise starts at -.12 and is -.037 at 52 weeks;
  // a broken term promise peaks near -.034 around week 18 and is -.014 at 52
  // weeks; a kept first-hundred-days promise starts at .06 and is .013 at 52 weeks;
  // a kept term promise peaks near .012 around week 12.
  {
    id: "promise-lifecycle",
    title: "How a promise is kept or broken",
    summary:
      "A campaign promise is one voters can later check. In the game, the platform you ran on becomes dated pledges when you take the oath. Each pledge is settled by what you do, or by what a program has achieved by the due date. The public remembers a settled promise for a year.",
    cast: [
      { label: "Keep a program", role: "Budget, trade and energy planks. The program starts on your first day. You keep the promise by leaving it in place and having it deliver what the plank said by the due date.", icon: "departmentTreasury" },
      { label: "Put a program in place", role: "Rebuilding the military, policing reform and open government. Kept the week you adopt the program.", icon: "approve" },
      { label: "Sign an order", role: "Securing the border. Kept the week you sign the order.", icon: "sign" },
    ],
    steps: [
      { label: "Platform", detail: "Up to five planks, and no two about the same program.", term: "plank", icon: "ballot" },
      {
        label: "Pledge made",
        detail: "One dated pledge per plank. A first-hundred-days pledge is due 100 days after the oath, the rest at the first midterm election.",
        term: "pledge",
        icon: "schedule",
        duration: "100 days, or a little under two years for a term pledge",
      },
      {
        label: "Open",
        detail: "Within 14 days of its due date, an open pledge needs your attention, and the Desk tells you.",
        icon: "caution",
        youCan: "Act on it before the due date: sign the order, adopt the program, or keep the program that delivers.",
      },
      {
        label: "Settled",
        detail:
          "Kept the week you sign the order or put the program in place. A promise to keep a program breaks the week the program ends, or on the due date if it hasn't achieved what the plank promised.",
        icon: "sign",
        exit: "An order never signed, or a program never put in place, breaks on the due date.",
      },
    ],
    links: [
      { from: "A broken first-hundred-days pledge", to: "Belief in your honesty", how: "Drops by up to 0.12 on a 0 to 1 scale the week it breaks (less in a divided country), about half the cost of a running scandal. It recovers slowly: about 0.04 of the loss is still there a year later.", direction: "lowers", weight: "strong" },
      { from: "A broken term pledge", to: "Belief in your honesty", how: "A smaller jolt that deepens as the public settles on it, to about 0.03 below normal after a few months. It mostly fades within a year.", direction: "lowers", weight: "moderate" },
      { from: "A kept pledge", to: "Belief in your honesty", how: "A kept hundred-days pledge lifts it by up to 0.06 and a kept term pledge by about 0.01, and the credit fades over about a year. Voters expected you to keep it.", direction: "raises", weight: "weak" },
      { from: "A pledge you break", to: "The voter groups it was written to please", how: "They turn against you. A deadline you let pass is held against you longer than a program you reversed.", direction: "lowers", weight: "moderate" },
      { from: "A broken first-hundred-days pledge", to: "Your next election's vote share", how: "3 points each, up to 9.", direction: "lowers", weight: "moderate" },
    ],
    examples: [
      {
        title: "Two planks, from oath to midterm",
        kind: "illustration",
        lines: [
          "Before the oath, you run on \"Secure the border\", marked as a first-hundred-days promise, and \"Balance the budget\", a promise for the term.",
          "On oath day two pledges appear on the Record. The border pledge is due 100 days later. The budget pledge is due on the first midterm election day. The game also starts you on a budget-cutting program.",
          "On day 86 the border pledge is within 14 days of its due date, so the Desk flags it.",
          "You sign the border order in week 10. The pledge is kept that week, and the public's belief in your honesty rises a little (up to 0.06), fading over about a year.",
          "At the midterm the game checks the budget pledge. The program is still in place, but is the budget closer to balance than at the oath? If not, the pledge is broken and your honesty rating sinks, by about 0.03 at its worst over the following months.",
        ],
      },
      {
        title: "The 100-day yardstick",
        kind: "history",
        lines: [
          "After Franklin Roosevelt's 1933 special session passed a rush of New Deal bills, journalists began measuring every new President by the same first hundred days. The game borrows the yardstick. You can promise three things in that window, and the country holds you to them.",
        ],
      },
    ],
    youCan: [
      "Choose your planks before the oath. You can run on up to five and mark up to three as first-hundred-days promises.",
      "Watch open pledges in the Record's commitments view, and act before they come due.",
      "Before you commit a program or an order in Policy, read the note that names the promise it would keep or break.",
      "Keep a program in place until its due date if you promised to keep it, and make sure it delivers.",
    ],
    next: ["election-vote-share", "what-feeds-the-judgments"],
    terms: ["plank", "pledge", "first-hundred-days", "midterm-election"],
  },
];
