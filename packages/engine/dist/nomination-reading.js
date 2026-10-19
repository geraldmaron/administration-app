import { selectPendingOnFloor } from "./nomination.js";
import { isTerminal } from "./nomination-stages.js";
export function selectPipelineReading(campaign) {
    const all = Object.values(campaign.nominations);
    const active = all.filter((nomination) => !isTerminal(nomination.stage));
    const executiveStages = ["shortlist", "vetting", "prepared", "nominated"];
    const committeeStages = [
        "referred",
        "disclosures",
        "hearing-scheduled",
        "hearing",
        "committee-action",
    ];
    const confirmed = all.filter((nomination) => nomination.stage === "confirmed" || nomination.stage === "sworn-in");
    const durations = confirmed
        .map((nomination) => {
        const seated = nomination.history.find((step) => step.stage === "confirmed");
        return seated ? seated.day - nomination.openedDay : undefined;
    })
        .filter((days) => days !== undefined)
        .sort((a, b) => a - b);
    return {
        total: all.length,
        inExecutive: active.filter((nomination) => executiveStages.includes(nomination.stage)).length,
        inCommittee: active.filter((nomination) => committeeStages.includes(nomination.stage)).length,
        onFloor: selectPendingOnFloor(campaign).length,
        confirmed: confirmed.length,
        failed: all.filter((nomination) => nomination.stage === "rejected" || nomination.stage === "returned" || nomination.stage === "withdrawn").length,
        medianDays: durations.length === 0 ? 0 : durations[Math.floor(durations.length / 2)],
    };
}
