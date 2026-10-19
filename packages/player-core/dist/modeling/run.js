import { campaignTurnPhases, projectRun } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { scenarioLapseSource } from "../conversation/lapse-source";
import { scenarioStagingSource } from "../conversation/staging-source";
import { seatScenarioCases } from "../conversation/scripts";
import { seatFamilyCases } from "../desk/family-cases";
import { modelingChoice } from "./choices";
import { forecastSource } from "./forecast";
// The advance a projection runs is the one the campaign store runs on Continue:
// the same phase list, the same staging and lapse sources, the same case
// seating. A projection that ran a lighter week would forecast a game nobody
// plays. What it leaves out is the President: no further decision is taken in
// any run, so the paths differ by the choice and by the world's own draws.
export function modelingAdvance(campaign) {
    return {
        advance: {
            phases: campaignTurnPhases(charterOf(campaign), true),
            stagingSources: [scenarioStagingSource()],
            lapseSources: [scenarioLapseSource()],
        },
        settle: (state) => seatFamilyCases(seatScenarioCases(state)),
    };
}
/**
 * Runs a request's jobs in order. Kept to a spec and ids rather than to the
 * alternatives themselves, so a worker that holds its own copy of the campaign
 * can rebuild the choice and run its share without a function crossing a
 * thread boundary.
 */
export function runModelingJobs(campaign, request, onWeek) {
    const choice = modelingChoice(campaign, request.spec);
    if (!choice)
        throw new Error("This choice is no longer pending, so there is nothing to model.");
    const around = modelingAdvance(campaign);
    // A staff forecast in normal play, the truth only in God Mode: the worker derives the same basis the page labels.
    const { basis } = forecastSource(campaign, request.spec);
    return request.jobs.map((job) => {
        const alternative = choice.alternatives.find((entry) => entry.id === job.alternative);
        if (!alternative)
            throw new Error(`The choice has no alternative "${job.alternative}".`);
        return projectRun(campaign, alternative, { ...around, basis, weeks: request.weeks, member: job.member, onWeek: (week) => onWeek?.(job, week) });
    });
}
