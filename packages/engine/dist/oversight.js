import { INSTITUTION_CATALOG, institutionDef } from "./institutions.js";
import { committeeName } from "./committees.js";
import { turnsFor } from "./pace.js";
// --- The clocks -------------------------------------------------------------
// Written in days and converted where they are read, the same way the removal
// arc's are: a turn is one week today, and if that ever becomes a dial these
// have to keep meaning the same stretches of governing rather than silently
// becoming two or four times as long. `turnsFor` is the engine's one converter
// and lives in pace.ts, which imports nothing — so reading it here cannot join
// the value-import cycle this module already sits beside.
/** Three weeks of a file nobody outside the building has heard of yet. */
const MATTER_QUIET_DAYS = 21;
/**
 * How long the long middle runs: a quarter of a fictional year.
 *
 * The same span a removal proceeding gets, and for the same reason — long
 * enough that the administration has a real chance to answer, short enough that
 * the answer has to come inside one political season.
 */
const MATTER_RIPENS_DAYS = 84;
/** How long a filed report stands before the file is closed on it. */
const MATTER_REPORT_STANDS_DAYS = 28;
/**
 * The notice an inspector general is owed before the office can be emptied.
 *
 * Thirty days, in writing, with the reasons stated. It is not a veto — the
 * President may still do it — it is the fact that they cannot do it quietly or
 * quickly, which is the whole of what the protection is worth and the whole of
 * what makes firing one mid-inquiry a decision instead of a click.
 */
export const IG_REMOVAL_NOTICE_DAYS = 30;
/**
 * The notice period in weeks, converted where it is read rather than once at
 * module load.
 *
 * A function rather than a constant, and not a style choice: the effect gate
 * imports this module's writer and this module imports the turn loop's week
 * length, so a conversion done in the module body runs while that cycle is
 * still settling and quietly yields a not-a-number the whole file then
 * arithmetics with. Every other clock here is converted at its point of use for
 * the same reason.
 */
export function igRemovalNoticeTurns() {
    return turnsFor(IG_REMOVAL_NOTICE_DAYS);
}
/**
 * How long an obstructed matter is still counted against the administration
 * after it closes: half a fictional year.
 *
 * Only the obstruction carries past the close. The inquiry itself stops costing
 * anything the week it ends — that is what ending means — but a president who
 * removed the person conducting it does not get the account settled by the file
 * being shut, because shutting the file is what they were accused of.
 */
const OBSTRUCTION_MEMORY_DAYS = 168;
// --- Founding ---------------------------------------------------------------
/**
 * The institutions that have an inspector general.
 *
 * Every standing body of the executive branch that is not a component of
 * another one: a department has an auditor, and the bureaus inside it are
 * audited by their department's rather than by fourteen of their own. The other
 * branches are excluded because this is the executive's own internal auditor
 * and Congress is not audited by one — Congress is the other half of this file.
 *
 * Read off the catalog rather than listed, so a body the catalog adds gets an
 * auditor without this file changing, and one it removes stops having a
 * phantom.
 */
export const INSPECTED_INSTITUTIONS = INSTITUTION_CATALOG.filter((def) => def.parent === undefined &&
    def.kind !== "presidency" &&
    def.kind !== "legislature" &&
    def.kind !== "judiciary" &&
    def.kind !== "state-government").map((def) => def.id);
export function foundingOversight(turn = 1) {
    return {
        inspectors: Object.fromEntries(INSPECTED_INSTITUTIONS.map((institution) => [
            institution,
            { institution, seatedTurn: turn, noticeReasons: [] },
        ])),
        matters: [],
    };
}
export function selectMatter(campaign, id) {
    return campaign.oversight.matters.find((matter) => matter.id === id);
}
export function isMatterOpen(matter) {
    return matter.stage !== "closed";
}
export function selectOpenMatters(campaign) {
    return campaign.oversight.matters.filter(isMatterOpen);
}
/** Every matter this institution's own auditor has running, open or closed. */
export function selectMattersFor(campaign, institution) {
    return campaign.oversight.matters.filter((matter) => matter.origin.kind === "inspector-general" && matter.origin.institution === institution);
}
export function selectInspector(campaign, institution) {
    return campaign.oversight.inspectors[institution];
}
/** Whether this auditor is in post: seated, and not yet removed. */
export function inspectorIsSeated(inspector) {
    return inspector !== undefined && inspector.removedTurn === undefined;
}
/** The office the matter came out of, in the words a screen prints. */
export function matterSource(matter) {
    if (matter.origin.kind === "committee")
        return committeeName(matter.origin.committee);
    if (matter.origin.kind === "special-counsel")
        return "The Office of the Special Counsel";
    const def = institutionDef(matter.origin.institution);
    return def ? `Office of Inspector General, ${def.name}` : matter.origin.institution;
}
/** When the matter next moves on its own, as a week of the campaign. */
export function matterRipensTurn(matter) {
    const opened = matter.openedTurn;
    if (matter.stage === "opened")
        return opened + turnsFor(MATTER_QUIET_DAYS);
    if (matter.stage === "gathering")
        return opened + turnsFor(MATTER_QUIET_DAYS + MATTER_RIPENS_DAYS);
    if (matter.stage === "reported") {
        return opened + turnsFor(MATTER_QUIET_DAYS + MATTER_RIPENS_DAYS + MATTER_REPORT_STANDS_DAYS);
    }
    return undefined;
}
// --- What it costs ----------------------------------------------------------
/**
 * What each stage of an open matter is worth against the administration.
 *
 * A file nobody knows about is worth nothing, which is why `opened` is zero
 * rather than a small number: the week an inquiry is started is not a week the
 * presidency is in any trouble, and pricing it as one would make the mere
 * existence of an auditor a standing tax on governing. A filed report is worth
 * the most, because that is the week there is something to answer.
 */
const STAGE_WEIGHT = {
    opened: 0,
    gathering: 0.12,
    reported: 0.3,
    closed: 0,
};
/**
 * What moving against the people conducting an inquiry is worth.
 *
 * More than the inquiry itself at any stage, and deliberately so: the case
 * against a president is rarely the thing they were first asked about.
 */
const OBSTRUCTION_WEIGHT = 0.45;
/**
 * What the office doing the looking is worth, as a multiplier on the rest.
 *
 * An audit and a subpoena are the same weight because they are the same fact
 * about a president: somebody with standing is asking. A special counsel is not
 * — it is a prosecutor the department itself decided it could no longer be seen
 * to do this work without, appointed out of a matter that had already reported,
 * with nobody in the administration able to tell it what to do next. A little
 * over an ordinary inquiry rather than a great deal: what makes a counsel
 * expensive is mostly that its matter carries the facts that got it appointed,
 * not a number attached to the name.
 */
const ORIGIN_WEIGHT = {
    "inspector-general": 1,
    committee: 1,
    "special-counsel": 1.4,
};
function matterContribution(matter, turn) {
    return round3(rawContribution(matter, turn) * ORIGIN_WEIGHT[matter.origin.kind]);
}
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
function rawContribution(matter, turn) {
    if (matter.direction !== "received")
        return 0;
    // A matter the country has not heard of moves nothing on the Hill. It is on
    // the board because the President can see their own government's files; it is
    // not a fact anybody can act on until it is public.
    if (!matter.public)
        return 0;
    if (matter.stage === "closed") {
        const closed = matter.closedTurn ?? turn;
        const remembered = turn - closed < turnsFor(OBSTRUCTION_MEMORY_DAYS);
        return matter.obstructed && remembered ? OBSTRUCTION_WEIGHT : 0;
    }
    return STAGE_WEIGHT[matter.stage] + (matter.obstructed ? OBSTRUCTION_WEIGHT : 0);
}
/**
 * How much trouble the standing oversight of this administration is worth, 0..1.
 *
 * The third term the chamber reads about a presidency, beside how it is
 * regarded and how much force it has used without asking. It is deliberately
 * the same shape as the second one — a bounded count of specific, dated,
 * nameable facts rather than a mood — because that is what makes it something
 * a president can see coming and act on.
 *
 * Exported rather than folded into a caller because two branches need it and
 * they must not each grow their own: the Hill's disposition reads it as one of
 * the things Congress is currently looking at, and the removal arc reads it as
 * part of what an impeachment would be built out of. A record that entered both
 * accounts by two different formulas would be two different governments.
 */
export function selectOversightPressure(campaign) {
    const total = campaign.oversight.matters.reduce((sum, matter) => sum + matterContribution(matter, campaign.turn), 0);
    return Math.max(0, Math.min(1, total));
}
function upsertMatter(matters, next) {
    const existing = matters.find((matter) => matter.id === next.id);
    if (!existing)
        return [...matters, next];
    // The one rule no caller gets to break. Everything else about a matter can be
    // rewritten by the week it is in; what the country already knows cannot be
    // unknown, and enforcing that here rather than at each call site is what makes
    // it a property of the record instead of a convention.
    const settled = { ...next, public: existing.public || next.public };
    return matters.map((matter) => (matter.id === next.id ? settled : matter));
}
export function applyOversight(state, effect) {
    const matters = (effect.matters ?? []).reduce(upsertMatter, state.oversight.matters);
    const inspectors = (effect.inspectors ?? []).reduce((acc, inspector) => ({ ...acc, [inspector.institution]: inspector }), { ...state.oversight.inspectors });
    return { ...state, oversight: { inspectors, matters } };
}
// --- The week ---------------------------------------------------------------
/**
 * A matter's next stage, if its clock has run out this week.
 *
 * Nothing here reads the administration. A proceeding that ripened faster
 * because the President was unpopular would be the polls under another name,
 * and the whole reason this apparatus is worth modeling is that it is the one
 * thing on the board that does not care: once a file is open it moves on its
 * own schedule until it is finished, and the only week that changes anything is
 * the week somebody is removed.
 */
function ripened(matter, turn) {
    const due = matterRipensTurn(matter);
    if (due === undefined || turn < due)
        return undefined;
    if (matter.stage === "opened") {
        return {
            ...matter,
            stage: "gathering",
            beats: [...matter.beats, { turn, description: `${matterSource(matter)} starts collecting documents.` }],
        };
    }
    if (matter.stage === "gathering") {
        const finding = `${matterSource(matter)} reports on ${matter.subject}.`;
        return {
            ...matter,
            stage: "reported",
            // A report is the week it stops being an internal matter. This is the one
            // transition that sets the public flag on its own, and it is why an
            // administration's window to answer an audit is the weeks before it, not
            // after.
            public: true,
            finding,
            beats: [...matter.beats, { turn, description: finding }],
        };
    }
    return {
        ...matter,
        stage: "closed",
        closedTurn: turn,
        beats: [...matter.beats, { turn, description: `${matterSource(matter)} ends its investigation.` }],
    };
}
/**
 * Every open matter's week.
 *
 * Separate from the two phases that open matters because ripening is the same
 * rule whoever started the file: an audit and a subpoena are different things
 * to receive and the same thing to sit through.
 */
export const oversightRipeningPhase = (state) => {
    const moved = state.oversight.matters.flatMap((matter) => {
        const next = ripened(matter, state.turn);
        return next ? [next] : [];
    });
    if (moved.length === 0)
        return [];
    const incident = state.security.intelligence.surveillanceIncident;
    const reporting = incident?.status === "recorded" ? moved.find((matter) => matter.stage === "reported"
        && matter.origin.kind === "inspector-general" && matter.origin.institution === "INST-DOD"
        && matter.surveillanceIncidentId === incident.id) : undefined;
    const finding = reporting && incident
        ? `The Defense inspector general publishes NSA collection log ${incident.id}, documenting intentional interception of a known U.S. person's private domestic message without consent, a FISA order, or any statutory exception.`
        : undefined;
    const reported = finding ? moved.map((matter) => matter.id === reporting?.id ? { ...matter, finding,
        beats: [...matter.beats.slice(0, -1), { turn: state.turn, description: finding }] } : matter) : moved;
    const withGraftFindings = reported.map((matter) => {
        if (matter.stage !== "reported" || !matter.causeId)
            return matter;
        const graft = state.ledger.find((entry) => entry.causal?.eventId === matter.causeId)?.causal?.graft;
        if (!graft || matter.origin.kind !== "inspector-general")
            return matter;
        const name = state.people[graft.person]?.base.name ?? "the former officeholder";
        const department = institutionDef(matter.origin.institution)?.name ?? matter.origin.institution;
        const text = `${matterSource(matter)} reports that ${name} steered contracts under the ${graft.account} purchasing appropriation at ${department}.`;
        return { ...matter, finding: text, beats: [...matter.beats.slice(0, -1), { turn: state.turn, description: text }] };
    });
    const graftCauseIds = withGraftFindings.flatMap((matter) => matter.stage === "reported" && matter.causeId ? [matter.causeId] : []);
    const effects = [{ kind: "oversight", matters: withGraftFindings }];
    if (finding && incident)
        effects.push({ kind: "intelligence", surveillanceIncident: { ...incident,
                exposedTurn: state.turn, status: "exposed" } });
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: { summary: withGraftFindings[0].beats.at(-1).description },
            ...(graftCauseIds.length > 0 ? { provenance: { origin: "world", systems: ["oversight", "graft"],
                    causeIds: graftCauseIds } } : {}),
            effects,
        },
    ];
};
