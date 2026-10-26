import { institutionDef, institutionInProse } from "./institutions.js";
import { headOfGovernmentTitle } from "./naming.js";
import { igRemovalNoticeTurns, INSPECTED_INSTITUTIONS, inspectorIsSeated, isMatterOpen, selectInspector, selectMattersFor, } from "./oversight.js";
// The auditor the President did not appoint and cannot call off.
//
// Every other check on this presidency is somebody the player chose, somebody
// they can talk round, or a court weeks away. An inspector general is inside
// the building, reads the same files the Secretary does, and opens an audit
// because of what the agency's own numbers say rather than because anybody
// decided to have one opened. There is deliberately no action anywhere in this
// file that closes a matter: the only lever the office has over one is to empty
// the chair the auditor sits in, in writing, thirty days ahead, with the
// reasons stated — and doing that while the audit is running does not stop it,
// it makes it the thing the President is asked about.
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const leader = (campaign) => headOfGovernmentTitle(campaign.founding.leadRole);
/**
 * What an agency's own numbers say about whether it needs looking at.
 *
 * Three readings, and each is a different way a body goes wrong. Standing
 * oversight pressure is what other people have already noticed — a leak, a
 * referral, a botched assessment — and it counts for most because it is the
 * only one of the three that is somebody else's judgment rather than the
 * agency's own. Politicization is the body being bent toward the
 * administration's politics and away from its mandate, which is precisely what
 * an inspector general exists to catch. Failing integrity is the ordinary
 * kind of rot underneath both.
 */
export function auditWarrant(runtime) {
    return round3(clamp01(runtime.oversightPressure * 0.5 + runtime.politicization * 0.3 + (1 - runtime.integrity) * 0.2));
}
/**
 * Where an audit stops being discretionary.
 *
 * Set so that a body running as it was founded — a little oversight pressure,
 * barely politicized, its integrity where the catalog opens it — is well below
 * it, and an agency the administration has visibly leaned on is above it. An
 * audit is meant to be something a president causes, not weather.
 */
const AUDIT_OPENS_AT = 0.45;
function auditSubject(runtime, name) {
    if (runtime.politicization >= 0.4) {
        return `whether appointments and casework at ${institutionInProse(name)} are being directed for political reasons`;
    }
    if (runtime.integrity <= 0.5)
        return `breakdowns of internal control at ${institutionInProse(name)}`;
    return `how ${institutionInProse(name)} has handled the matters referred to it this year`;
}
function openedMatter(campaign, institution, runtime) {
    const name = institutionDef(institution)?.name ?? institution;
    const incident = campaign.security.intelligence.surveillanceIncident;
    const investigation = institution === "INST-DOD" && incident?.status === "recorded" ? incident : undefined;
    const subject = investigation ? "suspected unauthorized domestic collection at the NSA" : auditSubject(runtime, name);
    return {
        id: `matter:ig:${institution}:${campaign.turn}`,
        ...(investigation ? { surveillanceIncidentId: investigation.id } : {}),
        origin: { kind: "inspector-general", institution },
        direction: "received",
        subject,
        openedTurn: campaign.turn,
        stage: "opened",
        // An audit opens inside the building. Nobody outside it knows for weeks,
        // which is the window an administration has to fix the thing rather than to
        // fight about it.
        public: false,
        obstructed: false,
        beats: [{ turn: campaign.turn, description: `The inspector general at ${institutionInProse(name)} opens an audit into ${subject}.` }],
    };
}
/** A concealed purchasing act becomes an auditable file only after records have had time to surface. */
function dueGraftMatter(campaign, idle) {
    const available = new Set(idle);
    const alreadyOpened = new Set(campaign.oversight.matters.map((matter) => matter.causeId));
    for (const entry of campaign.ledger) {
        const event = entry.causal;
        const graft = event?.graft;
        if (!event || !graft || alreadyOpened.has(event.eventId))
            continue;
        const institution = graft.institution;
        if (!available.has(institution))
            continue;
        const runtime = campaign.institutions[institution];
        if (!runtime)
            continue;
        // Current pressure controls how quickly the inspector can reach a record;
        // removing the inspector suspends discovery, not the underlying act.
        const wait = Math.ceil(26 * (1.5 - runtime.oversightPressure));
        if (campaign.turn < entry.turn + wait)
            continue;
        const name = institutionDef(institution)?.name ?? institution;
        const subject = `suspected irregularities in purchasing at ${institutionInProse(name)}`;
        return {
            id: `matter:ig:${institution}:graft:${event.eventId}`,
            causeId: event.eventId,
            origin: { kind: "inspector-general", institution },
            direction: "received", subject, openedTurn: campaign.turn,
            stage: "opened", public: false, obstructed: false,
            beats: [{ turn: campaign.turn, description: `The inspector general at ${institutionInProse(name)} opens an audit into ${subject}.` }],
        };
    }
    return undefined;
}
/** The institutions whose auditor is in post and has nothing running. */
function idleInspections(campaign) {
    return INSPECTED_INSTITUTIONS.filter((institution) => {
        if (!inspectorIsSeated(selectInspector(campaign, institution)))
            return false;
        return !selectMattersFor(campaign, institution).some(isMatterOpen);
    });
}
/**
 * The week the auditors take.
 *
 * One audit at a time per body, and at most one opened across the whole
 * government in a week — the worst-run agency first. Both caps are about what
 * the board is for: a president who has hollowed out nine departments should
 * watch the audits arrive one after another with time to answer each, not open
 * the room one morning to nine files and conclude the game has decided against
 * them.
 */
export const inspectorGeneralPhase = (state) => {
    const idle = idleInspections(state);
    const graftMatter = dueGraftMatter(state, idle);
    const candidates = idle
        .map((institution) => ({ institution, runtime: state.institutions[institution] }))
        .flatMap((entry) => (entry.runtime ? [{ ...entry, runtime: entry.runtime }] : []))
        .filter((entry) => auditWarrant(entry.runtime) >= AUDIT_OPENS_AT)
        .sort((a, b) => auditWarrant(b.runtime) - auditWarrant(a.runtime) || a.institution.localeCompare(b.institution));
    const worst = candidates[0];
    const completed = completedRemovals(state);
    if (!graftMatter && !worst && completed.length === 0)
        return [];
    const matter = graftMatter ?? (worst ? openedMatter(state, worst.institution, worst.runtime) : undefined);
    const effects = [
        {
            kind: "oversight",
            ...(matter ? { matters: [matter] } : {}),
            ...(completed.length > 0 ? { inspectors: completed } : {}),
        },
    ];
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: { summary: weekSummary(state, matter, completed) },
            effects,
        },
    ];
};
function weekSummary(campaign, matter, completed) {
    if (matter)
        return matter.beats[0].description;
    const first = completed[0];
    const name = institutionDef(first.institution)?.name ?? first.institution;
    const rest = completed.length > 1 ? ` ${completed.length - 1} more offices are emptied the same day.` : "";
    return `The thirty days run out, and the inspector general at ${institutionInProse(name)} leaves office.${rest}`;
}
/** The auditors whose notice period has run out this week. */
function completedRemovals(campaign) {
    return Object.values(campaign.oversight.inspectors)
        .filter((inspector) => inspector.removedTurn === undefined &&
        inspector.noticeFiledTurn !== undefined &&
        campaign.turn >= inspector.noticeFiledTurn + igRemovalNoticeTurns())
        .map((inspector) => ({ ...inspector, removedTurn: campaign.turn }));
}
export function projectInspectorRemoval(campaign, institution) {
    const institutionName = institutionDef(institution)?.name ?? institution;
    const openMatters = selectMattersFor(campaign, institution).filter(isMatterOpen);
    const obstructs = openMatters.length > 0;
    return {
        institution,
        institutionName,
        effectiveTurn: campaign.turn + igRemovalNoticeTurns(),
        openMatters,
        obstructs,
        reasoning: obstructs
            ? `The audit at ${institutionInProse(institutionName)} keeps going if you remove the inspector general. Removing them in the middle of it is what Congress will ask you about.`
            : `No audit is running at ${institutionInProse(institutionName)}. Removing the inspector general takes thirty days and goes on the record.`,
    };
}
/**
 * What removing an inspector general costs the Hill, before anything else.
 *
 * The same order as acting abroad without a vote and for the same reason:
 * Congress does not object to a president having a view about a personnel
 * decision, it objects to being handed one. The disposition hit is a one-off;
 * what persists is the matter this notice obstructs, which the Hill's own
 * reading of the administration goes on carrying for as long as it remembers it.
 */
const NOTICE_DISPOSITION_COST = 0.05;
const OBSTRUCTING_NOTICE_DISPOSITION_COST = 0.12;
/** What a notice that does not give the reasons the law requires adds: Congress was owed an explanation and did not get one. */
const DEFICIENT_NOTICE_DISPOSITION_COST = 0.06;
/** How far filing notice moves Congress. Obstructing a live audit costs more than a quiet office, and a deficient notice more again. */
export function inspectorNoticeCost(obstructs, deficient = false) {
    return (obstructs ? OBSTRUCTING_NOTICE_DISPOSITION_COST : NOTICE_DISPOSITION_COST) + (deficient ? DEFICIENT_NOTICE_DISPOSITION_COST : 0);
}
/** An account that states a conclusion and cites what it points at, where the callers hold only a sentence. */
export function conclusoryAccount(statement, matterId, turn) {
    return {
        ground: "loss-of-confidence",
        particulars: statement.trim() ? [{ matterId, turn, statement: statement.trim() }] : [],
    };
}
/**
 * The ways an account fails to be case-specific, judged on the records the
 * campaign holds and never on the words of a statement: a conclusory ground, a
 * particular citing no record that exists, conduct dated outside the
 * inspector's service, or conduct that is the audit the office exists to run.
 */
export function accountDefects(campaign, inspector, account) {
    const defects = new Set();
    if (account.ground === "loss-of-confidence")
        defects.add("conclusory");
    for (const particular of account.particulars) {
        const matter = campaign.oversight.matters.find((entry) => entry.id === particular.matterId);
        if (!matter)
            defects.add("no-such-record");
        else if (matter.origin.kind === "inspector-general" && matter.origin.institution === inspector.institution)
            defects.add("protected-audit");
        if (particular.turn < inspector.seatedTurn || particular.turn > campaign.turn)
            defects.add("outside-tenure");
    }
    return [...defects].sort();
}
function isAccount(value) {
    const candidate = value;
    return typeof value === "object" && candidate !== null && typeof candidate.ground === "string" && Array.isArray(candidate.particulars);
}
function noticeCongressEffect(campaign, cost) {
    return { kind: "congress", set: { ...campaign.congress, disposition: round3(clamp01(campaign.congress.disposition - cost)) } };
}
/**
 * File the written notice that empties an inspector general's office in thirty
 * days.
 *
 * Not a removal. The office is still occupied, the audit is still running, and
 * both stay that way for the whole notice period — which is the point of the
 * protection and the reason this returns a filing rather than a vacancy.
 *
 * The notice has to carry an account: a ground and the particulars of the
 * case. Without particulars there is no communication of reasons at all and
 * nothing is filed. With them, the campaign's own records decide whether the
 * account is case-specific, and a deficient one is filed on the record as
 * deficient and costs the Hill more. The statute gives the President the
 * removal and gives Congress the right to be told why, so the price of a thin
 * notice is the question it invites.
 */
export function fileInspectorRemovalNotice(campaign, institution, account) {
    const inspector = selectInspector(campaign, institution);
    if (!inspectorIsSeated(inspector)) {
        return { ok: false, reason: "There is no inspector general in that office to remove." };
    }
    if (inspector.noticeFiledTurn !== undefined) {
        return {
            ok: false,
            reason: `You have already moved to remove this inspector general; they leave in week ${inspector.noticeFiledTurn + igRemovalNoticeTurns()}.`,
        };
    }
    if (!isAccount(account) || account.particulars.length === 0) {
        return { ok: false, reason: "You have to state your reasons for removing the inspector general: a ground and the particulars of the case." };
    }
    const defects = accountDefects(campaign, inspector, account);
    const projection = projectInspectorRemoval(campaign, institution);
    const noticed = {
        ...inspector,
        noticeFiledTurn: campaign.turn,
        noticeReasons: [...inspector.noticeReasons, ...account.particulars.map((particular) => particular.statement)],
        ...(defects.length > 0 ? { noticeDeficiencies: defects } : {}),
    };
    const obstructed = projection.openMatters.map((matter) => obstruct(matter, campaign.turn, projection.institutionName));
    const deficient = defects.length > 0;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: `${leader(campaign)} files written notice of intent to remove the inspector general at ${institutionInProse(projection.institutionName)}. The office empties in thirty days.${deficient ? " The notice does not give the detailed, case-specific reasons the law requires." : ""}`,
            },
            effects: [
                { kind: "oversight", inspectors: [noticed], ...(obstructed.length > 0 ? { matters: obstructed } : {}) },
                noticeCongressEffect(campaign, inspectorNoticeCost(projection.obstructs, deficient)),
            ],
        },
    };
}
/**
 * What a notice does to an audit that is already running.
 *
 * It does not close it and does not slow it down. What it does is make it
 * public, permanently: a president moving against the person auditing them is
 * the kind of fact that does not stay inside the building, and the flag it sets
 * is one no later week can take back.
 */
function obstruct(matter, turn, institutionName) {
    return {
        ...matter,
        public: true,
        obstructed: true,
        beats: [
            ...matter.beats,
            {
                turn,
                description: `Notice to remove the inspector general at ${institutionInProse(institutionName)} is filed while this audit is open. The audit continues.`,
            },
        ],
    };
}
/** Every office a president could still move against, for the board that offers it. */
export function selectRemovableInspectors(campaign) {
    return INSPECTED_INSTITUTIONS.flatMap((institution) => {
        const inspector = selectInspector(campaign, institution);
        return inspectorIsSeated(inspector) && inspector.noticeFiledTurn === undefined ? [inspector] : [];
    });
}
