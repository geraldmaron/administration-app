import { campaignDay, confirmationVote, institutionDef, nominationCommitteeName, selectActiveNominations, selectPerson, } from "@admin/engine";
import { withdrawalLever } from "../dossier/person-lever";
import { nominationStanding } from "../government/machine";
/** Every name before the Senate for a seat on the Court, oldest first. */
export function judicialNominations(campaign) {
    const today = campaignDay(campaign);
    return selectActiveNominations(campaign)
        .filter((nomination) => institutionDef(nomination.institution)?.kind === "judiciary")
        .sort((a, b) => a.openedDay - b.openedDay || a.id.localeCompare(b.id))
        .map((nomination) => {
        const withdrawal = withdrawalLever(campaign, nomination.id);
        const committee = nominationCommitteeName(nomination);
        return {
            id: nomination.id,
            office: nomination.office,
            title: institutionDef(nomination.institution)?.offices[0]?.title ?? "A seat on the Court",
            nomineeId: nomination.nominee,
            name: selectPerson(campaign, nomination.nominee)?.base.name ?? "The nominee",
            standing: nominationStanding(nomination),
            days: today - nomination.openedDay,
            ...(committee ? { committee } : {}),
            controversies: nomination.controversies,
            vote: confirmationVote(campaign, nomination.nominee),
            ...(withdrawal ? { withdrawal } : {}),
        };
    });
}
