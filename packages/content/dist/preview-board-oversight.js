// The boards a scenario gated on the oversight, funding or rulemaking state has
// to be measured against.
//
// `preview-board.ts` declines to open an oversight matter, and says why: an
// inquiry poked into one arbitrary agency is a board that pretends. The answer
// is not to relax that rule, it is to build the board the honest way — press
// the readings a president's own conduct would have pressed, then hand the
// campaign to the engine's own phases and let them decide whether an audit
// opens, where, in which week, and what a removal notice does to it. Nothing
// here writes a matter, a lapse or a rule status onto a campaign. Every one of
// them is produced by the same code that produces it in a real campaign.
//
// Kept out of `preview-board.ts` because these boards evolve a campaign over
// weeks rather than patch one, and because the module they belong beside is the
// condition kinds they exist to make reachable.
import { ACUTE_CONDITIONS, apply, committeeInquiryPhase, createRngStreams, conclusoryAccount, fileInspectorRemovalNotice, grantOrderSubjects, regulatoryReviewOrderSubjects, inspectorGeneralPhase, isMatterOpen, judicialReviewPhase, oversightRipeningPhase, rulemakingPhase, selectDateOfTurn, SHUTDOWN_GRACE_TURNS, signOrder, signBill, specialCounselPhase, congressPhase, shutdownPhase, withDueCaseDefaults, } from "@admin/engine";
import { PlankId, STATE_DISASTER_ELIGIBILITY, worldDataset } from "@admin/world";
import { deedsWaitedOn, sealedCampaign, withFlags } from "./preview-board.js";
import { pulseBoards } from "./preview-board-pulse.js";
const applied = (campaign, packets) => packets.reduce((state, packet) => apply(state, packet), campaign);
/**
 * The readings that make an agency worth auditing, stated on the board.
 *
 * `auditWarrant` is half standing oversight pressure, a third politicization
 * and the rest failing integrity, and a founding sits at 0.08 against a 0.45
 * bar — so no sequence of weeks alone opens an audit anywhere. These are the
 * numbers an administration that has leaned on three departments would have
 * left behind, and they are as far as this file goes: which body gets audited,
 * in which week, and whether one opens at all is then the engine's own answer,
 * not this fixture's.
 */
const LEANED_ON = {
    oversightPressure: 0.7,
    politicization: 0.45,
    integrity: 0.45,
};
const DEPARTMENTS_LEANED_ON = ["INST-DOD", "INST-STATE", "INST-TREASURY"];
/** Pressed late, so the board also carries an audit still inside its quiet window. */
const DEPARTMENT_LEANED_ON_LATE = "INST-DOJ";
function leanOn(campaign, institutions) {
    const effects = institutions
        .filter((institution) => campaign.institutions[institution] !== undefined)
        .map((institution) => ({ kind: "institution", institution, changes: LEANED_ON }));
    if (effects.length === 0)
        return campaign;
    return apply(campaign, {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        narration: { summary: "The administration has spent the year leaning on the departments." },
        effects,
    });
}
/**
 * One week of the oversight apparatus, in the order the turn loop runs it.
 *
 * `obstruct` is what makes this a presidency rather than a weather report: the
 * President answers the audit by filing notice on the auditor, which the engine
 * turns into a permanently public, permanently obstructed matter and which the
 * committees then open their own file on. Turned off for the last weeks so the
 * board also carries an audit nobody outside the building knows about.
 */
function oversightWeek(campaign, obstruct) {
    let state = applied(campaign, inspectorGeneralPhase(campaign));
    state = applied(state, committeeInquiryPhase(state));
    state = applied(state, oversightRipeningPhase(state));
    state = applied(state, specialCounselPhase(state));
    const answerable = obstruct
        ? state.oversight.matters.find((matter) => matter.origin.kind === "inspector-general" && isMatterOpen(matter) && !matter.obstructed)
        : undefined;
    if (answerable?.origin.kind === "inspector-general") {
        const filed = fileInspectorRemovalNotice(state, answerable.origin.institution, conclusoryAccount("the premise of the audit is not accepted, and the office is to be filled by somebody who accepts it", answerable.id, state.turn));
        if (filed.ok)
            state = apply(state, filed.packet);
    }
    return { ...state, turn: state.turn + 1 };
}
/** Weeks of the apparatus before the last audit is pressed, and after. */
const OBSTRUCTED_WEEKS = 17;
const QUIET_WEEKS = 2;
/**
 * The obstructed-audit board: a presidency the auditors have caught up with.
 *
 * Twenty weeks of the real phases produce, without a single hand-written
 * record: three departmental audits public, obstructed and reported; three
 * committee inquiries opened on those obstructions and reported; a special
 * counsel appointed out of the oldest of them and gathering; and one more audit
 * opened two weeks ago that nobody outside the building knows about yet. That
 * spread is deliberate — it is every open stage, every origin, and both sides
 * of `public` and `obstructed`, so no facet of an `oversightMatter` gate is
 * refused for want of a board rather than for want of merit.
 */
function theObstructedAuditWeek() {
    let campaign = leanOn({ ...sealedCampaign("preview-oversight"), turn: 9 }, DEPARTMENTS_LEANED_ON);
    for (let week = 0; week < OBSTRUCTED_WEEKS; week += 1)
        campaign = oversightWeek(campaign, true);
    campaign = leanOn(campaign, [DEPARTMENT_LEANED_ON_LATE]);
    for (let week = 0; week < QUIET_WEEKS; week += 1)
        campaign = oversightWeek(campaign, false);
    return campaign;
}
/** Weeks the government has been closed on the shutdown board. */
const LAPSE_WEEKS = 4;
/**
 * The week the money actually stopped.
 *
 * The turn is set past the appropriation's own `throughTurn` — the same thing
 * every other preview board does when it declares which week it is — and
 * everything after that is derived by the engine: `congressPhase` is what puts
 * the government on the prior year's numbers, `shutdownPhase` is what opens the
 * lapse record, and `inShutdown` reads the two dates rather than a stored flag.
 */
function theWeekTheMoneyStopped() {
    const founded = sealedCampaign("preview-shutdown");
    let campaign = {
        ...founded,
        turn: founded.congress.appropriation.throughTurn + SHUTDOWN_GRACE_TURNS + 1,
    };
    campaign = applied(campaign, congressPhase(campaign));
    for (let week = 0; week < LAPSE_WEEKS; week += 1) {
        campaign = applied(campaign, shutdownPhase(campaign));
        campaign = { ...campaign, turn: campaign.turn + 1 };
    }
    return applied(campaign, shutdownPhase(campaign));
}
// Signed on weeks that put three rule statuses on one board: the first is
// contested and struck down after taking effect, the second remains in effect,
// and the third is signed on the week the board freezes and is still pending.
const RULE_SIGNINGS = [
    ["order-border-controls", 1],
    ["order-grant-conditions", 8],
    ["order-regulatory-review", 47],
];
const RULE_BOARD_LAST_TURN = 47;
/**
 * The rules in their window: one invalidated after it landed, one still
 * binding, and one still inside its rulemaking proceeding.
 *
 * `disapproved` is not here. Undoing a rule that way
 * takes a resolution of disapproval carried through both chambers against a
 * veto, which is a legislative campaign rather than a board, so content gating
 * on it is refused as unreachable — which is the honest answer and not a gap
 * this fixture should paper over.
 */
function theRulesInTheirWindow() {
    // Seeded so a lower court strikes the border order inside the board's weeks;
    // the lower merits now take 60 to 270 days to come back.
    let campaign = sealedCampaign("rule-board-3");
    const charter = worldDataset.charters.find((candidate) => candidate.id === campaign.founding.charter);
    if (!charter)
        throw new Error("the shipped dataset lacks the founding's own charter");
    const streams = createRngStreams(campaign.seed);
    const review = judicialReviewPhase(charter);
    for (let turn = 1; turn <= RULE_BOARD_LAST_TURN; turn += 1) {
        campaign = { ...campaign, turn, calendar: selectDateOfTurn(campaign, turn) };
        if (turn === 7) {
            const bill = { id: "bill:preview-policing-grants", act: "act-police-accountability",
                title: "The Police Accountability Act", sponsor: "administration",
                introducedTurn: turn, status: "on-the-desk", passage: [] };
            campaign = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
            const enacted = signBill(campaign, bill.id);
            if (!enacted.ok)
                throw new Error(`the preview board cannot enact policing grants: ${enacted.reason}`);
            campaign = apply(campaign, enacted.packet);
        }
        for (const [order, signedOn] of RULE_SIGNINGS) {
            if (signedOn !== turn)
                continue;
            const subject = order === "order-grant-conditions" ? grantOrderSubjects(campaign)[0]
                : order === "order-regulatory-review" ? regulatoryReviewOrderSubjects(campaign).find((candidate) => campaign.pendingRules.some((rule) => rule.id === candidate.ruleId && rule.order === "order-grant-conditions")) : undefined;
            const signed = signOrder(campaign, charter, order, streams, subject);
            if (!signed.ok)
                throw new Error(`the preview board cannot sign ${order}: ${signed.reason}`);
            campaign = apply(campaign, signed.packet);
        }
        // Nobody answers the lower judgment, so its desk case runs its default
        // and the judgment becomes final, as it does for a President who does not answer.
        campaign = withDueCaseDefaults(campaign);
        campaign = applied(campaign, review(campaign));
        campaign = applied(campaign, rulemakingPhase(campaign));
    }
    return campaign;
}
// Each board costs a sealed founding plus twenty weeks of phases, and the audit
// asks for them once per batch and once per test. Built on first ask and kept.
const cache = new Map();
function board(id, build) {
    const held = cache.get(id);
    if (held)
        return held;
    const built = build();
    cache.set(id, built);
    return built;
}
export const oversightBoard = () => board("oversight", theObstructedAuditWeek);
export const shutdownBoard = () => board("shutdown", theWeekTheMoneyStopped);
export const rulemakingBoard = () => board("rulemaking", theRulesInTheirWindow);
// --- The economy boards: a standing condition `conditionActive` can gate on ---
//
// `conditionActive` is the only economy gate (`scenario-cast.ts`'s
// `worstConditionSeverity`), and none of the ten canonical boards carries a
// standing economic condition — they run nine weeks of ordinary governance,
// not a business cycle, so a scenario gated on one is unreachable until a
// board exists where it is actually live. `unrest` is a `StandingCondition`
// too but is not an economy gate, so it is not in this list; it gets the same
// kind of board below, because a scenario about a street that will not go home
// is just as unreachable on nine weeks of ordinary governance.
/**
 * The six standing kinds `conditionActive` can name as an economy gate.
 * `recession`, `inflation-shock` and `unemployment-shock` are business-cycle
 * labels for what the rates are doing; `fiscal-crisis` is a market-access state;
 * `energy-shortage` and `housing-crunch` keep their own authored pressure.
 */
const ECONOMY_CONDITIONS = [
    "recession",
    "inflation-shock",
    "unemployment-shock",
    "fiscal-crisis",
    "energy-shortage",
    "housing-crunch",
];
function isBoardedStanding(kind) {
    return kind === "unrest" || ECONOMY_CONDITIONS.includes(kind ?? "");
}
/**
 * The severity a fresh onset actually opens at — `condition-onset.ts`'s own
 * `openCondition` draws from 0.3 to 0.7 — so a board built at the low end of
 * that band is the strict reading: a scenario reachable here is reachable the
 * week a condition has only just cleared the threshold that opened it, not
 * only once it has run for months and deepened.
 */
const ECONOMY_CONDITION_SEVERITY = 0.3;
/** Past every `turn` floor an economy regate stacks beside its `conditionActive` gate, and past the default spread's own nine-week reading of "early campaign". */
const ECONOMY_BOARD_TURN = 12;
/**
 * One board per standing economic condition, each carrying that condition live
 * and nothing else standing.
 *
 * Written by hand rather than through `onsetCandidates`/`openCondition`
 * because those read a nation's own statistics and the business cycle to
 * decide *whether* a condition opens, which is a different question from the
 * one a reachability board asks — only "does a board exist where it has." The
 * write goes through the same `condition` effect a real onset or a real
 * weekly tick writes (`record-effects.ts`'s `applyCondition`), so this is not
 * a second way for a condition to land on a campaign, only a direct one.
 */
function economyConditionBoard(kind, deeds) {
    return board(`condition:${kind}|${deeds.key}`, () => {
        const campaign = { ...sealedCampaign("preview-economy"), turn: ECONOMY_BOARD_TURN };
        const startedTurn = campaign.turn - 3;
        const condition = {
            id: `condition:${kind}:${campaign.founding.nation}:${startedTurn}`,
            nation: campaign.founding.nation,
            kind,
            scope: "nation",
            severity: ECONOMY_CONDITION_SEVERITY,
            startedTurn,
            status: "active",
            beats: [],
        };
        const standing = apply(campaign, {
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            narration: { summary: `The board is carrying a standing ${kind} condition, for the reachability gate.` },
            effects: [{ kind: "condition", set: condition }],
        });
        return withFlags(standing, deeds.flags);
    });
}
/**
 * The boards a batch's own conditions demand, beyond the canonical spread.
 *
 * The point of returning these automatically rather than documenting them is
 * that the alternative already failed once: `openMatters` shipped as a gate no
 * board could satisfy, parsed clean through both institution audits, and would
 * have gone to a drafter as a live mechanism. A condition kind whose state no
 * default board carries has to bring its own board with it, or the reachability
 * gate is measuring the fixtures instead of the content.
 */
export function supplementBoards(defs) {
    const wanted = new Set();
    const economyKinds = new Set();
    for (const condition of defs.flatMap((def) => def.conditions)) {
        if (condition.kind === "oversightMatter")
            wanted.add(oversightBoard);
        if (condition.kind === "institutionState" && condition.field === "openMatters")
            wanted.add(oversightBoard);
        if (condition.kind === "shutdown" || condition.kind === "appropriation")
            wanted.add(shutdownBoard);
        if (condition.kind === "pendingRule")
            wanted.add(rulemakingBoard);
        if (condition.kind === "conditionActive" && isBoardedStanding(condition.condition)) {
            economyKinds.add(condition.condition);
        }
    }
    return [
        ...[...wanted].map((build) => build()),
        ...[...economyKinds].map((kind) => economyConditionBoard(kind, deedsWaitedOn(defs))),
        ...strickenBoards(defs),
        ...calendarBoards(defs),
        ...ticketBoards(defs),
        ...pulseBoards(defs),
    ];
}
/**
 * A board founded on the plank a scenario asks the President to have run on.
 *
 * Only the plank. A party, a background or a route is chosen at the seal and the
 * whole campaign is derived from it — Congress is apportioned against the party,
 * the leader's readings against the biography — so a board for one of those is a
 * different founding rather than a patched campaign, and a scenario gating on one
 * has to wait for that board rather than get a half-built one here. The platform
 * is authored founding data that nothing else derives from, so stating it is
 * exactly as honest as sealing it.
 */
function ticketBoards(defs) {
    const planks = new Set();
    for (const condition of defs.flatMap((def) => def.conditions)) {
        if (condition.kind === "ticket" && condition.plank)
            planks.add(PlankId.parse(condition.plank));
    }
    if (planks.size === 0)
        return [];
    return [
        board(`ticket:${[...planks].sort().join(",")}`, () => {
            const seeded = sealedCampaign("preview-ticket");
            return {
                ...seeded,
                turn: ECONOMY_BOARD_TURN,
                founding: { ...seeded.founding, platform: [...planks].sort() },
            };
        }),
    ];
}
/**
 * A board sitting in the part of the year a scenario's calendar gate asks for.
 *
 * The canonical spread is every board the gate already casts against, and every
 * one of them sits within a few weeks of the oath — so a scenario about the
 * heating season or the hurricane season was unreachable on all of them, for the
 * one reason that has nothing to do with its merit. One board per distinct gate,
 * and none for a scenario already carrying an acute condition: that board sets
 * its own month from the same gate.
 */
function calendarBoards(defs) {
    const months = new Set();
    for (const def of defs) {
        if (def.conditions.some((condition) => condition.kind === "conditionActive" && isAcuteKind(condition.condition)))
            continue;
        const wanted = monthFor(def, 0);
        if (wanted > 0)
            months.add(wanted);
    }
    return [...months].sort((a, b) => a - b).map((month) => calendarBoard(month));
}
function calendarBoard(month) {
    return board(`calendar:${month}`, () => {
        const seeded = sealedCampaign("preview-calendar");
        // Far enough in that every `turn` floor a seasonal scenario stacks beside
        // its calendar gate is cleared, and the year is not the founding week.
        return { ...seeded, turn: ECONOMY_BOARD_TURN, calendar: { ...seeded.calendar, month } };
    });
}
/**
 * The boards a scenario about something that struck a place has to be measured
 * on, one per scenario that asks for one.
 *
 * Per scenario rather than per kind, because a bound disaster usually carries a
 * `calendar` gate beside its `conditionActive` one — a fire in the fire season, a
 * storm in the storm season — and a board that planted the fire in February
 * would report the scenario unreachable for the wrong reason. Both halves of the
 * scenario's own gate are satisfied on one board, which is exactly the question
 * reachability asks: is there a week where this is live.
 *
 * The state is the first one the dataset says the hazard can plausibly land in,
 * so the board is a place the engine's own placement roll could have chosen.
 */
function strickenBoards(defs) {
    return defs.flatMap((def) => {
        const gate = def.conditions.find((condition) => condition.kind === "conditionActive" && isAcuteKind(condition.condition));
        if (gate === undefined || gate.kind !== "conditionActive" || !isAcuteKind(gate.condition))
            return [];
        return [strickenBoard(def, gate.condition)];
    });
}
function isAcuteKind(kind) {
    return kind !== undefined && ACUTE_CONDITIONS.includes(kind);
}
/** The month a scenario's own calendar gate wants, or the month the board would sit at anyway. */
function monthFor(def, fallback) {
    for (const condition of def.conditions) {
        if (condition.kind !== "calendar")
            continue;
        if (condition.months && condition.months.length > 0)
            return condition.months[0];
        if (condition.season)
            return SEASON_FIRST_MONTH[condition.season];
    }
    return fallback;
}
const SEASON_FIRST_MONTH = {
    winter: 1,
    spring: 4,
    summer: 7,
    fall: 10,
};
function strickenBoard(def, kind) {
    const deeds = deedsWaitedOn([def]);
    return board(`stricken:${def.id}:${kind}`, () => {
        const seeded = sealedCampaign("preview-stricken");
        const month = monthFor(def, seeded.calendar.month);
        const campaign = {
            ...seeded,
            turn: ECONOMY_BOARD_TURN,
            calendar: { ...seeded.calendar, month },
        };
        const state = def.locus.state ?? STATE_DISASTER_ELIGIBILITY[kind]?.[0];
        const startedTurn = campaign.turn - 1;
        const condition = {
            id: `condition:${kind}:${campaign.founding.nation}:${startedTurn}`,
            nation: campaign.founding.nation,
            kind,
            // A region, not the nation: an acute condition lands in a place, and a
            // scenario that binds to one has to find a place on the record.
            scope: "region",
            severity: ECONOMY_CONDITION_SEVERITY,
            startedTurn,
            status: "active",
            beats: [],
            ...(state ? { state, place: state } : {}),
        };
        const struck = apply(campaign, {
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            narration: { summary: `The board is carrying a live ${kind}, for the reachability gate.` },
            effects: [{ kind: "condition", set: condition }],
        });
        return withFlags(struck, deeds.flags);
    });
}
