import { selectActiveConflicts, selectObligations, sideOf } from "@admin/engine";
import { anchored } from "../navigation/places";
import { subjectHref, subjectHrefWith } from "../shell/subject";
import { paperOf } from "./war-screen";
// The War Powers paper on force against one government is acted on where that
// force is: the war it belongs to, or, where no war is running, that
// government's own security view. Every surface that points at a War Powers
// matter (the Desk row, the clock brief, the counsel, the Congress notices and
// the Security ledger) asks here, so none of them lands the President on a
// page that has dropped the subject they clicked.
/** The element id of the War Powers section on the war screen and the country file. */
export const WAR_POWERS_ANCHOR = "war-powers";
/** The live war in which the United States and the target fight on opposite sides. */
export function warAgainst(campaign, target) {
    const us = campaign.founding.nation;
    return selectActiveConflicts(campaign).find((conflict) => {
        const ours = sideOf(conflict, us);
        const theirs = sideOf(conflict, target);
        return ours !== undefined && theirs !== undefined && ours !== theirs;
    });
}
/** Where the President files, extends, asks Congress about, or ends the force committed against one government. */
export function warPowersHome(campaign, target) {
    const war = warAgainst(campaign, target);
    const base = war ? subjectHref({ kind: "war", id: war.id }) : subjectHrefWith({ kind: "nation", id: target }, { view: "security" });
    return anchored(base, WAR_POWERS_ANCHOR);
}
/** The War Powers paper on force against one government, for that government's own file. */
export function countryWarPowers(campaign, target) {
    const papers = selectObligations(campaign)
        .filter((obligation) => obligation.target === target && !obligation.terminated)
        .map((obligation) => paperOf(campaign, obligation))
        .filter((paper) => paper.report === "Owed" || paper.report === "Missed" || paper.withdrawal !== undefined);
    const war = warAgainst(campaign, target);
    return { papers, ...(war ? { war: anchored(subjectHref({ kind: "war", id: war.id }), WAR_POWERS_ANCHOR) } : {}) };
}
