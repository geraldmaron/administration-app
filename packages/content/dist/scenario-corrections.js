import { castBound } from "./scenario-cast.js";
/** Repair the open port-fire snapshot's pricing, casualty accounting and timed commitment. */
export function repairLegacyScenarioPrice(campaign, cast) {
    if (cast.def.id !== "the-cargo-fire-at-dawn")
        return cast;
    const needsRepair = cast.def.replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.impact?.financial?.scale === "emergency" && (reply.commitment.impact.financial.scope !== "city" || reply.commitment.impact.human?.accounting !== "already-reported"));
    if (!needsRepair)
        return cast;
    const def = { ...cast.def, replies: cast.def.replies.map((reply) => {
            const commitment = reply.commitment;
            if (commitment.kind !== "position" || !commitment.impact?.financial)
                return reply;
            return { ...reply, commitment: { ...commitment,
                    ...(reply.id === "restrict-their-cargo-pending-findings" ? { importSuspensionDays: 60,
                        remembered: "The President suspended incoming cargo for sixty days while investigators work. The cause remains unconfirmed.",
                        rejoinder: { ...commitment.rejoinder, text: "The incoming-cargo suspension is being issued for sixty days. American exports remain legally open, but shipping capacity may be disrupted. Investigators have not established the cause." },
                    } : { rejoinder: { ...commitment.rejoinder, text: "Recovery crews are being assigned. Reopening depends on the fire service clearing the site; the cause remains unconfirmed." } }), impact: { ...commitment.impact, financial: { ...commitment.impact.financial, scope: "city" }, human: { ...commitment.impact.human, accounting: "already-reported" } } } };
        }) };
    const priced = castBound(campaign, def, cast.counterpart);
    const options = cast.script.options.map((option) => {
        const commitment = option.commitment;
        const replacement = priced.script.options.find((reply) => reply.id === option.id)?.commitment;
        if (commitment.kind !== "position" || replacement?.kind !== "position")
            return option;
        const borrowing = (replacement.resolved ?? []).filter((effect) => effect.kind === "choiceBorrowing");
        const resolved = [...(commitment.resolved ?? []).filter((effect) => effect.kind !== "choiceBorrowing" && effect.kind !== "populationToll" && !(effect.kind === "nationStat" && effect.setStats?.demography?.population !== undefined)), ...borrowing];
        return { ...option, commitment: { ...commitment, remembered: replacement.remembered, rejoinder: replacement.rejoinder, ...(replacement.importSuspensionDays ? { importSuspensionDays: replacement.importSuspensionDays } : {}), resolved } };
    });
    return { ...cast, def, script: { ...cast.script, options } };
}
