import { apply } from "./effects.js";
import { compareDates } from "./clock.js";
import { outstandingMemberOutreach, resolveMemberOutreach } from "./member-outreach.js";
import { resolveIssuedLobbying } from "./lobbying.js";
// The plays waiting on an answer, and the pass that answers the ones come due.
export function dueIssuedLobbyActs(campaign) {
    return Object.values(campaign.issuedActs ?? {})
        .filter((act) => act.kind === "lobby" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress") &&
        compareDates(campaign.calendar, act.dueDate) >= 0)
        .sort((a, b) => a.id.localeCompare(b.id));
}
/** Every Hill play still waiting on a counterpart, whether or not it is due. */
export function outstandingIssuedLobbyActs(campaign) {
    return Object.values(campaign.issuedActs ?? {})
        .filter((act) => act.kind === "lobby" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"))
        .sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.id.localeCompare(b.id));
}
/**
 * Apply every Hill play that has come due, in id order, each packet seeing the
 * state the one before it wrote. New acts created during a resolution that are
 * themselves due today are picked up on a later look, not in this pass.
 */
export function resolveDueLobbying(campaign) {
    const due = dueIssuedLobbyActs(campaign);
    const packets = [];
    let working = campaign;
    for (const act of due) {
        const result = resolveIssuedLobbying(working, act.id);
        if (!result.ok) {
            const current = working.issuedActs?.[act.id];
            if (current && result.reason.includes("empty")) {
                const packet = {
                    source: "action",
                    actor: "player",
                    turn: working.turn,
                    narration: { summary: `The play lapses: nobody holds the seat.` },
                    effects: [{ kind: "issuedAct", set: { ...current, status: "expired" } }],
                    provenance: { origin: "scheduled", causeIds: [act.id], systems: ["congress"] },
                };
                packets.push(packet);
                working = apply(working, packet);
            }
            continue;
        }
        packets.push(result.packet);
        working = apply(working, result.packet);
    }
    for (const act of outstandingMemberOutreach(working).filter((entry) => compareDates(working.calendar, entry.dueDate) >= 0)) {
        const result = resolveMemberOutreach(working, act.id);
        if (result.ok) {
            packets.push(result.packet);
            working = apply(working, result.packet);
        }
    }
    return { campaign: working, packets };
}
