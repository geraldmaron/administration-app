// The money family's second half: a reply that states its own arithmetic is
// held to the band it declares, since the band is how the money is authorized
// and the arithmetic is how much it is.
import { bandCenterForUs, financialCenterForUs } from "./scenario-cost.js";
function make(kind, severity, scenario, message) {
    return { kind, severity, scenario, message };
}
/** How far a stated basis may sit from its band's anchor before the band reads as the wrong door. */
export const BASIS_BAND_TOLERANCE = 10;
function money(usdMillions) {
    return usdMillions >= 1000 ? `$${(usdMillions / 1000).toFixed(1)} billion` : `$${usdMillions.toFixed(1)} million`;
}
/**
 * A basis with no band, or a basis an order of magnitude away from its band's
 * anchor. Four hundred drivers paid for six months of waiting is a few million
 * dollars; declared `supplemental`, it says Congress voted a city's water
 * system for it. The warning names the band whose anchor is nearest.
 */
export function auditFinancialBasis(def, findings) {
    for (const reply of def.replies) {
        if (reply.commitment.kind !== "position")
            continue;
        const financial = reply.commitment.impact?.financial;
        if (!financial?.basis)
            continue;
        if (!financial.scale || financial.scale === "none") {
            findings.push(make("financial-basis-without-band", "error", def.id, `reply "${reply.id}" states what its money is for but no band says how it is authorized. ` +
                'Add a scale: "discretionary" if the executive can move it alone, "supplemental" or "emergency" if Congress must vote it'));
            continue;
        }
        if (!financial.basis.coverage)
            findings.push(make("financial-basis-incomplete", "error", def.id, `reply "${reply.id}" must state which federal costs its basis includes and excludes; one grant is not the complete federal cost`));
        const stated = financialCenterForUs(reply.commitment.impact, def.severity);
        const anchor = bandCenterForUs(financial.scale, def.severity);
        const ratio = stated / anchor;
        if (ratio > BASIS_BAND_TOLERANCE || ratio < 1 / BASIS_BAND_TOLERANCE) {
            const nearest = ["discretionary", "supplemental", "emergency", "structural"]
                .map((scale) => ({ scale, gap: Math.abs(Math.log(stated / bandCenterForUs(scale, def.severity))) }))
                .sort((a, b) => a.gap - b.gap)[0].scale;
            findings.push(make("financial-basis-off-band", "warning", def.id, `reply "${reply.id}" states ${money(stated)} (${financial.basis.quantity} ${financial.basis.unit}) but declares "${financial.scale}", ` +
                `whose ${def.severity} anchor is ${money(anchor)}. The nearest band is "${nearest}": check how this money is really authorized`));
        }
    }
}
