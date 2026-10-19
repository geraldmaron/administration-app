// Decisions, oversight and removal.
export const DESK_GLOSSARY = [
    // Real: the Attorney General heads the Department of Justice, including the
    // FBI; 28 U.S.C. 503 (appointed by the President with Senate consent).
    // Game: special-counsel.ts attorneyGeneralRole (the Justice cabinet seat),
    // seatedAttorneyGeneral, COUNSEL_DISMISSAL_DISPOSITION_COST (.2).
    {
        id: "attorney-general",
        term: "Attorney General",
        icon: "departmentJustice",
        definition: "The head of the Justice Department, which prosecutes federal crimes and runs the Federal Bureau of Investigation (the FBI, the federal police agency that investigates crimes). The President nominates the Attorney General and the Senate has to approve. The Attorney General can also appoint a special counsel.",
        example: "If prosecutors want to charge a member of Congress with bribery, the Attorney General's department is the one that brings the case.",
        inGame: "The Attorney General is a seat in your cabinet. This is the seat that appoints a special counsel once an investigation into you has gone far enough. If you fire the Attorney General while a special counsel is working, the counsel carries on, and the firing costs you 20 points of goodwill in Congress.",
        related: ["special-counsel", "obstruction", "cabinet", "executive-branch"],
    },
    // Real: the Inspector General Act (5 U.S.C. 401-424; 5 U.S.C. 403 for
    // appointment and the thirty days' written reasons to both houses before
    // removal) and its bar on an agency head stopping an audit, with
    // national-security carve-outs for a few departments.
    // Game: oversight.ts IG_REMOVAL_NOTICE_DAYS, INSPECTED_INSTITUTIONS;
    // inspectors-general.ts auditWarrant (oversight pressure .5, politicization
    // .3, lost integrity .2), AUDIT_OPENS_AT (.45), NOTICE_DISPOSITION_COST (.05),
    // OBSTRUCTING_NOTICE_DISPOSITION_COST (.12), obstruct (sets public and
    // obstructed); directives.ts REFUSALS_BEFORE_MATTER (2).
    {
        id: "inspector-general",
        term: "Inspector general",
        icon: "review",
        definition: "An independent auditor inside a federal department who looks for fraud, waste and abuse. The President appoints the inspectors general of the large departments, and the Senate approves each one. To remove one, the President must tell both houses of Congress why, in writing, at least 30 days ahead.",
        example: "If a department's contracts keep going to friends of the administration, its inspector general can open an audit and publish a report, even if the Secretary who runs the department would rather they didn't.",
        inGame: "Every department starts with one. An inspector general opens an audit when its department looks badly run. That means others have flagged problems, politics is steering staff, or honesty is slipping. Across the government, at most one audit a week opens this way. A department that refuses your second directive gets an audit too. An audit stays private until its report, and you can't close it. You can file notice to remove the inspector general. The notice takes effect after 30 days and costs you 5 points of goodwill in Congress. If an audit is running, it goes on anyway, becomes public that day, and is marked as obstruction. The notice then costs 12 points. Once the inspector leaves, nobody audits that department from inside.",
        related: ["obstruction", "special-counsel", "congressional-inquiry", "inspector-general-report", "executive-branch"],
    },
    // Real: McGrain v. Daugherty (1927), Congress's inquiry power as an auxiliary
    // of lawmaking. Game: committee-inquiry.ts INQUIRY_OPENS_BELOW (.5),
    // committeeInquiryPhase (one new inquiry a week at most), nextCause (the four
    // causes: obstructed audit, contested order, covert act, live scandal);
    // oversight.ts STAGE_WEIGHT (opened 0).
    {
        id: "congressional-inquiry",
        term: "Congressional investigation",
        icon: "gavel",
        definition: "A House or Senate committee looking into the executive branch: demanding documents, calling witnesses and holding hearings. The Supreme Court has held that Congress may do this, because it can't write good laws without knowing how the government is working.",
        example: "In 1973 a Senate committee held televised hearings on the Watergate scandal and called White House staff to testify.",
        inGame: "A committee opens one only when it leans against you, meaning its goodwill toward you is below 50 out of 100, and it has a reason. A reason can be an inspector general you moved to remove during an audit, an executive order of yours challenged in court, covert action you ordered, or the biggest scandal in the press. Across Congress, at most one new investigation opens a week. It's public from the first day and costs you nothing for its first 3 weeks.",
        related: ["inspector-general", "obstruction", "special-counsel", "hill-mood", "congress"],
    },
    // Real: 28 CFR 600.1 and 600.7. Game: special-counsel.ts predicateMatters
    // (public, obstructed, reported, aimed at you), specialCounselPhase (one at a
    // time, needs a seated Attorney General), COUNSEL_DISMISSAL_DISPOSITION_COST
    // (.2); ORIGIN_WEIGHT (1.4) in oversight.ts. Mueller, May 2017.
    {
        id: "special-counsel",
        term: "Special counsel",
        icon: "gavel",
        definition: "A prosecutor from outside the Justice Department's usual chain of command. The Attorney General appoints one when a criminal investigation is needed but the Department has a conflict of interest. Only the Attorney General can discipline or remove one, and only for good cause.",
        example: "In 2017 the Justice Department appointed Robert Mueller as special counsel to investigate Russian interference in the 2016 election.",
        inGame: "The Attorney General appoints one only after an investigation into you has reported and been marked as obstruction, and only if you have an Attorney General in office. Only one works at a time, and nothing you do can reach it. Firing the Attorney General while one is working doesn't stop it. The firing costs you 20 points of goodwill in Congress and marks the counsel's investigation as obstruction for good. That investigation counts 1.4 times as much against you as an ordinary one.",
        related: ["attorney-general", "inspector-general", "obstruction"],
    },
    // Real: 18 U.S.C. 1505. Game: oversight.ts OBSTRUCTION_WEIGHT (.45, above
    // every STAGE_WEIGHT, the largest .3) and OBSTRUCTION_MEMORY_DAYS (168);
    // inspectors-general.ts obstruct; special-counsel.ts obstructedByDismissal
    // and predicateMatters.
    {
        id: "obstruction",
        term: "Obstruction",
        icon: "caution",
        definition: "Interfering with an official investigation. Federal law makes it a crime to corruptly obstruct a proceeding before a federal agency or an inquiry by Congress.",
        example: "Obstruction of justice was a charge in the articles of impeachment drawn up against Richard Nixon in 1974 and passed against Bill Clinton in 1998.",
        inGame: "An investigation is marked as obstruction when you move against the people running it. That means filing notice to remove the inspector general during an audit, or firing the Attorney General while a special counsel is working. Obstruction weighs more against you than the investigation itself at any stage, and it keeps counting for 24 weeks after the investigation closes. A special counsel can't be appointed without it.",
        related: ["inspector-general", "special-counsel", "congressional-inquiry"],
    },
    // Real: Art. I, sec. 2 cl. 5 (the House has the sole power of impeachment).
    // Game: removal.ts BEAT_THRESHOLDS (.52 for the House vote), advanceRemovalArc
    // (a beat opens only when the chamber's count carries);
    // removal-votes.ts REMOVAL_VOTE_STEPS (articles, house, majorityOf).
    {
        id: "impeachment",
        term: "Impeachment",
        icon: "gavel",
        definition: "The House of Representatives formally charging an official with wrongdoing by voting for articles of impeachment. The Constitution gives this power to the House alone. Impeachment is the charge, and it doesn't remove anyone.",
        example: "In 1998 the House impeached Bill Clinton. The Senate acquitted him in 1999, and he served out his term.",
        inGame: "At 52 percent removal pressure the House can vote on impeachment, and it does so as soon as a majority (218 of 435) would vote yes. If pressure is past 52 percent but the votes aren't there, nothing happens that week. The game counts the vote party by party. Impeachment alone doesn't end your presidency.",
        related: ["removal-pressure", "conviction", "caucus-break"],
    },
    // Real: Art. I, sec. 3 cl. 6-7. Game: removal.ts BEAT_THRESHOLDS (.6),
    // advanceRemovalArc; removal-votes.ts REMOVAL_VOTE_STEPS (conviction, senate,
    // supermajorityOf: 67 of 100); the Chief Justice's presiding is not modeled.
    {
        id: "conviction",
        term: "Conviction and removal",
        icon: "court",
        definition: "After the House impeaches, the Senate holds a trial. When the President is tried, the Chief Justice presides. Conviction takes two thirds of the senators present. The penalty can be removal from office and a ban from holding office again, nothing more.",
        example: "In 1868 the Senate fell one vote short of the two thirds needed to convict President Andrew Johnson, so he stayed in office.",
        inGame: "The Senate is counted only after the House has impeached you and removal pressure has reached 60 percent. If two thirds of the Senate (67 of 100), counted party by party, would convict, you are removed that week and your presidency ends. The game has no Chief Justice presiding and no ban on holding office again. The vote count is the whole trial.",
        related: ["impeachment", "removal-pressure", "caucus-break"],
    },
    // Game: removal-votes.ts caucusBreakAt (grave at the last of BEAT_THRESHOLDS),
    // electorate.ts caucusBreakShare (CAUCUS_BREAK_CEILING .65, _SLOPE 18.4,
    // _MIDPOINT .75) read off ownIdentifierApproval.
    // Real: Gallup, Feb 2020 (49%, one of 53) and Jan 2021 (34%, seven of 50).
    {
        id: "caucus-break",
        term: "Breaking ranks",
        icon: "flag",
        definition: "Members of the President's own party voting against the President. A party's members in a chamber, with any independents who side with it, are called its caucus. No Senate has ever convicted a President, and in real cases a President's party held together until the public had turned against them.",
        example: "In February 2021 the Senate voted on convicting President Trump, who had just left office. His last approval reading as President, in January, was about 34 percent, and 7 of the 50 senators in his party voted to convict. At his first trial in February 2020, with approval near 49 percent, 1 of 53 did.",
        inGame: "Members of your caucus answer to their own voters. So what counts is how many of your own party's identifiers still approve of you, not your national approval. Members vote against you only once removal pressure has reached 60 percent, because only then is the charge grave. After that, the share who break grows as your own side gives up. At about 78 percent of them still approving, roughly a quarter of the caucus breaks, and the share keeps rising to about two thirds. An honest President who is failing keeps most of their own party, and a grave charge is what turns that into votes. The Removal pressure panel on the Brief shows how many of your senators a grave charge would cost today.",
        related: ["impeachment", "conviction", "inability", "approval-rating"],
    },
    // Real: Twenty-fifth Amendment, section 4, never invoked; the Senate's 2020 and
    // 2021 counts anchor the caucus break it reuses. Game: inability.ts
    // INABILITY_OWN_LINE (.7), INABILITY_SUSTAIN_DAYS (91), INABILITY_RETRY_DAYS
    // (182), countInability (two thirds of each chamber). The line and the wait
    // are design judgments: no roll call has ever been taken under section 4.
    {
        id: "inability",
        term: "Removal for inability",
        icon: "court",
        definition: "The Twenty-fifth Amendment lets the Vice President and a majority of the cabinet declare the President unable to discharge the office. If the President contests it, two thirds of each chamber must agree. It has never been used against a President who objected.",
        example: "A President who has committed no crime but has lost the confidence of their own party entirely has no other way out before the next election.",
        inGame: "The game watches how many of your own party's identifiers still approve of you. If fewer than 70 percent do for a full 13 weeks, the Vice President and cabinet make the declaration, and Congress counts. Two thirds of each chamber must agree, with your own caucus breaking as far as your own side has given up. If it fails, no second declaration comes for 26 weeks. The 70 percent line and the waits are the game's own thresholds, and no real President has been tested on them. No charge is needed, which is why an honest but failing President can still be removed.",
        related: ["caucus-break", "removal-pressure", "approval-rating"],
    },
    // Game: removal.ts PRESSURE_WEIGHTS (unpopularity .331, alignment .184,
    // decisionHistory .129, congress .129, floors .147, faction .08),
    // BEAT_THRESHOLDS (.45, .52, .6), computeRemovalPressure.
    {
        id: "removal-pressure",
        term: "Removal pressure",
        icon: "caution",
        definition: "A gauge the game uses, from 0 to 100 percent. Real life has no meter for how close Congress is to impeaching a President. It comes down to votes, and votes follow public opinion, politics and the facts of the case. The game adds those together into one gauge.",
        example: "If your approval is 40 percent, that alone puts about 20 points of removal pressure on the gauge.",
        inGame: "It's made of six readings, and the biggest is how unpopular you are. At 45 percent a committee starts talking about impeachment. At 52 percent the House can vote, and at 60 percent the Senate can. Pressure decides when a vote is called, and the count of votes decides how it ends.",
        related: ["impeachment", "conviction", "approval-rating"],
    },
    // Real: Gallup's standing question asks adults whether they approve of how the
    // President is handling the job. Game: opinion.ts selectElectorate, OPINION_WEIGHTS;
    // electorate.ts blocApprovals, headlineOf, HONEYMOON_VALENCE (.3) over
    // HONEYMOON_WEEKS (26), erosionOf; congress.ts dispositionTarget
    // (.25 + approval x .55); removal.ts PRESSURE_WEIGHTS.unpopularity (.331).
    // The figure is written by apply(), never set by an effect.
    {
        id: "approval-rating",
        term: "Approval rating",
        icon: "graph",
        definition: "The share of Americans who tell a pollster they approve of how the President is handling the job. Gallup has asked the question since the 1930s, and presidents watch it closely.",
        example: "If a poll of 1,000 adults finds 450 who approve of how the President is handling the job, the approval rating is 45 percent.",
        inGame: "No single decision sets your approval. It adds up six judgments the public holds about your government: security, prosperity, public services, integrity (is the government honest), competence, and unity. Three blocs read those judgments: your party and its leaners, the independents, and the other party and its leaners. Each bloc starts where its party loyalty puts it, with your own side far above the country and the other side far below. Your record moves it from there. Approval is the three blocs added up, each weighted by its share of the country. Your own party's identifiers move least on the news, and independents move the most. A scandal that makes the country doubt your honesty can cost you among your own party. Force or sanctions please one party and put off the other. A new President gets a benefit of the doubt, worth about two points at the oath, that fades to nothing over 26 weeks. Approval also sets the goodwill Congress heads toward, and it's the biggest part of removal pressure.",
        related: ["polarization", "political-stability", "removal-pressure", "hill-mood"],
    },
    // Game: polarization.ts ERA_POLARIZATION (1), POLARIZATION_DRIFT_MAX (.25) and
    // _MIN (-.15), POLARIZATION_STEP (.02), POLARIZATION_HALF_LIFE_WEEKS (104),
    // MAX_TURN_POLARIZE (.012); electorate.ts BLOC_INTERCEPT, BLOC_FLATTENING,
    // valenceSlope.
    {
        id: "polarization",
        term: "Polarization",
        icon: "layerBlocs",
        definition: "How sharply the country divides along party lines. In a polarized country a President's rating moves less with events, because each side has already made up its mind.",
        example: "In a country where each party's voters have made up their minds, a good jobs report changes few of them.",
        inGame: "Every game opens at the level of the 2020s, when the parties were about as far apart as they have been. You can deepen it by up to a quarter, or heal it by up to 15 percent, and no more. More division holds each party's view of you where it is. Your own party's identifiers back you more firmly, the other party's oppose you more firmly, and both move less on the news. Independents respond as they always do, so more of any swing comes from them. Polarization drifts back toward the level of the 2020s by half in about two years. So a wedge you drive every week levels off a fifth or so above it. A divisive week moves it a little, and a unifying week moves it back a little, so it takes years to move far.",
        related: ["approval-rating"],
    },
    // Game: opinion-causes.ts securityTerms and competenceTerms read
    // metrics.stability (competence .3 x stability); removal.ts
    // REMOVAL_METRIC_FLOOR (.05) and FLOOR_BREACHES.
    {
        id: "political-stability",
        term: "Political stability",
        icon: "layerTrust",
        definition: "How calm and orderly public life is: whether people expect the government, the streets and the institutions to hold. Protests, riots, strikes and political violence are signs that it is low.",
        example: "A country with weeks of riots and a government crisis has low stability. One with peaceful elections and ordinary protests has high stability.",
        inGame: "You'll see it on a scale from 0 to 100. It's where the public's judgment on security starts, and each point of it adds 0.3 of a point to the judgment on competence. It reaches approval only through those two judgments. A reading stuck at the floor also counts toward removal pressure.",
        related: ["approval-rating", "removal-pressure"],
    },
    // Game: metrics.ts standing; opinion-causes.ts competenceTerms (standing .25);
    // removal.ts REMOVAL_METRIC_FLOOR (.05) and FLOOR_BREACHES.
    {
        id: "standing-abroad",
        term: "International standing",
        icon: "world",
        definition: "How other governments treat the United States, including whether they return its calls, follow its lead and see it as a reliable partner.",
        example: "When allies join a U.S.-led effort without being pressed, the country's standing is high. When they publicly refuse to, it is low.",
        inGame: "You'll see it on a scale from 0 to 100. Each point of it adds a quarter of a point to the public's judgment on competence. A reading stuck at the floor also counts toward removal pressure.",
        related: ["approval-rating", "removal-pressure"],
    },
    // Game: attention.ts AttentionUrgency, DEFER_DAYS (hard 7, soft 14),
    // deferUntil (never past a due date); campaign/stop-brief.ts deferMatterPacket.
    // Real: Art. I, sec. 7 for the ten-day signing clock.
    {
        id: "put-off",
        term: "Put off",
        icon: "paused",
        definition: "Choosing to deal with something later. A deadline set by law keeps running whether or not anyone is ready. For example, a bill the President leaves unsigned for 10 days, Sundays excepted, becomes law without a signature.",
        example: "You put off a nominee's paperwork that can wait, and it comes back in 2 weeks. A bill with 3 days left on its signing clock comes back in 3 days, not 2 weeks.",
        inGame: "When you put an item off, it's set aside for 1 week if it's urgent or 2 weeks if it can wait, and never past its own deadline. Then it comes back to your desk. The choice goes on the Record, and Continue never puts anything off for you.",
        related: ["veto"],
    },
];
export const DESK_EXPLAINERS = [
    // advance.ts advanceUntilAttention (look before the first day and after each,
    // DEFAULT_HORIZON_DAYS 28, StopReason); attention.ts MAX_MATTERS_PER_STOP (3),
    // AttentionUrgency (ambient never stops time); desk/clock-pace.ts
    // clockIntervalMs (1000 and 333 ms).
    {
        id: "how-a-week-runs",
        title: "How time runs when you press Continue",
        summary: "Time moves one day at a time and pauses by itself when something needs your decision. A few things are on the calendar, such as elections, the budget deadline and the Federal Reserve's meetings. Everything else arrives when events call for it, so a stretch with nothing due is a quiet one. You choose when to move on. Press Continue to run time until the next thing needs you.",
        steps: [
            { label: "Check", detail: "Before the first day and after every day, the game checks with each part of government to see whether it needs a decision from you.", icon: "intel" },
            { label: "Run a day", detail: "If nothing needs you, one more day passes. The clock buttons run one day a second, or three a second on fast.", icon: "schedule" },
            { label: "Pause", detail: "When something needs your decision, time pauses. You see at most three items at once, the most urgent first.", icon: "decision", exit: "News, and items you have already put off, don't pause time.", youCan: "Decide it, or put it off from its own row." },
            { label: "Return brief", detail: "When you come back, the Return brief tells you what happened, why time paused, and what the news reported.", icon: "record", exit: "If nothing needs you, one press of Continue runs up to 4 weeks.", youCan: "Read the Return brief before you press Continue again." },
        ],
        examples: [{
                title: "When Continue won't run",
                kind: "illustration",
                lines: [
                    "A decision is waiting, so Continue stays paused. If it ran, time would stop again before a single day passed.",
                    "Make the decision, or put the item off from its own row, and the next press runs until something else needs you.",
                ],
            }],
        youCan: [
            "Press Continue to run time until something needs you.",
            "Put an item off from its own row when it can wait.",
            "Read the Return brief to see what happened while time ran.",
        ],
        next: ["decision-cost-and-impact", "what-moves-approval"],
        terms: ["put-off"],
    },
    // opinion.ts OPINION_WEIGHTS (prosperity .28, security .22, services .16,
    // integrity .14, competence .12, unity .08); electorate.ts HONEYMOON_VALENCE .3
    // over HONEYMOON_WEEKS 26, blocApprovals, headlineOf, FORCE_ISSUE_WEIGHT;
    // OPINION_DRIFT .06 and OPINION_HALF_LIFE_TURNS (11), applyMoodDeltas. Strong is
    // a weight of .2 or more, moderate .1 or more, weak under .1. The worked case:
    // .6x.28 + .5x.22 + .5x.16 + .7x.14 + .5x.12 + .5x.08 = .556; then the blocs'
    // shares times their approval: .45x85 + .10x56 + .45x25 = 55.
    {
        id: "what-moves-approval",
        title: "What moves your approval rating",
        summary: "Your approval rating is the share of Americans who say they approve of how you are handling the job. Low approval cools Congress toward you, and it's the biggest part of the pressure to remove you. No single decision sets it. It adds up six judgments the public makes about your government, so you raise it by improving the things those judgments rest on.",
        cast: [
            { label: "The public", role: "Forms six judgments about your government and weighs each one at the share below.", icon: "election" },
            { label: "Three blocs", role: "Your party and its leaners, the independents, and the other party and its leaners. Each reads the same six judgments from its own starting point, and your approval is their shares of the country times their approval, added up.", icon: "layerBlocs", term: "polarization" },
            { label: "The press", role: "Decides what is in the headlines, and the public weighs most whatever the headlines are about.", icon: "press" },
        ],
        links: [
            { from: "Prosperity", to: "Approval", how: "Jobs, prices and growth decide whether people feel better off. This is 28 percent of the total.", direction: "shifts", weight: "strong" },
            { from: "Security", to: "Approval", how: "People ask whether they're safe from war, violence and disorder. This is 22 percent.", direction: "shifts", weight: "strong" },
            { from: "Public services", to: "Approval", how: "People ask whether the government shows up with disaster relief, hospitals, clean water and roads. This is 16 percent.", direction: "shifts", weight: "moderate" },
            { from: "Integrity", to: "Approval", how: "People ask whether the government is honest, tells the truth and keeps its word. This is 14 percent.", direction: "shifts", weight: "moderate" },
            { from: "Competence", to: "Approval", how: "People ask whether the government can do the basic work without dropping things. This is 12 percent.", direction: "shifts", weight: "moderate" },
            { from: "Unity", to: "Approval", how: "People ask whether the government serves the whole country. This is 8 percent, and it tracks how divided the country is.", direction: "shifts", weight: "weak" },
            { from: "Polarization", to: "Each bloc", how: "Spreads the blocs apart and makes the two parties move less on the six judgments. Independents aren't slowed.", direction: "shifts", weight: "moderate" },
            { from: "A scandal about your honesty", to: "Your own party's approval", how: "Costs you among your own party only when the country doubts your honesty and a story is running. A divided country passes less of it on.", direction: "lowers", weight: "moderate", outcome: "hurts" },
            { from: "Force and sanctions", to: "Each bloc", how: "Republicans favor military strength more than Democrats do, so using force pleases one party and puts off the other, whichever party you belong to. The effect is small and counts for at most one point of your approval. What a war costs the country is counted once, in the six judgments.", direction: "shifts", weight: "weak" },
            { from: "A new term", to: "Approval", how: "A new President gets the benefit of the doubt, worth about two points at the oath, fading to nothing over 26 weeks.", direction: "raises", weight: "weak", outcome: "helps" },
            { from: "Changes in the country", to: "Each judgment", how: "The public changes its mind slowly. In an undivided country a judgment closes half the gap to what it can see in about 11 weeks. A divided country is slower.", direction: "shifts", weight: "weak" },
        ],
        examples: [{
                title: "Reading one rating",
                kind: "illustration",
                lines: [
                    "Say the public rates your government out of 100: prosperity 60, security 50, public services 50, integrity 70, competence 50, unity 50.",
                    "Weight each by its share. 60 x 0.28 + 50 x 0.22 + 50 x 0.16 + 70 x 0.14 + 50 x 0.12 + 50 x 0.08 comes to about 56.",
                    "Three blocs read that. Say your party and its leaners are 45 percent of the country and approve at 85, independents are 10 percent and approve at 56, and the other party and its leaners are 45 percent and approve at 25.",
                    "Add each bloc's share times its approval. 0.45 x 85 + 0.10 x 56 + 0.45 x 25 comes to about 55. That is your approval.",
                ],
            }],
        youCan: [
            "Work on what the six judgments are made of, which is jobs and prices, safety at home, disaster relief, integrity, and well-run agencies.",
            "Keep the promises you ran on. A broken one costs you trust for a year.",
            "Watch the national figures on the Desk, and read the Record for what moved your rating.",
        ],
        next: ["what-the-news-is-about", "what-feeds-the-judgments", "removal-ladder"],
        terms: ["approval-rating", "polarization"],
    },
    // opinion-causes.ts economyTerms (base .75; unemployment x2, inflation x1.5,
    // growth x2 offset, PRICE_LEVEL_WEIGHT 1; never above .75), securityTerms
    // (stability in full, insurgency x.4, CRIME_SECURITY_WEIGHT .3), servicesTerms
    // (base .7, carrying .7 - .6 x worst emergency, money .4 + .6 x treasury,
    // SERVICES_DELIVERY_DRAG .35), integrityTerms (SCANDAL_INTEGRITY_WEIGHT .25,
    // PROMISE_INTEGRITY, PRESS_COVERAGE_WEIGHT .5 capped at PRESS_COVERAGE_CAP
    // .15), competenceTerms (base .15, readiness .3, stability .3, standing .25,
    // .15 per empty seat, COMPETENCE_DELIVERY_DRAG .45), unity (UNITY_BASE .6
    // less UNITY_DIVISION_WEIGHT 1.6 times the drift); OPINION_HALF_LIFE_TURNS 11 (longer when polarized, applyMoodDeltas). Strong: one unit of the cause
    // moves the judgment by a point or more, or 15 points for a whole thing such
    // as a seat or a story; moderate .3 up to 1 (5 to 15 for a whole thing);
    // weak below. The worked case: 4 points of unemployment x2 = 8 off the
    // target, half after 11 weeks, and prosperity carries .28 of approval.
    {
        id: "what-feeds-the-judgments",
        title: "What each judgment is made of",
        summary: "Each of the six judgments rests on facts you can read and change, such as jobs and prices, order at home, how emergencies are handled, and whether promises are kept. Knowing which fact feeds which judgment shows you where to act. A judgment moves slowly toward what the country can see, so a steady fix works better than one big week.",
        links: [
            { from: "Unemployment", to: "Prosperity", how: "Each point of unemployment takes 2 points off. At 5 percent unemployment, that's 10 points.", direction: "lowers", weight: "strong", outcome: "hurts" },
            { from: "Rising prices", to: "Prosperity", how: "Each point of yearly inflation takes 1.5 points off. Separately, suppose prices now stand above the path the inflation rate at the start of your term would have produced. Each percent above takes one point off. Inflation at that old pace costs nothing here, and only the excess does.", direction: "lowers", weight: "strong", outcome: "hurts" },
            { from: "Economic growth", to: "Prosperity", how: "Each point of yearly growth gives back 2 points, but prosperity never rises above 75 out of 100.", direction: "raises", weight: "strong", outcome: "helps" },
            { from: "Political stability", to: "Security", how: "The judgment starts at the stability figure. War, armed opposition at home, and crime then move it.", direction: "shifts", weight: "strong" },
            { from: "Armed opposition and crime", to: "Security", how: "Armed groups at home take off 0.4 of their strength. Crime above where it was heading takes off 0.3 of the excess.", direction: "lowers", weight: "moderate", outcome: "hurts" },
            { from: "An emergency at home", to: "Public services", how: "With none, services read up to 70 out of 100. An emergency at full severity cuts that to 10.", direction: "lowers", weight: "moderate", outcome: "hurts" },
            { from: "An empty treasury", to: "Public services", how: "A full treasury pays for the response. An empty one cuts what's left of this judgment by 60 percent.", direction: "lowers", weight: "moderate", outcome: "hurts" },
            { from: "A running scandal", to: "Integrity", how: "A story at full strength takes up to 25 points off, less if it is fading.", direction: "lowers", weight: "strong", outcome: "hurts" },
            { from: "Promises kept and broken", to: "Integrity", how: "A broken first-hundred-days promise pulls where this judgment is heading down by 12 points, and a broken later one by 5. Kept ones add 4 and 1.5. All of it fades in a straight line over 52 weeks, and the public's belief follows slowly, so the full effect builds gradually.", direction: "shifts", weight: "moderate" },
            { from: "The press corps", to: "Integrity and competence", how: "Friendly coverage adds, hostile coverage subtracts, up to 15 points each way on both judgments.", direction: "shifts", weight: "strong" },
            { from: "Political stability", to: "Competence", how: "Each point adds 0.3 of a point. A fully stable country adds 30.", direction: "raises", weight: "moderate", outcome: "helps" },
            { from: "Military readiness", to: "Competence", how: "Each point adds 0.3 of a point. It shows whether the forces could answer if called.", direction: "raises", weight: "moderate", outcome: "helps" },
            { from: "International standing", to: "Competence", how: "Each point adds a quarter of a point.", direction: "raises", weight: "weak", outcome: "helps" },
            { from: "An empty cabinet seat", to: "Competence", how: "Each empty seat takes 15 points off, so filling your cabinet helps.", direction: "lowers", weight: "strong", outcome: "hurts" },
            { from: "Agencies with nobody running them", to: "Public services and competence", how: "Take off 0.35 of the unstaffed share from services and 0.45 from competence.", direction: "lowers", weight: "moderate", outcome: "hurts" },
            { from: "Polarization", to: "Unity", how: "Unity reads what you did to the country's division, not the level it opened at. A country no more divided than in the 2020s reads 60. Deepening the division by the most a term allows reads 20, and healing it by the most reads 84.", direction: "lowers", weight: "strong", outcome: "hurts" },
        ],
        examples: [{
                title: "A slow slide in jobs",
                kind: "illustration",
                lines: [
                    "Say unemployment rises 4 points. That lowers where prosperity is heading by 8 points (4 x 2).",
                    "In a country with no polarization, prosperity covers half the gap in about 11 weeks (4 points lower) and nearly all of it in a year. A divided country is slower.",
                    "Prosperity is 28 percent of approval, so a year later approval is down a bit over 2 points on this alone, before the blocs read it.",
                ],
            }],
        youCan: [
            "Fill every cabinet seat, and staff the agencies that deliver. Both feed services and competence.",
            "Keep the treasury funded and answer emergencies at home.",
            "Keep your promises, and answer a running scandal before it grows.",
        ],
        next: ["what-moves-approval", "what-the-news-is-about"],
        terms: ["political-stability", "standing-abroad", "approval-rating"],
    },
    // opinion.ts SALIENCE_MULTIPLIERS and SALIENCE_REASONS; weights are
    // renormalized by salientWeights (multipliers stack); ECONOMIC_PAIN (inflation
    // .03, unemployment .02 over the term start); selectSalience. Strong is a
    // multiplier of 1.6 or more, moderate 1.4 or more, weak under that. Shares are
    // the base weight times the multiplier over the new total with nothing else
    // in the news: war security .374/1.154 = 32, emergency services .272/1.142 =
    // 24, scandal integrity .224/1.084 = 21, economy prosperity .406/1.126 = 36,
    // unrest security .308/1.112 = 28, gasoline prosperity .35/1.07 = 33. The
    // worked case: prosperity 70, security 30, the rest 50.
    {
        id: "what-the-news-is-about",
        title: "Why some weeks count more",
        summary: "The public doesn't weigh the six judgments evenly. It gives the most weight to whatever is in the headlines. When one subject dominates, the judgment about it counts for more in your approval and the others count for less, so a strong economy won't save you during a war. To take weight off a judgment, deal with the subject the headlines are about.",
        links: [
            { from: "A war", to: "Weight of security", how: "Counts 1.7 times as much, so security's share of your approval goes from 22 to about 32 percent. A war you joined beside an ally counts too.", direction: "raises", weight: "strong" },
            { from: "An emergency at home", to: "Weight of public services", how: "A disaster, epidemic or unrest. Services count 1.7 times as much (16 to about 24 percent) and competence 1.25 times.", direction: "raises", weight: "strong" },
            { from: "A scandal running", to: "Weight of integrity", how: "Counts 1.6 times as much, from 14 to about 21 percent.", direction: "raises", weight: "strong" },
            { from: "Rising prices or joblessness", to: "Weight of prosperity", how: "Counts 1.45 times as much (28 to about 36 percent) once inflation is 3 points or unemployment 2 points above where your term began.", direction: "raises", weight: "moderate" },
            { from: "Unrest or insurgency", to: "Weight of security", how: "Counts 1.4 times as much (22 to about 28 percent), and competence 1.2 times.", direction: "raises", weight: "moderate" },
            { from: "A gasoline price spike", to: "Weight of prosperity", how: "Counts 1.25 times as much, from 28 to about 33 percent.", direction: "raises", weight: "weak" },
        ],
        examples: [{
                title: "The same country, before and after a war",
                kind: "illustration",
                lines: [
                    "Say prosperity reads 70 out of 100, security 30 and the other four judgments 50. In a calm week your approval is about 51.",
                    "A war breaks out and nothing else changes. Security now counts for 32 percent of your approval and prosperity for 24, instead of 22 and 28.",
                    "Your approval falls to about 48, because the weak judgment now counts more and the strong one counts less.",
                ],
            }],
        youCan: [
            "See what the press is covering, and deal with that subject first.",
            "Expect your strongest judgment to count for less while a bigger story is running.",
            "End or manage a war, answer an emergency, or get ahead of a scandal to take the weight off a weak judgment.",
        ],
        next: ["what-moves-approval", "scandal-lifecycle"],
        terms: ["approval-rating"],
    },
    // oversight.ts MATTER_QUIET_DAYS (21), MATTER_RIPENS_DAYS (84),
    // MATTER_REPORT_STANDS_DAYS (28), matterRipensTurn, ripened() (reads nothing
    // about the administration; the report sets public), STAGE_WEIGHT (opened 0),
    // OBSTRUCTION_MEMORY_DAYS (168); inspectors-general.ts openedMatter (an audit
    // opens private) and obstruct; committee-inquiry.ts openedInquiry and
    // special-counsel.ts appointedCounsel (both public on day one);
    // special-counsel.ts obstructedByDismissal. No act anywhere closes a matter.
    // Real: Saturday Night Massacre, October 20, 1973.
    {
        id: "inquiry-stages",
        title: "How an investigation runs",
        summary: "An investigation is an official look into possible wrongdoing in your administration. An inspector general (an auditor inside a department), a committee of Congress, or a special counsel runs it. Once it's public, it costs you goodwill in Congress and adds to the pressure to remove you. You can't speed it up or end it, and obstructing it makes things worse.",
        cast: [
            { label: "An inspector general", role: "An auditor inside one department. An audit stays private until its report.", icon: "review", term: "inspector-general" },
            { label: "A congressional committee", role: "A small group of lawmakers. Announces its investigation the day it opens.", icon: "gavel", term: "congressional-inquiry" },
            { label: "A special counsel", role: "A prosecutor you can't instruct. The Attorney General appoints one after an obstructed investigation reports.", icon: "court", term: "special-counsel" },
            { label: "You", role: "You can't end an investigation. You can only avoid obstructing it.", icon: "desk" },
        ],
        steps: [
            { label: "Opened", detail: "For the first 3 weeks the investigators get started. A committee or special counsel announces its investigation the same day. An inspector general's audit stays private, and costs you nothing, until its report.", icon: "open", duration: "3 weeks", youCan: "See every investigation, even private audits, on the Oversight page." },
            { label: "Gathering evidence", detail: "For the next 12 weeks, investigators collect documents and interviews. A public investigation holds the level Congress's goodwill heads toward a little lower for as long as it runs.", icon: "intel", duration: "12 weeks", exit: "Moving against the investigators now has a price. Filing notice to remove the inspector general, or firing the Attorney General while a special counsel works, marks the investigation as obstruction and makes an audit public at once.", youCan: "Leave the investigators alone." },
            { label: "Report", detail: "The findings come out and become public. For the 4 weeks the report stands, the investigation costs you the most goodwill in Congress.", icon: "record", duration: "4 weeks", youCan: "Read the finding in the Record." },
            { label: "Closed", detail: "The investigation is closed and kept in the Record. It stops costing you anything.", icon: "approve", exit: "If it was marked as obstruction, it keeps costing you for 24 more weeks and can lead to a special counsel." },
        ],
        examples: [
            {
                title: "Following one investigation",
                kind: "illustration",
                lines: [
                    "Week 1: a committee that leans against you opens an inquiry, because a court has been asked to strike down one of your executive orders. It's announced that day and costs you nothing yet.",
                    "Week 4: it starts collecting documents. For as long as it does, the level Congress's goodwill is heading toward sits about 2.4 points lower. That cost stays level and doesn't add up week by week.",
                    "Week 16: it reports. For 4 weeks the cost is about 6 points.",
                    "Week 20: it closes and the cost stops.",
                ],
            },
            {
                title: "Removing an inspector general mid-audit",
                kind: "illustration",
                lines: [
                    "An inspector general opens a private audit of a department. If you leave it alone, nobody outside hears of it until the report, 15 weeks later.",
                    "If you file notice to remove that inspector general, the audit becomes public that day and is marked as obstruction. It still runs to its report, and a committee of Congress can open its own investigation into the removal.",
                ],
            },
            {
                title: "The Saturday Night Massacre",
                kind: "history",
                lines: [
                    "In October 1973 President Nixon ordered the special prosecutor investigating Watergate fired. The attorney general and his deputy resigned rather than do it, and a third official carried out the order. The firing deepened public anger, and the investigation went on.",
                ],
            },
        ],
        youCan: [
            "Check the Oversight page to see what's running and which stage it's in.",
            "Leave inspectors general and the Attorney General in place while an investigation runs.",
            "Plan around the report. It lands about 15 weeks after an investigation opens, and it costs the most.",
        ],
        next: ["inquiry-cost", "removal-ladder"],
        terms: ["inspector-general", "congressional-inquiry", "special-counsel", "obstruction", "attorney-general"],
    },
    // oversight.ts STAGE_WEIGHT (gathering .12, reported .3), OBSTRUCTION_WEIGHT
    // (.45), ORIGIN_WEIGHT (special counsel 1.4), rawContribution (a private or
    // directed matter weighs nothing); selectOversightPressure (sum capped at 1);
    // congress.ts dispositionTarget (OVERSIGHT_MOOD_COST .2); removal.ts
    // congressionalPressure (hostility .55, oversight x .1) inside the congress
    // term (.129). Points are the pressure times .2, as a share of the 0-100
    // goodwill figure. The worked case: .3 + .45 = .75, x .2 = 15 points; removal
    // gets .75 x .1 x .129 plus .15 x .55 x .129, about 2 points.
    {
        id: "inquiry-cost",
        title: "What an investigation costs you",
        summary: "Only a public investigation into you costs anything. The cost doesn't come off your approval directly. It cools Congress toward you, which makes bills and nominees harder, and it adds a little to the pressure to remove you.",
        links: [
            { from: "An investigation gathering evidence", to: "Investigation pressure", how: "Adds 0.12. Investigation pressure is the game's score for how much trouble your open investigations are causing. 0.12 means about 2.4 points less goodwill in Congress.", direction: "raises", weight: "moderate" },
            { from: "An investigation that has reported", to: "Investigation pressure", how: "Adds 0.30, which is about 6 points less goodwill. That's the most of any stage.", direction: "raises", weight: "strong" },
            { from: "Obstruction", to: "Investigation pressure", how: "Adds 0.45 more at any stage, which is about 9 more points. That's more than a report costs.", direction: "raises", weight: "strong" },
            { from: "A special counsel's investigation", to: "Investigation pressure", how: "Counts 1.4 times an ordinary one.", direction: "raises", weight: "moderate" },
            { from: "Investigation pressure", to: "Goodwill in Congress", how: "The goodwill Congress drifts toward drops by 0.2 of the pressure.", direction: "lowers", weight: "moderate", outcome: "hurts" },
            { from: "Investigation pressure", to: "Removal pressure", how: "Adds one tenth of the pressure to Congress's share of removal pressure.", direction: "raises", weight: "weak", outcome: "hurts" },
        ],
        examples: [{
                title: "A reported, obstructed investigation",
                kind: "illustration",
                lines: [
                    "A committee has reported on a covert operation you ordered (0.30) and you moved against it (0.45 more). Investigation pressure is 0.75.",
                    "Congress's goodwill toward you now heads toward a level 15 points lower (0.75 x 0.2).",
                    "Together with the direct share, that adds about 2 points to removal pressure. That's small alone, but it stacks on a bad approval rating.",
                ],
            }],
        youCan: [
            "Avoid obstruction, because it costs more than the investigation itself.",
            "Expect a report to bring the costliest 4 weeks, and plan your bills and nominees around it.",
            "Watch Congress's goodwill on the Congress page while an investigation runs.",
        ],
        next: ["inquiry-stages", "removal-ladder"],
        terms: ["obstruction", "hill-mood"],
    },
    // removal.ts BEAT_THRESHOLDS (.45, .52, .6), PRESSURE_WEIGHTS (strong .3 or
    // more, moderate .1 to .3, weak under .1), advanceRemovalArc (one beat a week;
    // a beat opens only when the chamber's count carries), standingBeatPressure
    // (STANDING_BEAT_SWING .08, BEAT_RIPENS_OVER_DAYS 84), DECISION_HISTORY_DAYS
    // (70), FLOOR_BREACH_WINDOW_DAYS (168), congressionalPressure (hostility .55,
    // unilateral force .35, oversight .1); removal-votes.ts REMOVAL_VOTE_STEPS
    // (House majorityOf 218 of 435, Senate supermajorityOf 67 of 100),
    // caucusBreakAt (caucusBreakShare, CAUCUS_BREAK_CEILING .65), removalVoteLine. Real: Johnson 1868 (35-19),
    // Clinton 1999, Trump 2020 and 2021 acquittals; four House impeachments (1868,
    // 1998, 2019, 2021); Nixon resigned August 1974 before a full House vote.
    {
        id: "removal-ladder",
        title: "How a President is removed",
        summary: "Congress can remove a President through impeachment. The House charges, and then the Senate holds a trial. In the game, removal pressure (a gauge of how close Congress is to acting) decides when each vote is called, and a party-by-party count decides how it ends. You can lower the pressure by fixing what feeds it. A President whose own party has given up on them can also be removed for inability, with no charge brought.",
        cast: [
            { label: "The House", role: "435 members. A majority of them, 218, can impeach you.", icon: "subjectChamber", term: "house" },
            { label: "The Senate", role: "100 senators. Two thirds, 67, must vote to convict and remove you.", icon: "court", term: "senate" },
            { label: "Your caucus in Congress", role: "They hold together until your own party's voters turn on you. They break ranks only over a grave charge, and in proportion to how far your own side has given up.", icon: "flag", term: "caucus-break" },
            { label: "The public", role: "Their approval of you is the biggest part of the pressure.", icon: "election", term: "approval-rating" },
        ],
        steps: [
            { label: "Talk in committee", detail: "At 45 percent pressure, the House starts discussing impeachment. No one has voted yet, and nothing is decided.", icon: "caution", exit: "If pressure falls back, no further step comes. Steps already taken stay on your record." },
            { label: "House votes", detail: "From 52 percent, the House votes on articles of impeachment as soon as a majority supports them. Impeachment is the charge, and it doesn't remove you.", icon: "subjectChamber", term: "impeachment", youCan: "Read the House count on the Brief before the vote." },
            { label: "Senate trial", detail: "Once the House has impeached you and pressure reaches 60 percent, the game counts the Senate. If two thirds would vote to convict, you are removed that week and your presidency ends.", icon: "court", term: "conviction", exit: "Members of your caucus break ranks only over a grave charge, and only as far as your own party's voters have given up on you.", youCan: "Raise your approval and ease the pressure before the count." },
        ],
        thresholds: [
            { label: "Committee talk begins at pressure", needed: 45, of: 100, note: "Lawmakers on a committee start talking about impeachment." },
            { label: "The House can vote at pressure", needed: 52, of: 100, note: "The House votes on articles of impeachment once a majority would vote yes." },
            { label: "The Senate can vote at pressure", needed: 60, of: 100, note: "The Senate is counted, after the House has impeached." },
            { label: "House: impeach", needed: 218, of: 435, note: "A simple majority of the House." },
            { label: "Senate: convict and remove", needed: 67, of: 100, note: "Two thirds of the Senate. Members of your caucus count only once they break ranks." },
        ],
        links: [
            { from: "How unpopular you are", to: "Removal pressure", how: "One minus your approval, counted at 0.331. This is the biggest part. At 40 percent approval, it adds about 20 points.", direction: "raises", weight: "strong", outcome: "hurts" },
            { from: "Heavy-handed conduct", to: "Removal pressure", how: "How far your accumulated conduct runs more authoritarian than the institutions that can remove you expect, counted at 0.184.", direction: "raises", weight: "moderate", outcome: "hurts" },
            { from: "Recent decisions that cost approval", to: "Removal pressure", how: "The approval your decisions have cost over the last 10 weeks, added up and counted at 0.129.", direction: "raises", weight: "moderate", outcome: "hurts" },
            { from: "A hostile Congress", to: "Removal pressure", how: "Counted at 0.129. It covers Congress's coldness toward you, force used without asking it, and open investigations.", direction: "raises", weight: "moderate", outcome: "hurts" },
            { from: "Running out of money, order or standing", to: "Removal pressure", how: "Counted at 0.147. It covers weeks in the last 24 when the treasury was empty, or stability or standing sat at the floor.", direction: "raises", weight: "moderate", outcome: "hurts" },
            { from: "A rival bloc in your own government", to: "Removal pressure", how: "Counted at 0.08. It covers cabinet members who have broken away.", direction: "raises", weight: "weak", outcome: "hurts" },
            { from: "A motion left standing", to: "Removal pressure", how: "Adds up to 8 points over 12 weeks if the conditions that opened it hold. Pull them back and it takes up to 8 points off.", direction: "shifts", weight: "moderate" },
        ],
        examples: [
            {
                title: "How a presidency could end",
                kind: "illustration",
                lines: [
                    "Week 20: approval is 41 percent, the treasury ran dry twice, and Congress is cold. Removal pressure reaches 46 percent, and a committee starts talking about impeachment. Nothing is voted.",
                    "Week 30: pressure reaches 53 percent, and the opposition has the House seats. The House votes to impeach you that week. You are charged, but not removed.",
                    "Week 40: pressure reaches 61 percent, but the Senate count is still short of the 67 votes needed because most of your caucus holds together. You stay in office.",
                    "Week 44: your own party's identifiers fall to about 70 percent approving, and a grave charge arrives. Nearly half of your caucus's senators break ranks, the count reaches 67, and you are removed that week.",
                ],
            },
            {
                title: "From history",
                kind: "history",
                lines: [
                    "The House has impeached a President four times: Andrew Johnson in 1868, Bill Clinton in 1998, and Donald Trump in 2019 and 2021. The Senate has never convicted one. Johnson's trial ended one vote short of two thirds, and the three later trials all ended in acquittal.",
                    "Richard Nixon resigned in August 1974, after a House committee had approved articles of impeachment and before the full House voted. His approval was about 24 percent.",
                ],
            },
        ],
        youCan: [
            "Keep your approval up. It's the biggest part of the pressure.",
            "Ease the conditions a filed motion was brought over. The motion loses weight if you do.",
            "Keep the treasury funded, stability up, and your cabinet together.",
            "Ask Congress before you use force. Each use it wasn't asked about adds to the pressure.",
        ],
        next: ["what-moves-approval", "inquiry-cost", "cabinet-breaks"],
        terms: ["removal-pressure", "impeachment", "conviction", "caucus-break", "inability", "approval-rating"],
    },
    // directives.ts: DirectiveStatus ("carried", "slow-walked", "refused"), the
    // authority check (KIND_REQUIRES, holdsFunction, STATUTORY_BARS for Justice,
    // the IRS and the Fed, independence "independent" as the catch-all),
    // carriedStatus (semi-autonomous or implementationQuality under
    // SLOW_WALK_QUALITY .6), RefusalMemorandum, refusalEffects (politicization and
    // oversight pressure rise; REFUSALS_BEFORE_MATTER 2 opens a private audit of
    // the White House's casework at the inspecting body). Real: 26 U.S.C. 7217
    // bars asking the IRS to audit a particular taxpayer; the Federal Reserve sets
    // monetary policy independently of the President.
    {
        id: "agency-directive",
        title: "What happens when you direct an agency",
        summary: "A directive is a written instruction from you to one federal agency. An agency is a part of the executive branch, like the Internal Revenue Service, which collects taxes, or the Environmental Protection Agency, which sets and enforces pollution rules. No chance is involved. Either someone there has the legal power to carry out your instruction, or you get a written refusal that names the law. Each refusal goes on the record, and a second one at the same agency opens an audit.",
        cast: [
            { label: "An agency under your control", role: "Like the Environmental Protection Agency. It carries out your order if it's running well.", icon: "building", term: "executive-branch" },
            { label: "An agency barred by law", role: "Like the Internal Revenue Service or the Justice Department. It takes direction on policy but not on named cases.", icon: "departmentJustice" },
            { label: "An independent body", role: "Like the Federal Reserve. By law, it takes no instruction from you.", icon: "departmentCentralBank", term: "federal-reserve" },
        ],
        steps: [
            { label: "Instruction", detail: "Pick the agency and say what you want. You can ask it to open a case, aim enforcement at a named person or company, set how strictly it enforces, set how fast it imposes sanctions, or set interest rates. You're only offered what that agency does.", icon: "order", youCan: "Give an instruction from the Directives tab on the Oversight page." },
            { label: "Authority check", detail: "The game checks whether that agency has the legal power to do it. Agencies under your direct control usually do. Independent ones, like the Federal Reserve, mostly don't take orders from you.", icon: "law" },
            { label: "Carried out", detail: "The agency does it. This is the usual result when you ask an agency under your control for something within its job.", icon: "approve" },
            { label: "Slow-walked", detail: "The agency doesn't refuse, but nothing happens. It's partly independent by law, or it's running too poorly right now to deliver. No refusal is written.", icon: "paused", youCan: "Improve how well the agency runs. A partly independent one slow-walks whatever you do." },
            { label: "Refused", detail: "Nobody there had the legal power to do it. A written refusal names the law and who signed it, and it stays on the record for good. The refusal makes the agency look steered by politics, which invites an audit.", icon: "reject", exit: "Asking again doesn't erase the first refusal. A second refusal at the same agency opens an inspector general's audit.", youCan: "Don't repeat an instruction an agency has refused." },
        ],
        examples: [{
                title: "The same instruction, three answers",
                kind: "illustration",
                lines: [
                    "Tell the Environmental Protection Agency to enforce more strictly, and it does, because it answers to you and is running well.",
                    "Tell the Internal Revenue Service (the IRS) to audit a named person, and you get a written refusal. Federal law bars a President from asking the IRS to start or stop an audit of a particular taxpayer.",
                    "Tell the Federal Reserve to change interest rates, and you get a written refusal too, because it sets interest rates independently of the President.",
                    "Ask the IRS a second time, and the second refusal opens an inspector general's audit of whether the White House has been steering its casework.",
                ],
            }],
        youCan: [
            "Direct agencies under your control on how strictly they enforce and how fast they impose sanctions.",
            "Read an agency's refusals in the Directives tab on the Oversight page before you ask it again.",
            "Keep the agencies you rely on well run, so they carry your orders instead of slow-walking them.",
        ],
        next: ["inquiry-stages"],
        terms: ["obstruction", "inspector-general", "executive-branch"],
    },
    // docs/CONTENT_DOCTRINE.md on what a player sees before committing: exact
    // spend and readiness, the assessment bands with the room's confidence, the
    // odds on an operational response, and borrowing before the choice; the human
    // toll, displacement and mood effects wait for the Record. Drawn by
    // decision/DecisionOutlook.tsx (ResponseSignals, PositionOutlook).
    {
        id: "decision-cost-and-impact",
        title: "What a decision shows you, and when",
        summary: "Before you choose a response, you see exactly what it spends and an estimate of what it will do. The full consequences show up in the Record afterward. Your advisers' estimate is their best guess, and it isn't a promise.",
        steps: [
            { label: "What it spends", detail: "You see exact figures for money and military readiness, plus any first-year borrowing, before you choose.", icon: "budget", term: "budget-authority", youCan: "Compare what each response spends before you pick one." },
            { label: "What it should do", detail: "Effects on stability, international standing, and approval are rated slight, moderate, or major, along with how confident your advisers are. A military or operational response also shows its odds in a word, like Likely.", icon: "intel", youCan: "Weigh the rating against how confident your advisers are." },
            { label: "What it did", detail: "Lives lost, people displaced, and what a large cost did to the national debt and the public mood aren't shown in advance. The Record shows them with exact figures.", icon: "record", exit: "Read each response's description carefully before you choose.", youCan: "Open the Record afterward to see what it did." },
        ],
        examples: [{
                title: "Choosing a response",
                kind: "illustration",
                lines: [
                    "A response card shows what it spends, say a set amount of money and some military readiness, before you choose.",
                    "It also shows a moderate effect on stability, with your advisers fairly confident, and its odds in a word, like Likely.",
                    "After you choose, the Record lists the lives lost, the people displaced, and what the response did to the debt, with exact figures.",
                ],
            }],
        youCan: [
            "Read each response's cost and outlook before you choose.",
            "Treat the estimate as a best guess, and not as a promise.",
            "Check the Record afterward and let it shape the next choice.",
        ],
        next: ["what-moves-approval"],
        terms: ["budget-authority", "approval-rating", "standing-abroad"],
    },
];
