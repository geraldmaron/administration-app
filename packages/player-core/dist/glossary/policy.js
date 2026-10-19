// The money, the orders and the economy.
//
// Real-world definitions were checked against: CRS, "A Brief Introduction to
// the Federal Budget Process" (everycrsreport.com/reports/96-912.html); GAO on
// the Antideficiency Act; the Treasury's Fiscal Data guide to the national
// debt (fiscaldata.treasury.gov/americas-finance-guide/national-debt); CRS,
// "Executive Orders: An Introduction" (everycrsreport.com/reports/R46738.html);
// Youngstown Sheet & Tube Co. v. Sawyer, 343 U.S. 579 (law.cornell.edu); and
// the Federal Reserve's own pages (federalreserve.gov) for the mandate, the
// Board's terms and the meeting calendar.
export const POLICY_GLOSSARY = [
    // engine institution-catalog.ts INST-TREASURY (authorities: debt-management,
    // sanctions, tax-administration); debt-limit.ts (the Treasury's extraordinary
    // measures and its X-date); fiscal.ts bookUsWeek (a deficit is borrowed into
    // the debt).
    {
        id: "treasury",
        term: "The Treasury",
        definition: "The federal department that collects taxes, pays the government's bills and borrows money when the government spends more than it takes in. The Secretary of the Treasury, a member of the President's cabinet, runs it.",
        example: "When the government spends more than it collects, the Treasury sells bonds, which are loans from investors, to cover the gap.",
        inGame: "The Treasury is one of your departments, and it has its own secretary. It borrows to cover each year's deficit. If the debt limit is reached, it takes emergency steps to keep paying the bills until Congress acts.",
        icon: "departmentTreasury",
        related: ["debt-limit", "deficit", "omb", "federal-reserve"],
    },
    // engine funding.ts APPORTIONING_INSTITUTION (INST-OMB), OMB_APPORTIONMENT_WEIGHT
    // (half of a domestic increase is lost at an OMB delivering nothing) and
    // apportionmentShare; fiscal.ts apportionmentPhase releases the money weekly.
    {
        id: "omb",
        term: "Office of Management and Budget (OMB)",
        definition: "A White House office that helps the President write the budget request. It also controls how fast agencies get the money Congress approves. The President picks its director, and the Senate confirms the choice.",
        example: "Congress approves a set amount for an agency's year. OMB releases it a portion at a time, so the agency can't spend the whole amount in the first month.",
        inGame: "OMB releases the money you can spend a little each week. If OMB runs badly, you lose part of any increase Congress gives the Domestic policy account, up to half of it. A good OMB can't soften a cut, so a cut stays a cut.",
        icon: "departmentBudget",
        related: ["budget-authority", "appropriation"],
    },
    // engine monetary.ts (eight decisions a year, FED_WEIGHT, FED_PRESSURE_TILT);
    // monetary-acts.ts leanOnTheFed is the one lever the President has.
    {
        id: "federal-reserve",
        term: "The Federal Reserve",
        definition: "The country's central bank, often called the Fed. It sets the short-term interest rate that other rates follow. The President appoints its leaders with the Senate's approval, but the Fed is independent, so the President can't give it orders.",
        example: "When prices rise too fast, the Fed raises its rate. Car loans and mortgages cost more, people borrow and spend less, and price rises slow down.",
        inGame: "The Fed sets the rate at eight meetings a year, based on inflation and unemployment. You can't set it yourself. What you can do is pressure the Fed in public before a meeting.",
        icon: "departmentCentralBank",
        related: ["policy-rate", "treasury"],
    },
    // engine clock.ts FISCAL_YEAR_START_MONTH/DAY, fiscalYearOf, appropriationsDeadline.
    {
        id: "fiscal-year",
        term: "Fiscal year",
        definition: "The government's budget year. It runs from October 1 to September 30 and takes the name of the year it ends in, so fiscal year 2030 starts on October 1, 2029.",
        example: "Money for fiscal year 2030 has to be approved by September 30, 2029, the day before the year starts.",
        inGame: "The game follows the real calendar. A budget Congress passes pays for agencies through September 30 of its fiscal year. A stopgap covers only 6 weeks.",
        icon: "schedule",
        related: ["appropriation", "continuing-resolution"],
    },
    // engine appropriation.ts: requestAppropriation votes each changed account
    // alone; floorThreshold(..., "ordinary") is a House majority and sixty in the
    // Senate. The game keeps one book of five accounts, not twelve bills. When no
    // account carries, onPriorYear goes true and the old appropriation stays.
    {
        id: "appropriation",
        term: "Appropriation",
        definition: "A law that gives an agency the legal authority to spend money. Without one, the agency can't spend. Congress normally writes twelve regular appropriations bills a year, one for each area of government, such as defense or transportation.",
        example: "A law gives the Transportation Department a set amount for the year to repair bridges. The department may spend up to that amount and no more.",
        inGame: "The game uses five spending accounts instead of twelve bills. When you send a budget, Congress votes on each account you changed, one at a time. Each needs a House majority and 60 senators (60 is the number it takes to end a Senate debate). An account Congress rejects stays at last year's level. If Congress passes none of them, the government keeps running on the old appropriation until it runs out.",
        icon: "budget",
        related: ["continuing-resolution", "budget-authority", "shutdown", "fiscal-year"],
    },
    // engine legislative-acts-fiscal.ts: CONTINUING_RESOLUTION_TURNS buys six
    // weeks; STOPGAP_LEAD_TURNS is the two-week window the floor will take it up
    // in; track "ordinary" so the Senate needs sixty; urgent, so it goes to the
    // President's Desk once it would carry (legislation.ts).
    {
        id: "continuing-resolution",
        term: "Continuing resolution",
        definition: "A stopgap law that keeps agencies funded at last year's level while Congress finishes the regular spending bills. It is meant to be short, but it can be written to run for the whole year.",
        example: "September 30 arrives and the new spending bills aren't finished. Congress passes a stopgap that keeps every agency open at last year's spending for a few more weeks.",
        inGame: "A continuing resolution buys 6 more weeks and decides nothing new. Congress takes one up only when the money is within 2 weeks of running out, or already has, and only if it has the votes, which means a House majority and 60 senators. It lands on your Desk, and you sign or veto it. A veto risks a shutdown.",
        icon: "sign",
        related: ["appropriation", "shutdown", "fiscal-year"],
    },
    // engine funding.ts: SHUTDOWN_GRACE_TURNS is two weeks past the date;
    // shutdown.ts: LAPSE_STABILITY_COST (0.04) is ten times the 0.004 a week on
    // the prior year's budget costs (congress.ts), and is charged on top of it, so a
    // closed week costs 0.044, eleven times that; funding.ts obligationAvailability
    // refuses non-excepted acts while closed; fiscal.ts apportionmentPhase releases
    // nothing during a lapse; LAPSE_BUDGET_DROP lowers agencies' budgets weekly.
    {
        id: "shutdown",
        term: "Shutdown",
        definition: "What happens when the money runs out and Congress hasn't passed a new spending law or a stopgap. Agencies can't spend money Congress hasn't approved, so they stop all work except what protects life and property.",
        example: "Federal workers whose jobs don't protect safety are sent home. Air traffic controllers and soldiers keep working.",
        inGame: "When the money runs out, you get 2 weeks of grace. After that the government closes, and every week closed costs you stability (how steady the country is), about 11 times what a week on last year's budget costs. Agencies deliver less the longer it lasts. A stopgap or a new budget reopens the government the same week. While it is closed, no new money is released to you, and you can't sign anything that spends money, except work that protects life or property.",
        icon: "caution",
        related: ["continuing-resolution", "appropriation"],
    },
    // engine funding.ts openingBudgetAuthority and AUTHORITY_CARRY_SHARE (a
    // quarter of a year's discretionary money, the most held at once);
    // obligationAvailability refuses an act that obligates more than is held;
    // fiscal.ts apportionmentPhase releases it weekly and nothing during a
    // shutdown; budget.ts charges an account built above its sustainment line to
    // it. The Budget page's "What your plan does" panel draws it.
    {
        id: "budget-authority",
        term: "Budget authority",
        definition: "The legal permission to commit federal money. Congress grants it with an appropriation. The Office of Management and Budget (the White House office that runs the budget) then hands it to agencies a portion at a time.",
        example: "Congress sets the year's total. OMB releases it to an agency a bit at a time instead of all at once, like a weekly allowance.",
        inGame: "Your budget authority is the money you have to spend on acts and orders. You can see it in the \"What your plan does\" panel on the Budget. Each week the budget Congress enacted releases a little more, up to a quarter of a year's discretionary money at once. You can't commit more than you have, and building up your five budget accounts draws on it too. Nothing is released while the government is shut down.",
        icon: "domesticLedger",
        related: ["appropriation", "discretionary-spending", "omb"],
    },
    // engine funding.ts DISCRETIONARY_BASE: the line the administration's own
    // decisions are written inside; pensions and interest are owed rather than
    // decided. budget.ts: the accounts buy capability and only their change
    // reaches the treasury (budget authority); fiscal.ts statementFor never
    // reads them, so they do not move the deficit or debt.
    {
        id: "discretionary-spending",
        term: "Discretionary spending",
        definition: "Spending that Congress decides each year through appropriations bills. Defense, foreign aid and most of what agencies do day to day are examples.",
        example: "Congress votes every year on the Pentagon's budget and on the money for national parks, so both are discretionary.",
        inGame: "The five accounts you set on the Budget are discretionary. They decide how strong the foreign service, the intelligence services, the military and the rest are, and they draw on your budget authority. They don't change the federal deficit or debt. Entitlement programs and interest on the debt show up in the national accounts as money already owed, and no budget account sets them.",
        icon: "budget",
        related: ["mandatory-spending", "appropriation"],
    },
    // engine national-books.ts usOutlays: entitlements are ENTITLEMENT_BASE of
    // potential output plus the program and laws' transfer shift (programShift),
    // plus AGING_PER_YEAR a year, plus benefits for the jobless (usForcedOutlays).
    {
        id: "mandatory-spending",
        term: "Mandatory spending",
        definition: "Spending set by standing law instead of yearly votes. Most of it is entitlement programs, which pay everyone who qualifies. The largest are Social Security (retirement checks), Medicare (health care for older Americans) and Medicaid (health care for low-income Americans). It continues unless Congress changes the law.",
        example: "Congress doesn't vote each year on whether to pay a grandmother's Social Security check. The law already says that anyone who qualifies gets one.",
        inGame: "The national accounts show these programs as one block, mostly pensions and health programs. You don't set them as a budget account. They grow as the country ages, and they rise when more people lose their jobs. Beyond that, only your standing fiscal policy and the laws you sign change them.",
        icon: "domesticLedger",
        related: ["discretionary-spending", "deficit"],
    },
    // player-core economy/fiscal-books.ts: the balance is revenue less outlays
    // for the year as the national books state it; economy/fiscal-drivers.ts
    // DEFICIT_SOURCE_LABELS lists what moves it (the inherited budget, the cycle,
    // standing policy, laws, orders, wars and unrest, interest, held-back payments).
    {
        id: "deficit",
        term: "Deficit",
        definition: "The shortfall in one fiscal year, when spending is higher than revenue. The Treasury borrows to cover it, and each year's deficit adds to the debt.",
        example: "If the government collects $100 in taxes in a year and spends $120, the deficit is $20, and the Treasury borrows it.",
        inGame: "The Budget shows this year's balance, and a negative figure is a deficit. Your standing fiscal policy, the laws you sign, your orders, wars, interest on the debt and the state of the economy all move it. The five budget accounts you set don't.",
        icon: "economyRecession",
        related: ["debt-held-by-public", "debt-to-output", "treasury"],
    },
    // player-core economy/fiscal-books.ts: debtToGdp is debt held by the public
    // over output; fiscalPath projects it ten years out. engine debt-limit.ts
    // INTRAGOVERNMENTAL_SHARE keeps trust-fund debt apart, and the limit counts both.
    {
        id: "debt-held-by-public",
        term: "Debt held by the public",
        definition: "What the government owes to outside investors, banks, foreign governments and the Federal Reserve. The rest of the national debt is owed to other government accounts, mostly the Social Security and Medicare trust funds.",
        example: "If a retirement fund buys a Treasury bond, the government owes that fund, and the bond counts here. Bonds held by the Social Security trust fund don't.",
        inGame: "The debt on the Budget is this measure. It leaves out what the trust funds hold. The debt limit counts both.",
        icon: "folder",
        related: ["debt-to-output", "deficit", "debt-limit"],
    },
    {
        id: "debt-to-output",
        term: "Debt vs. size of economy",
        definition: "Debt held by the public as a share of a year's national output (GDP, the value of everything the country produces in a year). Economists use the share because the same debt is easier to carry in a bigger economy.",
        example: "A family with $50,000 of debt is fine if it earns $200,000 a year and in trouble if it earns $30,000. A country works the same way.",
        inGame: "You'll find it at the top of the Budget and the Economy, and the Budget projects it 10 years ahead. It rises when deficits grow faster than the economy.",
        icon: "graph",
        related: ["debt-held-by-public", "credit-rating"],
    },
    // engine debt-limit.ts: the limit counts debt held by the public and trust
    // fund holdings; MEASURES_WEEKS (26) is half a year of the deficit; past the
    // X-date the Treasury pays interest first and withholds the rest, at
    // LAPSE_OF_PAYMENT_STABILITY (0.04) a week. legislative-acts-fiscal.ts
    // debtLimitIncrease can use reconciliation after an instruction; debtLimitDeal
    // remains ordinary because it couples a debt-limit lift to discretionary caps.
    // Cost is
    // standing, arise when headroomWeeks is 13 or fewer, urgent.
    {
        id: "debt-limit",
        term: "Debt limit",
        definition: "A ceiling Congress sets on how much the Treasury (the department that pays the government's bills) may borrow in total. Raising it doesn't approve new spending. It lets the Treasury borrow to pay for what Congress has already committed.",
        example: "It's like raising the limit on a credit card so you can pay bills you've already run up. It buys nothing new.",
        inGame: "The Budget counts the weeks of borrowing room left. Congress offers a raise when 13 weeks or fewer are left. A clean raise can go through budget reconciliation, which needs only a majority, but it costs you standing. A raise bundled with spending caps faces the ordinary 60-vote bar in the Senate. Once the limit is reached, the Treasury uses extraordinary measures (accounting steps that free up room to borrow) for about half a year. After that it pays the interest first and holds back everything else it can't cover. Each week of that costs you stability until Congress raises the limit.",
        icon: "locked",
        related: ["reconciliation", "deficit", "credit-rating", "treasury"],
    },
    // engine sovereign.ts: LETTER_SCORE on the agencies' twenty-one-notch scale;
    // REVIEW_WEEKS (26) is how often each government is reviewed; fundamentalScore
    // takes a notch for debt-limit.ts governanceNotch (BRINK_WEEKS 4,
    // GOVERNANCE_MEMORY_WEEKS 104) and weighs interest burden and the projected ratio.
    {
        id: "credit-rating",
        term: "Credit rating",
        definition: "A letter grade, from AAA at the top down to D for default, that rating agencies give for how likely a government is to repay what it borrows. A lower grade means lenders charge more interest.",
        example: "A person with a poor credit score pays a higher rate on a mortgage. In the same way, a government with a lower grade pays a higher rate on its debt.",
        inGame: "The letter grade and its outlook sit beside the debt figures, and the agencies review it twice a year. Heavy interest costs and a rising debt pull it down. So does raising the debt limit within 4 weeks of the Treasury running out of room, or after, and that mark lasts 2 years.",
        icon: "graph",
        related: ["debt-limit", "debt-to-output"],
    },
    // engine orders.ts: authority, needsCongress (price controls) and viaRulemaking;
    // legislation.ts constitutionalGround is the Jackson test's three grounds.
    {
        id: "executive-order",
        term: "Executive order",
        definition: "A written directive from the President to the government. It has the force of law only when it rests on a power the Constitution gives the President or one Congress has delegated. Congress can override one issued under delegated power by passing a law. Courts can strike down one that goes past its authority.",
        example: "A President can order the Treasury to freeze a hostile government's bank accounts in the United States, because a law already gives that power. A President can't order a new tax, because only Congress can create one.",
        inGame: "Every order names the law behind it before you sign. An order that needs a power Congress hasn't granted stays locked until Congress passes a law granting it. Freezing prices and wages is one of these, because no standing law lets a President do it.",
        icon: "order",
        related: ["rulemaking", "judicial-review", "struck-down"],
    },
    // engine orders.ts RULEMAKING_TURNS equals JUDICIAL_REVIEW_TURNS (six weeks);
    // rulemaking.ts disapprovals (Congress can undo a final rule by law).
    {
        id: "rulemaking",
        term: "Rulemaking",
        definition: "The way a federal agency turns a directive into a binding rule. It publishes a draft, takes comments from the public, and then issues a final rule. An order that tells an agency to write a rule changes nothing until that rule is final.",
        example: "An order to tighten border checks tells the department in charge to write the rules. The new checks begin only once those rules are final.",
        inGame: "Orders marked rulemaking take effect 6 weeks after you sign. \"Tighten border controls\" is one of them. \"Block a hostile government's assets\" works the day you sign it.",
        icon: "folder",
        related: ["executive-order", "judicial-review"],
    },
    // engine policy.ts executionQuality: CARETAKER_QUALITY (the QUALITY_FLOOR, 0.6)
    // plus QUALITY_RANGE (0.8) times the chair's competence, so 60% at zero
    // competence or an empty chair, 100% at the middle, 140% at the top;
    // movementToDeltas scales only positive effects. apps/web policy/domain-marks.ts
    // deliveryFraction draws the competence itself as the percentage on the board.
    {
        id: "policy-delivery",
        term: "Delivery",
        definition: "How much of a policy's intended effect the department running it actually produces. That depends on who leads the department and how well they run it.",
        example: "Two Presidents set the same defense policy. The one with a skilled Defense Secretary gets more out of it than the one with a weak secretary.",
        inGame: "The percentage beside each policy is the competence of the cabinet secretary in charge of it. At 50% you get the policy as designed. At 0%, or with an empty seat, you get 60% of its gains. At 100% you get 140%. Delivery changes only what a policy gains you, and its costs stay the same.",
        icon: "approve",
        related: ["budget-authority", "executive-order"],
    },
    // engine monetary.ts: eight FOMC decisions a year, FED_WEIGHT on the
    // inflation and employment gaps, leanOnFed bounded by FED_PRESSURE_TILT with
    // FED_CREDIBILITY_PREMIUM (25 basis points). monetary-acts.ts projectFedLean
    // is the one lever and answers once before a meeting.
    {
        id: "policy-rate",
        term: "Federal funds rate",
        definition: "The interest rate the Federal Reserve aims for. Its Open Market Committee sets it at eight scheduled meetings a year, working toward maximum employment and stable prices. The President appoints the Board's governors to staggered fourteen-year terms but can't set the rate.",
        example: "When unemployment is high and prices are steady, the Fed can lower the rate. Loans get cheaper, and businesses borrow to expand and hire.",
        inGame: "The rate changes only at a Fed meeting, in response to inflation and unemployment. Once before each meeting you can pressure the Fed in public. That shifts its priorities a little, but it costs you standing. It also adds a quarter of a percentage point to the rate, because markets trust the Fed less.",
        icon: "departmentCentralBank",
        related: ["federal-reserve", "debt-to-output"],
    },
];
export const POLICY_EXPLAINERS = [
    // engine appropriation.ts (requestAppropriation, projectAppropriation,
    // ACCOUNT_APPEAL, RAISE_RESISTANCE: only a raise is harder to pass);
    // congress.ts fundingContinuityDue and floorThreshold (House majority 218 of
    // 435, Senate cloture 60 of 100); legislative-acts-fiscal.ts
    // CONTINUING_RESOLUTION_TURNS; funding.ts SHUTDOWN_GRACE_TURNS;
    // shutdown.ts LAPSE_STABILITY_COST (0.04) and congress.ts's 0.004 a week on the
    // prior year's numbers, charged together while closed (0.044, eleven times the
    // friction of governing without a budget); clock.ts selectBudgetYear (a book passed while the year is
    // already funded pays for the next one).
    {
        id: "budget-process",
        title: "How the money gets passed",
        summary: "The President proposes a budget, but only Congress decides what the government spends. In the game you can draft a budget and send it to Congress, and you sign or veto the stopgaps it sends back. If the money runs out and nothing has passed, the government closes.",
        cast: [
            { label: "You, the President", role: "Drafts the budget request and signs or vetoes stopgap bills.", icon: "sign" },
            { label: "The budget office", role: "Helps write your request, then releases the money to agencies a portion at a time.", icon: "departmentBudget", term: "omb" },
            { label: "The House", role: "435 members. Each spending account needs a majority, 218.", icon: "subjectChamber", term: "house" },
            { label: "The Senate", role: "100 senators. Each account needs 60, the number that can end a debate.", icon: "subjectChamber", term: "senate" },
            { label: "The agencies", role: "The departments that spend the money. By law they can't spend any that Congress hasn't approved.", icon: "building" },
        ],
        steps: [
            {
                label: "Your request",
                detail: "The President sends Congress a budget request each year. In the game you draft yours on the Budget, and nothing goes to Congress until you press Send.",
                icon: "budget",
                youCan: "Change the five accounts on the Budget and see how Congress would vote before you send.",
            },
            {
                label: "Budget resolution",
                detail: "Congress adopts an overall plan. It isn't a law, and the President doesn't sign it. The game skips this step.",
                icon: "review",
                exit: "Not in the game.",
            },
            {
                label: "Appropriations",
                detail: "Twelve regular bills fund the fiscal year that starts October 1. In the game, Congress votes on each account you changed, one at a time. Each needs a House majority and 60 senators.",
                term: "appropriation",
                icon: "subjectChamber",
                duration: "The vote happens the week you send it",
                exit: "An account Congress rejects stays at last year's level.",
                youCan: "Send the budget. Once the vote is held, it can't be undone.",
            },
            {
                label: "Stopgap",
                detail: "If the bills aren't done, a continuing resolution keeps agencies open. In the game, Congress takes it up only in the last 2 weeks before the money runs out, and only if it has the votes.",
                term: "continuing-resolution",
                icon: "sign",
                duration: "Buys 6 weeks",
                youCan: "Sign the stopgap when it reaches your Desk, or veto it and risk a shutdown.",
            },
            {
                label: "Lapse",
                detail: "With no funding law and no stopgap, agencies stop non-essential work. In the game, the shutdown starts after 2 weeks of grace and costs you stability every week.",
                term: "shutdown",
                icon: "caution",
                duration: "Closes 2 weeks after the money runs out",
                exit: "A stopgap or a new budget reopens it the same week.",
            },
        ],
        thresholds: [
            { label: "House: pass a spending account", needed: 218, of: 435, note: "A simple majority of the House, counted for each account you changed." },
            { label: "Senate: pass a spending account", needed: 60, of: 100, note: "Spending bills need 60 senators, because fewer can't end a debate that the other side keeps going." },
        ],
        links: [
            { from: "A week closed", to: "Stability", how: "Each week closed costs about 11 times the stability that a week on last year's budget costs.", direction: "lowers", weight: "strong", outcome: "hurts" },
            { from: "No budget passed", to: "Stability", how: "Running on last year's budget costs a little stability every week until a budget passes.", direction: "lowers", weight: "weak", outcome: "hurts" },
            { from: "A stopgap", to: "Weeks of money left", how: "Each continuing resolution buys 6 more weeks.", direction: "raises", weight: "moderate", outcome: "helps" },
            { from: "Asking for a raise", to: "Chance an account passes", how: "Congress doesn't need persuading to spend less, so only a raise is harder to pass, and a bigger raise is harder.", direction: "lowers", weight: "moderate" },
        ],
        examples: [
            {
                title: "A budget that runs late",
                kind: "illustration",
                lines: [
                    "In April the government has money through September 30. You raise Defense establishment and Domestic policy on the Budget and press Send.",
                    "That same week, Congress votes on each account. Defense gets a House majority and 63 senators, so it passes. Domestic policy gets only 56 senators, short of 60, so it fails and stays at last year's level.",
                    "Because one account passed, the government is funded through the end of the next fiscal year. A budget passed in spring pays for the year that opens in October.",
                    "If nothing had passed, you would have kept last year's money and lost a little stability each week. With 2 weeks of money left, Congress would have offered a stopgap, and you could sign it for 6 more weeks.",
                ],
            },
            {
                title: "A historical case",
                kind: "history",
                lines: [
                    "On October 1, 2025, appropriations lapsed and the government closed.",
                    "It reopened on November 12, 43 days later, when a continuing resolution funding agencies at the prior year's levels through January 30 became law.",
                ],
            },
        ],
        youCan: [
            "Draft changes on the Budget and read how Congress would vote on each account before you send.",
            "Ask only for what you need. Raises are harder to pass than cuts.",
            "Keep Congress's goodwill up. A budget vote depends on how Congress feels about you.",
            "Sign the stopgap when the money is about to run out.",
        ],
        next: ["deficit-and-debt", "bill-to-law"],
        terms: ["appropriation", "continuing-resolution", "reconciliation", "shutdown", "budget-authority", "fiscal-year", "omb", "filibuster"],
    },
    // player-core economy/fiscal-books.ts (balance, debtToGdp, interestShare,
    // sovereign, limit); engine debt-limit.ts (MEASURES_WEEKS, BRINK_WEEKS,
    // GOVERNANCE_MEMORY_WEEKS, LAPSE_OF_PAYMENT_STABILITY, governanceNotch) and
    // funding.ts DISCRETIONARY_BASE; sovereign.ts BURDEN_PER_NOTCH (0.12) and
    // PROJECTION_PER_NOTCH (0.6); legislative-acts-fiscal.ts (the tax and debt limit
    // acts need a matching budget instruction for the majority track).
    {
        id: "deficit-and-debt",
        title: "Deficit, debt and the limit",
        summary: "A deficit is one year's gap between what the government spends and what it takes in. The debt is every past deficit added up, and the debt limit is a separate cap on how much the Treasury may borrow. You can move the deficit with tax laws and standing fiscal policy, and you'll want Congress to raise the limit in time.",
        cast: [
            { label: "You, the President", role: "Sets standing fiscal policy and signs tax laws and debt limit bills.", icon: "sign" },
            { label: "Congress", role: "Passes tax laws and decides whether to raise the debt limit.", icon: "subjectCapitol", term: "congress" },
            { label: "The Treasury", role: "Borrows to cover each deficit and pays the government's bills.", icon: "departmentTreasury", term: "treasury" },
            { label: "Rating agencies", role: "Private firms that grade how safe it is to lend to the government. A lower grade makes borrowing cost more.", icon: "graph", term: "credit-rating" },
        ],
        steps: [
            {
                label: "Spending",
                detail: "Mandatory programs, such as Social Security and Medicare, run on permanent law. Discretionary programs are funded each year. In the game, your five budget accounts set your spending money and the strength of each part of government, and they don't move the deficit.",
                term: "discretionary-spending",
                icon: "budget",
            },
            {
                label: "Revenue",
                detail: "Taxes and fees. In the game, tax bills go through budget reconciliation, a special process that needs only a majority of senators (51). In real life that is true of some big tax bills, but many others have needed 60 votes.",
                term: "reconciliation",
                icon: "graph",
                youCan: "Sign tax laws, or adjust standing fiscal policy.",
            },
            {
                label: "Deficit",
                detail: "Spending above revenue for the year. The Treasury covers it by borrowing.",
                term: "deficit",
                icon: "caution",
            },
            {
                label: "Debt",
                detail: "Each year's deficit adds to the debt. The Budget shows the debt as a share of the economy and projects it 10 years ahead.",
                term: "debt-to-output",
                icon: "folder",
            },
            {
                label: "The limit",
                detail: "When borrowing reaches the cap Congress set, the Treasury has no room to borrow more. In the game, Congress offers a raise when 13 weeks or fewer of room are left, and a clean raise needs only a simple majority.",
                term: "debt-limit",
                icon: "locked",
                youCan: "Sign the debt limit bill when it reaches your Desk.",
                exit: "Raising it within 4 weeks of running out, or after, counts against the credit rating for 2 years.",
            },
            {
                label: "Emergency measures",
                detail: "Once the cap is hit, the Treasury uses accounting steps that free up room to borrow, so payments go on as normal.",
                icon: "pending",
                duration: "About 26 weeks, half a year of borrowing",
            },
            {
                label: "Out of room",
                detail: "When the emergency steps run out, the Treasury pays the interest on the debt first and holds back everything else it can't cover that week. Each week of held-back payments costs you stability.",
                icon: "adverse",
                exit: "Raising the limit ends it, and the Treasury pays what it held back.",
            },
        ],
        thresholds: [
            { label: "House: raise the debt limit", needed: 218, of: 435, note: "A simple majority of the House." },
            { label: "Senate: raise the debt limit", needed: 51, of: 100, note: "In the game, a clean debt limit raise can go through reconciliation, so a bare majority of senators is enough. A raise bundled with spending caps faces the ordinary 60-vote bar. In real life, most debt limit raises have needed 60 votes." },
        ],
        links: [
            { from: "Each year's deficit", to: "The debt", how: "The deficit is borrowed, so it is added to the debt.", direction: "raises", weight: "strong", outcome: "hurts" },
            { from: "Raising the limit at the last minute", to: "Credit rating", how: "A raise within 4 weeks of running out of room, or after, takes a full notch off the rating for 2 years.", direction: "lowers", weight: "strong", outcome: "hurts" },
            { from: "Interest on the debt", to: "Credit rating", how: "Every extra 12 percent of tax revenue that goes to interest, after inflation, costs about a notch.", direction: "lowers", weight: "moderate", outcome: "hurts" },
            { from: "A week of held-back payments", to: "Stability", how: "Each week the Treasury can't pay its bills costs the same stability as a shutdown week.", direction: "lowers", weight: "strong", outcome: "hurts" },
        ],
        examples: [
            {
                title: "A year of borrowing",
                kind: "illustration",
                lines: [
                    "Over one year the government collects $100 in taxes and spends $120. The deficit is $20.",
                    "The Treasury borrows the $20 by selling bonds, which are loans from investors. The debt grows by $20.",
                    "Years later the debt reaches the limit Congress set. The Treasury takes emergency steps, and Congress has about half a year to raise the limit.",
                    "If Congress doesn't act, the Treasury pays the interest and holds back other payments, and every week of that costs you stability.",
                ],
            },
            {
                title: "A historical case",
                kind: "history",
                lines: [
                    "In the summer of 2011, Congress and the White House argued over raising the debt limit until the final days.",
                    "Congress passed a raise on August 2, with 74 votes in the Senate, not a bare majority. On August 5 the rating agency Standard & Poor's lowered the U.S. credit rating from AAA to AA+ for the first time, citing, among other things, the political fight over the limit.",
                ],
            },
        ],
        youCan: [
            "Watch the weeks of borrowing room left on the Budget.",
            "Sign a debt limit bill when Congress sends one to your Desk. It costs you some standing, and waiting until the last moment also costs you rating.",
            "Move the deficit with tax laws and standing fiscal policy.",
            "Read the national accounts to see what is driving the deficit.",
        ],
        next: ["budget-process", "economy-levers"],
        terms: ["deficit", "debt-held-by-public", "debt-to-output", "debt-limit", "credit-rating", "mandatory-spending", "discretionary-spending", "treasury"],
    },
    // engine orders.ts (projectOrder, signOrder, JUDICIAL_REVIEW_TURNS,
    // RULEMAKING_TURNS, the catalogue's authority and needsCongress); strike-odds.ts
    // (groundFactor AUTHORIZED_RELIEF 0.45, OVERREACH_STEP 0.12 for every order ever
    // contested and never decaying, MINISTER_SWAY 0.25, STRIKE_MAX 0.9); the link
    // weights follow the same rule as court-challenge in government.ts (strong is
    // 0.3 or more of the thing it moves, moderate 0.1 to 0.3, weak under 0.1), so
    // the same mechanism carries the same weight in both; judicial-review.ts STRUCK_DOWN_COST; rulemaking.ts
    // disapprovals (Congress undoes a final rule by law and the order can't be
    // issued again).
    {
        id: "order-vs-law",
        title: "What an order can do that a law can't, and the reverse",
        summary: "An executive order is a written directive from the President to the government. It is faster than a law because Congress doesn't vote on it. It is also narrower and easier to undo, because it needs a legal power behind it and Congress or the courts can reverse it. You can sign any order you have the authority for. Check its cost and its odds of being challenged first.",
        cast: [
            { label: "You, the President", role: "Signs the order. No vote is needed.", icon: "sign" },
            { label: "The department secretary", role: "A cabinet member who runs the department that carries the order out. A capable, loyal one defends the order better.", icon: "appoint" },
            { label: "Congress", role: "Can pass a law that blocks an order or undoes a final rule. You can veto that law.", icon: "subjectCapitol", term: "congress" },
            { label: "The courts", role: "Decide whether a challenged order goes past the President's powers.", icon: "court", term: "judicial-review" },
        ],
        steps: [
            {
                label: "Authority",
                detail: "An order must rest on the Constitution or on a power Congress gave the President. Each order names its law, and one that needs a new law stays locked.",
                term: "executive-order",
                icon: "law",
                exit: "An order that needs a law Congress hasn't passed stays locked.",
            },
            {
                label: "Signature",
                detail: "Before you sign, you can see the cost and the chance of a court challenge.",
                icon: "sign",
                youCan: "Read the law behind the order and its challenge odds, then sign it or leave it.",
            },
            {
                label: "Takes effect",
                detail: "An order that needs an agency rule takes effect in 6 weeks. One that acts directly takes effect the day you sign.",
                term: "rulemaking",
                icon: "order",
                duration: "At once, or 6 weeks if it needs a rule",
                exit: "Once a rule is final, Congress can undo it by passing a law. You can veto that law, and it takes two thirds of both chambers to override you. An order that has been undone can't be issued again.",
            },
            {
                label: "Challenge",
                detail: "A court challenge moves through several stages. They are a first look at whether the case can go forward, temporary relief, a ruling in a lower court and a possible appeal. The case file shows the current stage.",
                term: "judicial-review",
                icon: "gavel",
                duration: "Depends on the case",
                exit: "The court's remedy decides which effects stop or are removed. Money already spent and harm already done stay on the record.",
            },
        ],
        links: [
            { from: "How far it stretches your powers", to: "Chance of a challenge", how: "The further an order goes beyond what a President can do alone, the likelier it is to be challenged.", direction: "raises", weight: "strong", outcome: "hurts" },
            { from: "A law behind it", to: "Chance of a challenge", how: "If Congress passed a law asking for the order, the stretch counted against it is cut by close to half.", direction: "lowers", weight: "strong", outcome: "helps" },
            { from: "Each past challenge", to: "Every later order's odds", how: "Every challenged order adds 12 points to the odds on all later orders, and it never wears off. Spacing orders out doesn't help.", direction: "raises", weight: "moderate", outcome: "hurts" },
            { from: "The secretary's skill", to: "Chance of a challenge", how: "A capable, loyal secretary defends the order better and can change the odds by up to a quarter.", direction: "lowers", weight: "moderate", outcome: "helps" },
        ],
        examples: [
            {
                title: "Two orders compared",
                kind: "illustration",
                lines: [
                    "Say you want to tighten border controls. The order rests on an immigration law Congress already passed, so it isn't locked, and you can sign it.",
                    "It tells the department in charge to write the rules, so nothing changes yet. Six weeks later the rule is final and the new checks begin.",
                    "If someone challenges it, temporary relief and later rulings can change how it is carried out, and an appeal may be denied. Read the final remedy before you rely on that authority again.",
                    "Freezing prices and wages works differently. No standing law gives a President that power, so the order stays locked until Congress passes one.",
                ],
            },
            {
                title: "A historical case",
                kind: "history",
                lines: [
                    "In April 1952 President Truman ordered the Secretary of Commerce to seize the nation's steel mills to prevent a strike.",
                    "On June 2, 1952 the Supreme Court held 6 to 3 that the seizure was unconstitutional, because neither the Constitution nor an act of Congress gave the President that power.",
                ],
            },
        ],
        youCan: [
            "Open the Executive orders view, read the law behind each order, and sign the ones you have the authority for.",
            "Appoint a capable, loyal secretary before a risky order, which lowers the odds of a challenge.",
            "Ask Congress for a law when an order you want is locked.",
            "Weigh each bold order before you sign. Every one that gets challenged raises the odds on all later orders for the rest of the game, and waiting doesn't undo it.",
        ],
        next: ["bill-to-law", "policy-delivery-line"],
        terms: ["executive-order", "rulemaking", "judicial-review", "struck-down", "veto-override"],
    },
    // player-core economy/fiscal-drivers.ts RATE_SOURCE_LABELS lists the parts a
    // reading is split into. Weights: macro-drivers.ts PHILLIPS_SLOPE (0.03),
    // OKUN (0.45, United States), INFLATION_EXPECTATIONS_WEIGHT (0.5);
    // fiscal-impulse.ts MULTIPLIER (purchases 0.8, taxes 0.6, transfers 0.5) and
    // IMPULSE_FADE (the push is spent over about 26 weeks);
    // monetary.ts FED_WEIGHT (0.5), FED_PRESSURE_TILT (0.05),
    // FED_CREDIBILITY_PREMIUM (0.0025). Strong is 0.6 or more, moderate 0.3 to 0.6,
    // weak under 0.3.
    {
        id: "economy-levers",
        title: "What moves the economy, and what you don't control",
        summary: "The economy is how much the country produces, how many people have jobs and how fast prices rise. You can steer it through spending, taxes and payments to households. The Federal Reserve alone sets interest rates, and world events move prices you can't control.",
        cast: [
            { label: "You, the President", role: "Changes what the government buys, what it taxes and what it pays out to households.", icon: "economyGrowth" },
            { label: "Households and businesses", role: "Their spending is called demand. When demand is high, firms hire and raise prices.", icon: "subjectPerson" },
            { label: "The Federal Reserve", role: "Sets the interest rate. It raises the rate to slow prices and lowers it to help jobs.", icon: "departmentCentralBank", term: "federal-reserve" },
            { label: "The rest of the world", role: "Wars, sanctions and world prices for fuel, food and materials push prices and growth up or down.", icon: "world" },
        ],
        links: [
            { from: "Government purchases", to: "Demand and output", how: "Each dollar the government spends buying things adds about 80 cents to total spending (demand). That raises output, which is everything the country produces in a year.", direction: "raises", weight: "strong", outcome: "helps" },
            { from: "Tax changes", to: "Demand and output", how: "Households save part of a tax cut, so a dollar of tax cut adds about 60 cents to spending. A dollar of tax increase takes about 60 cents away.", direction: "shifts", weight: "strong" },
            { from: "Payments to households", to: "Demand and output", how: "Each dollar sent to households, such as benefit payments, adds about 50 cents to spending.", direction: "raises", weight: "moderate", outcome: "helps" },
            { from: "An economy running hot", to: "Unemployment", how: "When the economy produces more than it can sustain, firms hire, and unemployment falls by about 0.45 points for each point of overheating. U.S. history shows this pattern, and it is called Okun's law.", direction: "lowers", weight: "moderate", outcome: "helps" },
            { from: "An economy running hot", to: "Inflation", how: "In this model a hot economy raises prices only slightly.", direction: "raises", weight: "weak" },
            { from: "What the public expects", to: "Inflation", how: "Half of where inflation heads is what people already expect, so a long price shock outlasts its cause.", direction: "shifts", weight: "moderate" },
            { from: "Inflation and joblessness", to: "The Fed's rate", how: "At each meeting the Fed weighs prices and jobs about equally and moves the rate toward what they call for.", direction: "shifts", weight: "moderate" },
            { from: "Your public pressure", to: "The Fed's rate", how: "Pressuring the Fed shifts how it weighs prices against jobs a little, and markets add a quarter of a percentage point to the rate.", direction: "shifts", weight: "weak" },
        ],
        examples: [{
                title: "A spending increase",
                kind: "illustration",
                lines: [
                    "A new law has the government spend $100 billion more on roads and equipment.",
                    "About $80 billion of new spending reaches the economy, spread over roughly half a year.",
                    "Firms hire to meet the demand, so the economy runs hot and unemployment falls. Prices rise only a little.",
                    "The Fed sees jobs recovering and prices edging up, so it may raise its rate at its next meeting.",
                ],
            }],
        youCan: [
            "Change standing fiscal policy and sign tax and spending laws.",
            "Open any rate on the Economy and read \"What sets the direction\" to see the parts that move it.",
            "Pressure the Fed in public once before a meeting. It costs you standing, and it shifts the Fed only a little.",
        ],
        next: ["deficit-and-debt", "budget-process"],
        terms: ["policy-rate", "federal-reserve", "deficit", "debt-to-output", "credit-rating"],
    },
    // player-core policy/domain-marks.ts deliveryFraction (the competence itself,
    // drawn as the percentage) and engine policy.ts executionQuality (0.6 plus 0.8
    // times competence; an empty chair is CARETAKER_QUALITY, 0.6), movementToDeltas
    // (positive effects scale with quality, costs do not), POLICY_DOMAIN_SPECS
    // chairHints (fiscal: treasury; defense: defense).
    {
        id: "policy-delivery-line",
        title: "Who delivers a policy line",
        summary: "A policy you set stays in place until you change it, but a department carries it out. The cabinet secretary beside each policy decides how much of its intended effect you get. If you put a more capable secretary in the chair, the policy gains you more and costs the same.",
        cast: [
            { label: "You, the President", role: "Sets each policy and appoints the secretary who runs it.", icon: "sign" },
            { label: "The cabinet secretary", role: "Runs the department behind a policy. The Treasury Secretary runs fiscal policy, and the Defense Secretary runs defense policy.", icon: "appoint" },
            { label: "The department", role: "The agency staff who do the work. A policy works only if the department carries it out.", icon: "building" },
        ],
        links: [
            { from: "The secretary's competence", to: "Delivery", how: "The percentage on each policy is the secretary's competence. At 0% you get 60% of the design, at 50% you get all of it, and at 100% you get 140%. An empty seat counts as 0%.", direction: "raises", weight: "strong", outcome: "helps" },
            { from: "Delivery", to: "What the policy gains you", how: "Gains are multiplied by delivery. Costs stay the same.", direction: "raises", weight: "strong", outcome: "helps" },
        ],
        examples: [{
                title: "In this game",
                kind: "illustration",
                lines: [
                    "Say a policy is designed to add 100 to something you want, and it costs you 40 of something else.",
                    "With a secretary at 50%, you get the 100 and pay the 40.",
                    "With a secretary at 0%, or an empty seat, you get only 60 and still pay the 40. A secretary at 100% gets you 140.",
                    "Choosing a capable secretary is part of setting a policy.",
                ],
            }],
        youCan: [
            "Read the delivery percentage beside each policy to see how well it is being carried out.",
            "Appoint a capable secretary to the chair behind the policies you care about most.",
            "Fill an empty seat. An empty chair delivers only 60% of a policy's design.",
        ],
        next: ["order-vs-law"],
        terms: ["policy-delivery"],
    },
];
