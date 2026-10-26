import { CORE_CONSEQUENCES, CORE_SCENARIOS, castStillBound, combinedPool, compileConsequences, deskOpen, stageFromResidentPool, stagingWarranted, memoryPool, scenarioOccurrenceKey, } from "@admin/content";
import { bundledCorpusScenarios } from "../content/bundled-corpus";
import { waitingReason } from "./labels";
import { hasOpenScenarioCase, openScenarioCasts, scenarioSettledToday, withScenarioCases, withWithdrawnScenarioCases } from "./scenario-cases";
// The decision on the player's desk comes from the scenario pool: authored
// packs, cast against the live board and drawn by weight. The shell holds no
// story of its own — a new pack changes what a month can be without a single
// screen edit.
//
// Three things mount here, in a fixed order of precedence, and that order is
// the whole delivery model. The core pack is authored source compiled into the
// app. The published corpus is baked in beside it, every shard of it, so the
// game a player gets on a plane with a cold install is the whole game rather
// than the eight scenarios that happen to live in TypeScript. Anything
// published since this build was cut arrives over the content manifest,
// verified against its digest, and is mounted on top.
//
// The order settles what happens when the same id turns up twice. The core
// pack always wins: it is authored source and cannot be republished out from
// under a build. Between the baked corpus and a delivered shard, delivery
// wins — a shard only travels at all when its published digest differs from
// the baked copy, which means it was republished after this build, and the
// republished copy is the one the corpus intends.
const AUTHORED_IDS = new Set(CORE_SCENARIOS.map((def) => def.id));
// Mutable because delivery is asynchronous and the desk is not. The draw reads
// whatever is mounted at the moment it runs; a shard that lands mid-session
// widens the pool from the next turn rather than interrupting this one.
let delivered = [];
let pool;
/**
 * The draw as it stands, built on first use.
 *
 * Lazy because building it parses the baked corpus, and doing that at module
 * load would put a few hundred scenarios' worth of work in front of the first
 * screen for no reason — nothing draws until the desk opens.
 */
function currentPool() {
    if (!pool) {
        const deliveredIds = new Set(delivered.map((def) => def.id));
        const baked = bundledCorpusScenarios().filter((def) => !AUTHORED_IDS.has(def.id) && !deliveredIds.has(def.id));
        pool = combinedPool([memoryPool(CORE_SCENARIOS), memoryPool(delivered), memoryPool(baked)]);
    }
    return pool;
}
/**
 * Mount everything delivery fetched, on top of what the binary carries.
 *
 * An id already authored into the core pack is dropped rather than mounted
 * twice, which would give it double the weight its author gave it.
 */
export function mountDeliveredScenarios(scenarios) {
    delivered = scenarios.filter((def) => !AUTHORED_IDS.has(def.id));
    pool = undefined;
}
/** How deep the desk's draw actually is, for anything that reports pool size. */
export function poolSize() {
    return currentPool().selectors.length;
}
// The aftermath pool, compiled once at module load rather than per commit: the
// cards are immutable data and the compile is a rename, so doing it on every
// reply would be work repeated for an identical answer. Remote packs will
// extend this the same way they extend the scenario pool.
export const BUNDLED_CONSEQUENCES = compileConsequences(CORE_CONSEQUENCES);
/**
 * Every decision this week has earned, most loaded first. Usually one; more on
 * a week the board genuinely stacks, which is what the pacing director decides
 * (`@admin/content`'s `scenario-director.ts`) rather than the desk.
 */
export function pendingConversations(campaign) {
    // A frozen case whose fire is out is not today's work, even before the next
    // advance closes it.
    if (hasOpenScenarioCase(campaign))
        return openScenarioCasts(campaign).filter((cast) => castStillBound(campaign, cast));
    if (scenarioSettledToday(campaign))
        return [];
    if (!deskOpen(campaign))
        return [];
    return stageFromResidentPool(campaign, currentPool());
}
/**
 * Freezes what the desk would stage today into cases, after closing any whose
 * subject is over. The same campaign comes back when nothing moved.
 *
 * It raises exactly what `pendingConversations` would show, so the desk-closed
 * week after an answer stays closed rather than seating the next draw.
 */
export function seatScenarioCases(campaign) {
    const current = withWithdrawnScenarioCases(campaign);
    if (hasOpenScenarioCase(current))
        return current;
    return withScenarioCases(current, pendingConversations(current));
}
/** The one the desk opens on. The rest of the week's staging waits behind it. */
export function pendingConversation(campaign) {
    return pendingConversations(campaign)[0];
}
/** The attention id a staged scenario is raised under, which is also what a deferral of it is keyed on. */
export function scenarioMatterId(scenarioId) {
    return `scenario:${scenarioId}`;
}
/**
 * The week's staged decisions, as a source the engine's advance can ask.
 *
 * The director is one voice among the sources that can stop a presidency, and
 * deliberately not the loudest: a bill on the desk and an authored crisis reach
 * the same composer and are ranked against each other there.
 *
 * A routine or serious pick the board did not earn is `ambient`. It still
 * reaches the desk — the folio is where a scenario is answered, and nothing
 * here withholds it — but it never competes for the three and it never stops
 * time. A critical pick is hard either way: Continue has to be able to find
 * it waiting and walk past it. With a corpus deep enough that something is
 * live essentially every week, treating every pick as a stop halts the run
 * after exactly one tick, forever.
 */
export function scenarioMatterSource(campaign, date) {
    return pendingConversations(campaign).map((cast) => {
        const warranted = stagingWarranted(campaign, cast.def.class);
        const urgency = cast.orderCase?.posture === "adverse-lower" || cast.def.severity === "critical" ? "hard" : warranted ? "soft" : "ambient";
        return {
            id: scenarioMatterId(scenarioOccurrenceKey(cast)),
            source: "scenario",
            urgency,
            // One stop per staged occurrence, and again only when it turns hard. The
            // id already names the occurrence, so a new episode is a new matter; an
            // unchanged decision still waiting a week later is the level the
            // President already knows about, exactly as a Desk row's signature reads
            // it (soft and ambient are one level there too).
            signature: urgency === "hard" ? "hard" : "open",
            title: cast.script.subject,
            reason: waitingReason(cast.def.severity, cast.def.class),
            // The class, not the scenario id: the director already refuses to stage
            // two decisions about one class in a week, and the composer refusing the
            // same collision is what keeps that rule true when a second source raises
            // the identical subject.
            subject: `scenario:${cast.def.class}`,
            date,
        };
    });
}
