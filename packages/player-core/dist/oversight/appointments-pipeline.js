import { institutionDef, INSTITUTION_CATALOG, REMOVAL_POLITICIZATION, REMOVAL_REINSTATEMENT_CHANCE, REMOVAL_SUIT_CHANCE, removeOfficer, selectRemovalExposures, selectActing, selectNominationForOffice, selectPerson, selectPipelineReading, selectVacancies, } from "@admin/engine";
import { packetCost } from "../dossier/person-lever";
import { formatRatio } from "../format/figures";
/** Every empty chair nobody has been sent up for yet, and the pipeline as a whole. */
export function vacancyBoard(campaign) {
    // The executive delivery selector excludes light circuit seats. They still
    // belong in the President's appointment queue once an active seat opens.
    const circuitVacancies = Object.values(campaign.institutions).filter((runtime) => runtime.vacancy && runtime.lowerBenchSeat);
    const open = [...selectVacancies(campaign), ...circuitVacancies].flatMap((runtime) => {
        const def = institutionDef(runtime.id);
        const office = def?.offices[0];
        if (!def || !office || selectNominationForOffice(campaign, office.id))
            return [];
        const acting = selectActing(campaign, office.id);
        const actingName = acting ? selectPerson(campaign, acting)?.base.name : undefined;
        return [{ institution: def.id, office: office.id, title: office.title, body: def.name, days: runtime.vacantDays, ...(actingName ? { acting: actingName } : {}) }];
    });
    return { open, pipeline: selectPipelineReading(campaign) };
}
/** The risk a removal from a protected commission seat carries, in plain words. */
export const CONTESTED_REMOVAL_WORDS = `You can remove them, with or without a reason. The law still protects this seat, so they will probably sue to get it back (about ${formatRatio(REMOVAL_SUIT_CHANCE)}). After Trump v. Slaughter, a court is unlikely to put them back (about ${formatRatio(REMOVAL_REINSTATEMENT_CHANCE)}).`;
/** Every officer below the cabinet the President could remove today, by body. A fixed term cannot be ended and is left off. */
export function removableOfficers(campaign) {
    return INSTITUTION_CATALOG.flatMap((def) => {
        const office = def.offices[0];
        const leader = campaign.institutions[def.id]?.leader;
        const holder = leader ? selectPerson(campaign, leader) : undefined;
        if (def.cabinetRole || !office || !holder?.alive || office.removal === "term-protected")
            return [];
        return [{ institution: def.id, title: office.title, body: def.name, holder: holder.base.name, holderId: holder.base.id, removal: office.removal,
                ...(office.removalContested ? { contested: CONTESTED_REMOVAL_WORDS } : {}) }];
    }).sort((a, b) => a.body.localeCompare(b.body));
}
/** The causes a for-cause office can be emptied for, each of which bends the body by its own amount. */
export const REMOVAL_CAUSES = Object.keys(REMOVAL_POLITICIZATION);
/** What removing this officer for this cause does, off the packet `removeOfficer` commits. */
export function removalTerms(campaign, institution, cause) {
    const result = removeOfficer(campaign, institution, cause);
    if (!result.ok)
        return { refusal: result.reason };
    const before = campaign.institutions[institution]?.politicization ?? 0;
    const change = result.packet.effects.find((effect) => effect.kind === "institution" && effect.changes?.politicization !== undefined);
    const after = change?.kind === "institution" ? (change.changes?.politicization ?? before) : before;
    return { ...(cause ? { cause } : {}), cost: packetCost(result.packet), politicization: { before, after } };
}
/** The removal itself, built on the campaign it is committed against. */
export function removalPacket(campaign, institution, cause) {
    const result = removeOfficer(campaign, institution, cause);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
const STAGE_WORDS = {
    threshold: "its first hearing", interim: "a request to be put back while the case runs", "lower-merits": "the trial court",
    "circuit-merits": "the appeals court", appeal: "a request for Supreme Court review", "supreme-merits": "the Supreme Court",
};
function suitStatus(campaign, exposure, caseId) {
    if (exposure.status === "exposed")
        return "deciding";
    if (exposure.status === "declined")
        return "declined";
    const ruled = caseId ? campaign.judiciary.cases.find((entry) => entry.id === caseId) : undefined;
    if (!ruled)
        return "in-court";
    if (ruled.holding === "upheld")
        return "removal-stands";
    return exposure.origin.kind === "removal" && campaign.institutions[exposure.origin.institution]?.leader === exposure.origin.person ? "reinstated" : "back-pay";
}
/** Every removal from a protected seat, and where the removed member's challenge stands. */
export function removalSuits(campaign) {
    return selectRemovalExposures(campaign).flatMap((exposure) => {
        if (exposure.origin.kind !== "removal")
            return [];
        const { institution, person } = exposure.origin;
        const def = institutionDef(institution);
        const member = selectPerson(campaign, person)?.base.name ?? "The removed member";
        const caseId = exposure.representations.find((entry) => entry.startsWith("removal:"));
        const stage = caseId ? campaign.judiciary.proceedings?.find((entry) => entry.id === caseId)?.stage : undefined;
        const status = suitStatus(campaign, exposure, caseId);
        const reading = status === "deciding" ? `${member} is deciding whether to sue. They will probably sue (about ${formatRatio(REMOVAL_SUIT_CHANCE)}), and a court is unlikely to put them back (about ${formatRatio(REMOVAL_REINSTATEMENT_CHANCE)}).`
            : status === "declined" ? `${member} did not sue. The removal stands.`
                : status === "in-court" ? `${member} is suing to get the seat back. The case is now at ${STAGE_WORDS[stage ?? "threshold"] ?? "the trial court"}.`
                    : status === "reinstated" ? `A court ruled the removal unlawful. ${member} is back in the seat, with back pay.`
                        : status === "back-pay" ? `A court ruled the removal unlawful. The seat could not be returned, so ${member} gets back pay.`
                            : `A court let the removal stand. ${member} does not get the seat back.`;
        return [{ institution, body: def?.name ?? institution, title: def?.offices[0]?.title ?? "Officer", member, status, reading, ...(caseId ? { caseId } : {}) }];
    }).sort((a, b) => a.body.localeCompare(b.body) || a.member.localeCompare(b.member));
}
