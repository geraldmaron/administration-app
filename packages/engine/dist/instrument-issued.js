import { assessStrikeSite, withStrikeAssessment } from "./strike-assessment.js";
import { answerSupportRequests, issueSupportRequests } from "./action-support.js";
import { rungBand } from "./consequences.js";
import { likelihoodFromUnitInterval } from "./assessments.js";
import { strikesByMissile } from "./instrument-gates.js";
import { addDays, compareDates } from "./clock.js";
import { apply } from "./effects.js";
import { actionTiming } from "./action-timing.js";
import { specAgainst, specForRung } from "./force-packages.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { projectAction, resolveAction } from "./resolution.js";
const pending = (act) => act.status === "issued" || act.status === "in-progress" || act.status === "awaiting-response";
export function outstandingInstrumentActs(campaign) {
    return Object.values(campaign.issuedActs ?? {}).filter((act) => act.kind === "instrument" && pending(act));
}
/** Issue separately from execution. Escrow and force reservations survive saves. */
export function issueAction(campaign, request, streams, source = "action", extras) {
    const timing = actionTiming(campaign, request);
    if (!timing.days)
        return resolveAction(campaign, request, streams, source, extras);
    const duplicate = outstandingInstrumentActs(campaign).some((act) => act.request.actor === request.actor && act.request.target === request.target && act.request.instrument === request.instrument);
    if (duplicate)
        return { ok: false, reason: "An operation is already pending here.", missingCapability: "Complete or stand down the outstanding operation first." };
    const missile = request.instrument === "military" && request.rung === 4 && strikesByMissile({ campaign, actor: request.actor, target: request.target, streams });
    const base = request.instrument === "military" && !missile ? specForRung(request.rung) : undefined;
    const spec = base ? specAgainst(campaign, request.target, base) : undefined;
    // The proposal is recomputed here rather than taken from the request, so
    // the scale an order is billed and resolved at is always the staff's size
    // for this target, never a figure a caller supplied.
    const force = request.force
        ? { ...request.force, ...(spec ? { preferred: spec.preferred } : {}) }
        : spec ? { branch: spec.branch, unitType: spec.unitType, count: spec.preferred, preferred: spec.preferred } : undefined;
    // Priced on the same normalized package the act will resolve at, so the
    // escrow reserved now is the bill execution charges.
    const siteAssessment = assessStrikeSite(campaign, request);
    const normalized = withStrikeAssessment(campaign, { ...request, ...(force ? { force } : {}) });
    const projected = projectAction(campaign, normalized, streams);
    if (!projected.ok)
        return projected;
    const reservedTreasury = request.actor === campaign.founding.nation ? Math.max(0, -(projected.projection.cost.treasury ?? 0)) : 0;
    if (reservedTreasury > campaign.player.metrics.treasury)
        return { ok: false, reason: "Insufficient budget authority.", missingCapability: "Budget authority to reserve this operation's cost." };
    const act = {
        kind: "instrument", id: `instrument:${campaign.ledger.length}:${request.actor}:${request.target}:${request.instrument}:${request.rung}`,
        status: "in-progress", issuedTurn: campaign.turn, issuedDate: campaign.calendar,
        dueDate: addDays(campaign.calendar, timing.days), request: normalized,
        supportRequests: issueSupportRequests(campaign, normalized),
        title: `${projected.projection.rungName} · ${campaign.nations[request.target]?.base.identity.name ?? request.target}`,
        reservedTreasury, chance: projected.projection.successChance,
        ...(extras?.consequences ? { aftermath: extras.consequences.filter((card) => card.instrument === request.instrument && card.rungBands.includes(rungBand(request.rung))) } : {}),
        ...(extras?.context ? { context: extras.context } : {}),
        forecast: { likelihood: likelihoodFromUnitInterval(projected.projection.successChance), confidence: "moderate", confidenceBasis: "Current capabilities and access; reassessed at execution.", supporting: "Current force and counterpart conditions.", uncertainty: "Conditions may change before execution.", source: "Operational planning", asOf: campaign.calendar },
    };
    return { ok: true, pending: true, projection: projected.projection, packet: {
            source, actor: request.actor === campaign.founding.nation ? "player" : "world", turn: campaign.turn,
            narration: { summary: `${act.title} ordered. Preparation is underway; no operational outcome has been reported. ${normalized.support?.mode === "seek" ? "Partner participation has been requested and remains unconfirmed." : "No partner contribution is assumed."} ${normalized.civilianProtection === "additional-assessment" ? "Additional civilian assessment is required before execution. " : ""}${timing.label}.` },
            provenance: { origin: "decision", entities: [request.actor, request.target], systems: ["statecraft", request.instrument], effectiveDate: campaign.calendar, ...(timing.pace ? { decision: timing.pace.decision } : {}) },
            effects: [{ kind: "issuedAct", set: act }, ...(siteAssessment ? [{ kind: "assessment", siteIssue: siteAssessment }] : []), ...(reservedTreasury ? [{ kind: "metric", deltas: { treasury: -reservedTreasury } }] : [])],
        } };
}
/** A pending order can be recalled; completed operations cannot be undone. */
export function withdrawInstrumentAct(campaign, id) {
    const act = campaign.issuedActs?.[id];
    if (!act || act.kind !== "instrument" || !pending(act) || act.request.actor !== campaign.founding.nation)
        return { ok: false, missingCapability: "That operation is no longer awaiting execution." };
    return { ok: true, packet: {
            source: "action", actor: "player", turn: campaign.turn,
            narration: { summary: `${act.title} stood down before execution. Reserved budget authority and forces are released.` },
            effects: [{ kind: "issuedAct", set: { ...act, status: "withdrawn" } }, { kind: "metric", deltas: { treasury: act.reservedTreasury } }],
        } };
}
function executionState(campaign, act) {
    // Only the resolver sees the escrow restored and its own reservation removed.
    // The resulting packet is applied to the actual campaign, never this view.
    return { ...campaign, issuedActs: { ...campaign.issuedActs, [act.id]: { ...act, status: "resolved" } }, player: { ...campaign.player, metrics: { ...campaign.player.metrics, treasury: campaign.player.metrics.treasury + act.reservedTreasury } } };
}
export function resolveDueInstruments(campaign) {
    let working = campaign;
    const packets = [];
    for (const act of outstandingInstrumentActs(working)) {
        const responses = answerSupportRequests(working, act);
        if (responses.every((response, index) => response === act.supportRequests?.[index]))
            continue;
        const packet = { source: "simulate", actor: "world", turn: working.turn,
            narration: { summary: `${act.title}: ${responses.filter((response) => response.status !== "pending").map((response) => `${response.name} ${response.status}`).join("; ")}.` },
            effects: [{ kind: "issuedAct", set: { ...act, supportRequests: responses } }] };
        packets.push(packet);
        working = apply(working, packet);
    }
    const due = outstandingInstrumentActs(working).filter((act) => compareDates(campaign.calendar, act.dueDate) >= 0).sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.id.localeCompare(b.id));
    for (const act of due) {
        const live = executionState(working, act);
        let result = resolveAction(live, act.request, createRngStreams(makeCampaignSeed(`${campaign.seed}:${act.id}`)), "simulate", { consequences: act.aftermath, context: act.context });
        if (result.ok && act.request.actor === working.founding.nation && Math.max(0, -(result.projection.cost.treasury ?? 0)) > live.player.metrics.treasury)
            result = { ok: false, reason: "Execution cost exceeds available authority", missingCapability: "sufficient budget authority at execution" };
        const supportAccount = act.supportRequests?.length ? ` Partner responses: ${act.supportRequests.map((response) => `${response.name} ${response.status}`).join("; ")}.` : "";
        const summary = result.ok ? result.packet.narration.summary + supportAccount : `${act.title} did not execute: ${result.missingCapability}. Reserved funds and forces released.`;
        const closed = { ...act, ...(result.ok ? { chance: result.projection.successChance } : {}), status: result.ok ? "reported" : "expired", outcome: { landed: result.ok && result.success, account: summary, ...(result.ok && result.civilianCasualties ? { civilianCasualties: result.civilianCasualties } : {}) } };
        const packet = {
            ...(result.ok ? result.packet : {}), source: "simulate", actor: act.request.actor === campaign.founding.nation ? "player" : "world", turn: working.turn,
            narration: { summary },
            provenance: { ...(result.ok ? result.packet.provenance : {}), origin: "scheduled", causeIds: [act.causedBy ?? act.id], entities: [act.request.actor, act.request.target], systems: ["statecraft", act.request.instrument], effectiveDate: working.calendar },
            effects: [
                ...(act.reservedTreasury ? [{ kind: "metric", deltas: { treasury: act.reservedTreasury } }] : []),
                ...(result.ok ? result.packet.effects.map((effect) => effect.kind === "impactEvent" ? { ...effect, event: { ...effect.event, spec: { ...effect.event.spec, parentId: effect.event.spec.parentId ?? act.id } } } : effect) : []),
                { kind: "issuedAct", set: closed },
                { kind: "feed", items: [{ turn: working.turn, kind: "player-action", visibility: act.request.instrument === "covert" ? "intelligence" : "public", actor: act.request.actor, target: act.request.target, headline: summary, date: working.calendar, facts: { instrument: act.title, phase: "over" } }] },
            ],
        };
        packets.push(packet);
        working = apply(working, packet);
    }
    return { campaign: working, packets };
}
