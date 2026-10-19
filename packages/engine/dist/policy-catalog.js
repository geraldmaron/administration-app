// The stance catalogue: four positions per domain, one of them the one this
// administration inherited.
//
// A data table, kept apart from the rules that read it for the reason the
// institution catalog and the trade sector table are: a flat list of authored
// positions is its own length, and leaving it inside the module that derives
// outlooks from it made the derivations impossible to find.
//
// Every `treasuryOfGdp` below is written in the administration's book — the
// budget authority it is holding, a quarter of the year's discretionary
// appropriation — and never in the country's. The two are read differently and
// the difference is deliberate: a `perTurn` figure is an annual rate and is
// prorated to the week that collects it, while an `enactment` is a lump paid
// once and is booked whole. So a standing line of 0.009 of output is 4,700 a
// week against 27,500 apportioned, and an enactment of the same 0.009 would be
// two and a half times everything the President holds. The enactment figures
// are therefore sized against the stock rather than against a year of national
// output: the heaviest of them obligates about an eighth of the authority, the
// same share of it the retired nine-percent-of-GDP wallet used to take, which
// is the price of standing a signature program up.
//
// A `perTurn` stability is a level, not a rate. Order settles a tenth of the
// way back toward where the country's institutions hold it every week
// (`STABILITY_REVERSION`), so a program writing s a week holds the country's
// order ten times s from its rest, for as long as it runs. Each figure below is
// therefore a tenth of the level it holds, and the levels are points of order:
// a program's order is felt as a point or two, and what makes it cost more is
// its `enactment`, the disorder of standing it up, which fades as the country
// settles. Authored as weekly rates before anything pulled order back, the same
// figures held careful government's program twenty-four points under the rest
// and a gift of investment ten over, which made borrowing the dominant program
// and careful government leave the country less governable than doing nothing.
// Levels come in whole points because the weekly write is kept to a thousandth,
// so a program whose order was authored under half a point (extraction, managed
// trade) now moves none, and its price is what else it costs.
//
// A weekly figure on a quantity nothing pulls back is a rate, not a level:
// standing abroad, press freedom, corruption and insurgency have no resting
// point, so a program that writes one every week carries it to its bound over a
// term and holds it there against every leak and every act. Held alone, open
// society and oversight took standing to the ceiling, press freedom to 1.0 and
// corruption to nothing, and each was worth six points of a term's approval
// over doing nothing: the pick every player should make and nobody would weigh.
// So a domestic reform earns the standing other governments give it once, in
// its `enactment`, when it passes. Open trade keeps its weekly figure: other
// governments deal with it every week, what it costs at home keeps it within
// three points of doing nothing on its own, and careful government's standing
// rests on it.
// Drawdown and the energy transition keep a weekly figure too small to fill the
// ceiling alone in a term. And a benefit the public reads through a quantity
// with no resting point (press freedom, corruption, insurgency) is sized to
// move it a step over a term, not to its end.
//
// No fiscal stance buys order or standing. What a budget does for the country
// is its books: the take and the lines (`FISCAL_PROGRAM_SHIFTS`), the push they
// give demand as they change, and what the borrowing costs the President in
// room. What one costs in the street stays authored beside it.
export const STANCES = [
    // Fiscal ----------------------------------------------------------------
    {
        id: "fiscal-continuity",
        domain: "fiscal",
        name: "Continuity",
        summary: "The budget as you found it. Nobody is angry and nobody is grateful.",
        inherited: true,
        perTurn: {},
        enactment: {},
        nationEffects: {},
        alignment: {},
    },
    // Neither fiscal stance below carries a debt term, and their absence is the
    // point: what a budget program does to the debt is what it does to the take
    // and the outlay lines, which `fiscal.ts` already reads off the stance id.
    // A second delta on the stock stated the same fact again, with no rule for
    // which of the two was the deficit, so a consolidation paid down borrowing
    // twice and an investment program borrowed twice.
    {
        id: "fiscal-austerity",
        domain: "fiscal",
        name: "Consolidation",
        summary: "Departmental budgets are cut to a schedule and the deficit closes. The services people notice are the ones that close first.",
        perTurn: { stability: -0.001 },
        enactment: { stability: -0.03 },
        // What consolidation does to demand is its fiscal impulse, read off the
        // books (`FISCAL_PROGRAM_SHIFTS`); a resting offset here would bill it twice.
        nationEffects: {
            "politics.protestPressure": 0.0015,
        },
        alignment: { economicLeftRight: 0.25 },
    },
    {
        id: "fiscal-investment",
        domain: "fiscal",
        name: "Public investment",
        summary: "Borrowing against a decade of infrastructure. It is spent before it is earned, and it is visible.",
        perTurn: {},
        enactment: {},
        // Supply, not demand: what the program builds raises what the economy can
        // produce, so it moves potential output with growth and leaves the gap and
        // jobs where they were. Its push on demand, and the jobs that push makes,
        // are its fiscal impulse (`FISCAL_PROGRAM_SHIFTS`); a resting jobs offset
        // here billed them twice.
        nationEffects: { "economy.growth": 0.0008 },
        alignment: { economicLeftRight: -0.2 },
    },
    {
        id: "fiscal-redistribution",
        domain: "fiscal",
        name: "Redistribution",
        summary: "Transfers upward from capital and downward to households. The bottom half feels it within a quarter; so does everyone who was asked to pay for it.",
        perTurn: { standing: -0.003 },
        enactment: { stability: -0.02 },
        nationEffects: {
            "economy.growth": -0.0003,
            "economy.unemployment": -0.0006,
            "politics.legitimacy": 0.0012,
            "politics.protestPressure": -0.001,
        },
        alignment: { economicLeftRight: -0.35 },
    },
    // Industry and energy ---------------------------------------------------
    {
        id: "industry-continuity",
        domain: "industry",
        name: "Continuity",
        summary: "The industrial base as it stands, neither wound down nor pushed.",
        inherited: true,
        perTurn: {},
        enactment: {},
        nationEffects: {},
        alignment: {},
    },
    {
        id: "industry-extraction",
        domain: "industry",
        name: "Extractive expansion",
        summary: "Licenses issued, output raised, and the receipts banked now. The bill for it arrives on somebody else's term.",
        perTurn: { standing: -0.006 },
        enactment: {},
        // The receipts are banked by the country, not by the President: royalties
        // and lease sales go to the general fund, where the books take them as
        // revenue (`FISCAL_PROGRAM_SHIFTS`), about 0.8% of output a year.
        nationEffects: {
            "economy.growth": 0.001,
            "energy.importDependence": -0.002,
            "security.corruptionIndex": 0.0012,
        },
        alignment: { economicLeftRight: 0.15, nationalistGlobalist: 0.1 },
    },
    {
        id: "industry-transition",
        domain: "industry",
        name: "Energy transition",
        summary: "A generation's worth of capital moved out of the old base and into the new one. Expensive, slow, and the sort of thing other governments notice.",
        perTurn: { treasuryOfGdp: -0.009, standing: 0.0015 },
        enactment: { treasuryOfGdp: -0.0015 },
        nationEffects: { "economy.growth": -0.0004, "energy.importDependence": -0.003, "softPower.diplomaticReach": 0.0008 },
        alignment: { nationalistGlobalist: -0.2, economicLeftRight: -0.1 },
    },
    {
        id: "industry-nationalization",
        domain: "industry",
        name: "Strategic nationalization",
        summary: "The commanding heights taken into public hands. The revenue is real and so is the capital flight.",
        perTurn: { standing: -0.008, stability: -0.001 },
        enactment: { standing: -0.04 },
        // The dividends reach the general fund as revenue (`FISCAL_PROGRAM_SHIFTS`).
        nationEffects: {
            "economy.growth": -0.0008,
            "economy.inflation": 0.0008,
            "security.corruptionIndex": 0.0015,
            "politics.legitimacy": 0.0008,
        },
        alignment: { economicLeftRight: -0.4, nationalistGlobalist: 0.15 },
    },
    // Trade -----------------------------------------------------------------
    {
        id: "trade-continuity",
        domain: "trade",
        name: "Continuity",
        summary: "The schedules you inherited, renewed without comment.",
        inherited: true,
        perTurn: {},
        enactment: {},
        nationEffects: {},
        alignment: {},
    },
    {
        id: "trade-open",
        domain: "trade",
        name: "Open markets",
        summary: "Tariffs down, quotas gone, and every counterpart pleased. The industries that were being sheltered find out what they were being sheltered from.",
        perTurn: { standing: 0.008, stability: -0.001 },
        enactment: {},
        nationEffects: {
            "economy.growth": 0.0009,
            "economy.inflation": -0.0006,
            "economy.unemployment": 0.0006,
            "softPower.diplomaticReach": 0.0012,
        },
        alignment: { nationalistGlobalist: -0.3, economicLeftRight: 0.15 },
    },
    {
        id: "trade-managed",
        domain: "trade",
        name: "Managed trade",
        summary: "Sector by sector, negotiated, and reviewed on a calendar. Nobody is delighted and nothing collapses.",
        perTurn: { standing: -0.002 },
        enactment: {},
        nationEffects: { "economy.growth": 0.0002, "economy.unemployment": -0.0002, "softPower.diplomaticReach": 0.0004 },
        // A mild lean to the national side — well under protective's 0.35, because a
        // negotiated schedule is the middle of that argument and not its end. It was
        // authored empty, which made it the one stance in the catalogue with nobody
        // to be against: a program a president can adopt and no cohort can oppose is
        // a setting, not a policy. It carries no economic-axis term on purpose;
        // giving it one made it outscore protective tariffs for a nationalist state
        // with high unemployment, which is the one place protective should win.
        alignment: { nationalistGlobalist: 0.08 },
    },
    {
        id: "trade-protective",
        domain: "trade",
        name: "Protective tariffs",
        summary: "A wall around domestic production. The towns that make things are grateful; every government that sells to them is not.",
        perTurn: { stability: 0.001, standing: -0.01 },
        enactment: { standing: -0.03 },
        nationEffects: {
            "economy.growth": -0.0005,
            "economy.inflation": 0.0012,
            "economy.unemployment": -0.0008,
            "softPower.diplomaticReach": -0.0015,
        },
        alignment: { nationalistGlobalist: 0.35 },
    },
    // Civil liberties -------------------------------------------------------
    {
        id: "civil-continuity",
        domain: "civil",
        name: "Continuity",
        summary: "The statute book as it stands, enforced as it has been.",
        inherited: true,
        perTurn: {},
        enactment: {},
        nationEffects: {},
        alignment: {},
    },
    {
        id: "civil-open-society",
        domain: "civil",
        name: "Open society",
        summary: "Press protections written into law, assembly deregulated, and the archives opened. It is admired abroad and it is loud at home.",
        perTurn: { stability: -0.001 },
        enactment: { stability: -0.02, standing: 0.04 },
        nationEffects: {
            "politics.pressFreedom": 0.0002,
            "politics.legitimacy": 0.0015,
            "politics.protestPressure": 0.0015,
            "security.corruptionIndex": -0.0003,
        },
        alignment: { authLibertarian: -0.35 },
    },
    {
        id: "civil-public-order",
        domain: "civil",
        name: "Public order",
        summary: "Assembly licensed, protest policed to a standard, and disorder answered early. Quiet streets, and a press that says why they are quiet.",
        perTurn: { stability: 0.001, standing: -0.006 },
        enactment: {},
        nationEffects: {
            "politics.pressFreedom": -0.0015,
            "politics.protestPressure": -0.003,
            "security.insurgencyPressure": -0.0002,
        },
        alignment: { authLibertarian: 0.2 },
    },
    // Governing on standing declarations rather than on the ordinary law: a
    // national emergency declared and renewed each year under the National
    // Emergencies Act (50 U.S.C. §1621, §1622; uscode.house.gov, opened
    // 2026-09-29), Stafford Act declarations for every disaster that qualifies
    // (42 U.S.C. §5170; opened 2026-09-29), and the Guard federalized early. No
    // statute lets a President hold anyone without charge or censor a paper, so
    // the posture chills reporting at the cordon rather than closing a press;
    // the press figure is a planning value for that chill, a third of what the
    // censorship this stance used to describe was priced at.
    {
        id: "civil-emergency-powers",
        domain: "civil",
        name: "Emergency powers",
        summary: "National emergencies declared and renewed every year, disaster declarations for everything that qualifies, and the Guard called up early. All of it lawful, none of it ordinary, and Congress can end any of it by joint resolution.",
        perTurn: { stability: 0.002, standing: -0.016 },
        enactment: { standing: -0.05 },
        nationEffects: {
            "politics.pressFreedom": -0.002,
            "politics.legitimacy": -0.003,
            "politics.protestPressure": -0.005,
            "security.insurgencyPressure": 0.0015,
        },
        alignment: { authLibertarian: 0.45 },
    },
    // Security and intelligence ---------------------------------------------
    {
        id: "security-continuity",
        domain: "security",
        name: "Continuity",
        summary: "The services run as they were run before you, and report as they did.",
        inherited: true,
        perTurn: {},
        enactment: {},
        nationEffects: {},
        alignment: {},
    },
    {
        id: "security-community",
        domain: "security",
        name: "Community policing",
        summary: "Fewer files, more officers on foot, and a service that people will actually talk to. It costs money and it takes years.",
        perTurn: { stability: 0.001, treasuryOfGdp: -0.004 },
        enactment: { treasuryOfGdp: -0.0005, standing: 0.02 },
        nationEffects: {
            "security.insurgencyPressure": -0.0002,
            "security.borderControl": 0.001,
            "politics.legitimacy": 0.0015,
            "security.corruptionIndex": -0.0003,
        },
        alignment: { authLibertarian: -0.2 },
    },
    {
        id: "security-surveillance",
        domain: "security",
        name: "Mass surveillance",
        summary: "Bulk collection, retention by default, and a warrant process that no longer meaningfully refuses. Very little happens that you do not know about.",
        perTurn: { stability: 0.001, standing: -0.01, treasuryOfGdp: -0.005 },
        enactment: { standing: -0.03 },
        nationEffects: {
            "security.intelCapability": 0.003,
            "security.counterIntel": 0.002,
            "politics.pressFreedom": -0.003,
            "politics.protestPressure": 0.001,
        },
        alignment: { authLibertarian: 0.4 },
    },
    {
        id: "security-disclosure",
        domain: "security",
        name: "Oversight and disclosure",
        summary: "The services put under a committee that can actually compel them, and the historic files released. What comes out is not flattering to anyone, including you.",
        perTurn: { stability: -0.001 },
        enactment: { stability: -0.03, standing: 0.04 },
        nationEffects: {
            "security.intelCapability": -0.002,
            "security.counterIntel": -0.0015,
            "politics.pressFreedom": 0.0002,
            "security.corruptionIndex": -0.0003,
        },
        alignment: { authLibertarian: -0.4 },
    },
    // Defense ---------------------------------------------------------------
    {
        id: "defense-continuity",
        domain: "defense",
        name: "Continuity",
        summary: "The force you inherited, at the posture you inherited it at.",
        inherited: true,
        perTurn: {},
        enactment: {},
        nationEffects: {},
        alignment: {},
    },
    {
        id: "defense-rearmament",
        domain: "defense",
        name: "Rearmament",
        summary: "Procurement accelerated across every branch. The general staff is delighted and the region is watching the order books.",
        perTurn: { treasuryOfGdp: -0.01, standing: -0.004 },
        enactment: { treasuryOfGdp: -0.0015 },
        nationEffects: { "military.readiness": 0.003, "military.doctrineQuality": 0.002 },
        alignment: { nationalistGlobalist: 0.2, authLibertarian: 0.1 },
    },
    {
        id: "defense-conscription",
        domain: "defense",
        name: "National service",
        summary: "Universal service restored. It fills the establishment tables faster than any budget could, and every household in the country now has an opinion about you.",
        perTurn: { stability: -0.001, treasuryOfGdp: -0.004 },
        enactment: { stability: -0.04 },
        nationEffects: {
            "military.readiness": 0.004,
            "military.doctrineQuality": -0.001,
            "politics.protestPressure": 0.002,
        },
        alignment: { authLibertarian: 0.3, nationalistGlobalist: 0.2 },
    },
    {
        id: "defense-drawdown",
        domain: "defense",
        name: "Drawdown",
        summary: "The establishment cut, bases closed, and the savings booked. It buys a great deal of goodwill and it cannot be reversed quickly.",
        perTurn: { standing: 0.001 },
        enactment: { stability: -0.02 },
        // The savings are the country's: a smaller defense line in the books
        // (`FISCAL_PROGRAM_SHIFTS`), which is less borrowing, and never a deposit
        // into the President's own account.
        nationEffects: {
            "military.readiness": -0.003,
            "military.doctrineQuality": -0.0015,
            "softPower.diplomaticReach": 0.001,
        },
        alignment: { authLibertarian: -0.15, nationalistGlobalist: -0.2 },
    },
];
