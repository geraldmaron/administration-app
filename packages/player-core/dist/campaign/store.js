import { advanceUntilAttention, apply, campaignFoundingDate, campaignTurnPhases, deferUntil, isDeferred, selectEnding, } from "@admin/engine";
import { charterOf } from "./founding-options";
import { stopBriefOf } from "./stop-brief";
/** The sitting as the store wrote it; anything else on the key is dropped rather than shown. */
function isStopBrief(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const candidate = value;
    return typeof candidate.fromTurn === "number" && typeof candidate.toTurn === "number" && typeof candidate.stop === "object" && Array.isArray(candidate.ambient) && typeof candidate.before === "object" && typeof candidate.after === "object";
}
import { inactionPacket, scenarioOccurrenceKey } from "@admin/content";
import { withHeldRemoval } from "../conversation/docket-removal";
import { scenarioPutOffEffects } from "../conversation/scenario-dispositions";
import { chargedThisWeek, docketSilenced, scenarioLapseSource } from "../conversation/lapse-source";
import { scenarioStagingSource } from "../conversation/staging-source";
import { pendingConversations, scenarioMatterId, scenarioMatterSource, seatScenarioCases } from "../conversation/scripts";
import { seatFamilyCases } from "../desk/family-cases";
import { handOff } from "./hand-off";
import { isQuotaExhausted, playerFacingStorageFailure } from "../persistence/storage-failure";
/** The sentence a stale packet is refused with; `isStaleAct` matches it. */
export const STALE_ACT_MESSAGE = "Things changed while you were deciding, so nothing went through. Take another look when you're ready.";
/** True when a refusal is the stale-basis guard rather than the engine or the charter. */
export function isStaleAct(error) {
    const text = error instanceof Error ? error.message : String(error);
    return text === STALE_ACT_MESSAGE;
}
/**
 * Why the world will not run another week, in the words of the ending that
 * stopped it.
 *
 * One sentence per ending rather than one for all three: "the campaign is over"
 * is true of a removal, a defeat and a second term served out, and it is the
 * least a player is owed about which of them happened to them.
 */
const ENDED_REFUSALS = {
    removed: "You were removed from office. Your time as President is over.",
    defeated: "You lost the election. Your time as President is over.",
    "term-limited": "You served both of your terms. Your time as President is over.",
};
/**
 * The ledger events one transition appended. `apply()` grows the ledger by one
 * record per packet and stamps each with its causal id, so the new tail is
 * exactly what the act wrote.
 */
function eventIdsBetween(before, after) {
    return after.ledger.slice(before.ledger.length).flatMap((entry) => (entry.causal ? [entry.causal.eventId] : []));
}
/** Outer restore deadline — must exceed IndexedDB open demotion. */
const RESTORE_BUDGET_MS = 10_000;
function withBudget(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Restoring the campaign took too long on this device."));
        }, ms);
        promise.then((value) => {
            clearTimeout(timer);
            resolve(value);
        }, (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
/**
 * The week's staged documents, put off to the next time they may interrupt.
 *
 * Silence is this week's answer to them, and the deferral is what makes it the
 * answer. Without it the advance's pre-tick look found the same staged document
 * still on the desk and stopped at day zero: every press of Continue charged
 * the same silence again and the week never moved. The engine sets the date,
 * a week for a hard matter and a fortnight for a soft one, as it does for a
 * matter the President puts off by hand.
 */
function silencePutOff(campaign) {
    const foundingDate = campaignFoundingDate(campaign);
    const casts = new Map(pendingConversations(campaign).map((cast) => [scenarioMatterId(scenarioOccurrenceKey(cast)), cast]));
    return new Map(scenarioMatterSource(campaign, campaign.calendar)
        .filter((matter) => matter.urgency !== "ambient" && !isDeferred(campaign.deferrals, matter.id, campaign.calendar))
        .map((matter) => {
        const until = deferUntil(matter, campaign.calendar, foundingDate);
        // The same silence, said to the case as well: a scenario matter and its
        // case are one document, and a deferral only one of them records leaves
        // the other believing it is still today's work.
        const cast = casts.get(matter.id);
        const onCases = cast ? scenarioPutOffEffects(campaign, cast, until) : [];
        return [matter.id, [{ kind: "attention", defer: { [matter.id]: until } }, ...onCases]];
    }));
}
/**
 * Prices the documents already waiting, then puts off any document that
 * pricing itself brought onto the desk.
 *
 * The charge can change what the director stages. The opening look runs on
 * that later desk. A document that was not there when the charge was computed
 * is not in the put-off, and the look then stops on it before the week moves.
 */
function priceWalkedPast(campaign) {
    const unanswered = pendingConversations(campaign).filter((cast) => cast.orderCase?.posture !== "adverse-lower" &&
        !isDeferred(campaign.deferrals, scenarioMatterId(scenarioOccurrenceKey(cast)), campaign.calendar) &&
        !chargedThisWeek(campaign, scenarioOccurrenceKey(cast)) &&
        // A document the held docket already charged at its close is not billed a
        // second time here. Only the charge is skipped — the deferral below still
        // runs, or a hard document left pending would stall the week at day zero.
        !docketSilenced(campaign, scenarioOccurrenceKey(cast)));
    const putOff = silencePutOff(campaign);
    const priced = unanswered.reduce((opening, cast) => {
        const packet = inactionPacket(opening, cast);
        const effects = [...packet.effects, ...(putOff.get(scenarioMatterId(scenarioOccurrenceKey(cast))) ?? [])];
        return apply(opening, { ...packet, effects });
    }, campaign);
    return holdSwappedPicks(priced);
}
function holdSwappedPicks(campaign) {
    const effects = [...silencePutOff(campaign).values()].flat();
    if (effects.length === 0)
        return campaign;
    return apply(campaign, {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        background: true,
        narration: { summary: "A document that came up with the silence waits for its next call." },
        effects,
    });
}
export function createCampaignStore({ saves, phases = (charter) => campaignTurnPhases(charter, true), onFirstPlayable, matterSources = [], seedWhenEmpty, }) {
    let state = { status: "loading" };
    const listeners = new Set();
    let announcedPlayable = false;
    function publish(next) {
        if (next.status === "ready" && !announcedPlayable) {
            announcedPlayable = true;
            onFirstPlayable?.();
        }
        state = next;
        for (const listener of listeners)
            listener();
        return state;
    }
    function requireCampaign(basis) {
        if (state.status !== "ready") {
            throw new Error(`No campaign is in play: the store is "${state.status}".`);
        }
        if (basis !== undefined && basis !== state.campaign) {
            throw new Error(STALE_ACT_MESSAGE);
        }
        return state.campaign;
    }
    function carriedStop() {
        // Answering a document is not running the world: the stop stays
        // revisitable across it, carried forward rather than dropped the moment
        // any packet applies.
        return state.status === "ready"
            ? {
                stop: state.stop,
                stopReason: state.stopReason,
                ambient: state.ambient,
                brief: state.brief,
                briefAcknowledged: state.briefAcknowledged,
            }
            : {};
    }
    // One set of day sources for both ways time is spent, so a press of Continue
    // and a running clock admit and lapse the same documents on the same day.
    function advanceOptions(campaign) {
        return {
            phases: phases(charterOf(campaign)),
            stagingSources: [scenarioStagingSource()],
            lapseSources: [scenarioLapseSource()],
        };
    }
    function refuseEnded(campaign) {
        const ending = selectEnding(campaign);
        if (ending !== "in-office")
            throw new Error(ENDED_REFUSALS[ending]);
    }
    async function runFrom(before, start, horizonDays) {
        // The week's decision is frozen before it is priced, so the document the
        // silence is charged against is the one the desk will still be holding
        // next week rather than whatever the next draw happens to produce.
        const opening = priceWalkedPast(seatFamilyCases(seatScenarioCases(start)));
        const run = advanceUntilAttention(opening, {
            ...advanceOptions(opening),
            matterSources,
            ...(horizonDays === undefined ? {} : { horizonDays }),
        });
        // What the run brought onto the desk is on the case registry before it is
        // saved, and what the run settled is closed there.
        const result = { ...run, campaign: seatFamilyCases(run.campaign) };
        const brief = stopBriefOf(before, result);
        publish({
            status: "ready",
            campaign: result.campaign,
            stop: result.stop,
            stopReason: result.stopReason,
            ambient: result.ambientEvents,
            brief,
        });
        const receipt = await persist(result.campaign, eventIdsBetween(before, start));
        // The sitting is written only once the campaign it belongs to is on the
        // device; a brief for a run the device never kept would describe a
        // world the reload does not hold.
        if (receipt.persisted)
            await saves.writeSitting(brief);
        return receipt;
    }
    async function persist(campaign, eventIds) {
        try {
            await saves.write(campaign);
            return { eventIds, persisted: true };
        }
        catch (err) {
            return { eventIds, persisted: false, saveError: playerFacingStorageFailure(err) };
        }
    }
    async function restore() {
        try {
            // Phone web has hung forever on a stuck IndexedDB open; the vault layer
            // demotes after a short open timeout, and this outer budget is the last
            // line so RESTORING CAMPAIGN cannot spin past a playable deadline.
            const campaign = await withBudget(saves.read(), RESTORE_BUDGET_MS);
            if (!campaign) {
                const seeded = seedWhenEmpty?.() ?? null;
                if (!seeded)
                    return publish({ status: "empty" });
                // Prefer a durable seed so reload keeps the session. When the vault
                // cannot hold it (phone web demoted off IndexedDB onto a ~5MB
                // localStorage quota facing a ~6MB campaign), still open Desk with the
                // seeded campaign in memory — RESTORE FAILED is worse than a session
                // that only lasts until refresh.
                try {
                    await saves.write(seeded);
                }
                catch (err) {
                    if (!isQuotaExhausted(err))
                        throw err;
                }
                return publish({ status: "ready", campaign: seeded });
            }
            // Restoring advances NOTHING. This used to read the wall clock, convert
            // elapsed hours into drift steps and run them — which moved
            // `campaign.calendar`, so four days away spent fifty-six days of a fixed
            // four-year term while running three of the thirty-one phases. A
            // presidency could be run out by closing a laptop.
            //
            // Real time is no longer a currency the world accepts. The only thing
            // that buys world time is a player present and pressing Continue, which
            // is why restoring a save advances nothing: there is no banked absence to
            // spend, because absence accrues none.
            //
            // What the world did the last time it ran is still readable after a
            // reload: the sitting comes back with the campaign, already acknowledged
            // so the Desk does not route to it again.
            const sitting = await saves.readSitting();
            const brief = isStopBrief(sitting) ? sitting : undefined;
            return publish({ status: "ready", campaign, ...(brief ? { brief, briefAcknowledged: true } : {}) });
        }
        catch (err) {
            return publish({ status: "failed", message: playerFacingStorageFailure(err) });
        }
    }
    return {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        restore,
        async begin(campaign) {
            // Founding always opens a *new* slot. Routed through `saves.write` this
            // wrote over whichever campaign the manifest had marked active, so
            // taking office beside a save the build could not read destroyed that
            // save — the one outcome a player who asked to form a new
            // administration never asked for. `create` appends and promotes, so the
            // unreadable campaign stays listed and repairable in Administrations.
            //
            // The write lands before the campaign is published: publishing first
            // put the app into a term the device had not accepted yet, so a refused
            // write left the oath printing a failure while every other screen had
            // already moved in. Nothing is in play until something is stored.
            await saves.create(campaign);
            publish({ status: "ready", campaign });
        },
        async commit(packet, options) {
            const current = requireCampaign(options?.basis);
            // An act can settle a family's matter (a signature, a withdrawal); the
            // case closes in the same save rather than at the next run.
            const acted = apply(current, withHeldRemoval(current, packet));
            const next = seatFamilyCases(acted);
            publish({ status: "ready", campaign: next, ...carriedStop() });
            return persist(next, eventIdsBetween(current, acted));
        },
        async commitAll(packets, onProgress, options) {
            const current = requireCampaign(options?.basis);
            if (packets.length === 0)
                return { eventIds: [], persisted: true };
            let next = current;
            for (let index = 0; index < packets.length; index += 1) {
                next = apply(next, withHeldRemoval(next, packets[index]));
                onProgress?.(index + 1);
            }
            const seated = seatFamilyCases(next);
            publish({ status: "ready", campaign: seated, ...carriedStop() });
            return persist(seated, eventIdsBetween(current, next));
        },
        async retrySave() {
            const campaign = requireCampaign();
            return persist(campaign, []);
        },
        acknowledgeBrief() {
            if (state.status !== "ready" || !state.brief || state.briefAcknowledged)
                return;
            publish({ ...state, briefAcknowledged: true });
        },
        async continueUntilAttention(horizonDays, options) {
            const campaign = requireCampaign(options?.basis);
            // A presidency that has ended has no next week, whichever way it ended.
            // Refusing here rather than letting the run start is what makes an ending
            // an ending: every phase downstream would otherwise keep simulating a
            // government that no longer holds office, and it did — a president
            // defeated at the polls went on governing for as long as they kept
            // pressing Continue, because the only thing this refused on was removal.
            refuseEnded(campaign);
            // Silence is priced before the world runs, not after. A week's staged
            // documents that the President walked past are the record of a decision
            // not taken, and until this they cost nothing at all: measured over
            // 208-week terms, never answering anything ended with the BEST approval
            // and the LOWEST removal pressure of any policy, which made refusing to
            // govern the strongest way to play. Each unanswered document now charges
            // competence and one class-routed judgment, debits stability, and files a
            // `drift` wire item the country can read. It costs no treasury by
            // construction — money is not what refusing to govern should cost.
            // A document already put off was priced when it was: charging it again on
            // a second press in the same week would bill one silence twice. The same
            // is true of a one-day step: `inactionPacket` stamps a turn-scoped flag
            // marker on every document it charges, and a document that already
            // carries this turn's marker is skipped here too — without this, seven
            // one-day presses inside one quiet week charged the same document up to
            // seven times, because a document with no deadline is never deferred and
            // so was never excluded from the loop by the check above alone.
            return runFrom(campaign, campaign, horizonDays);
        },
        async handOffAndContinue(horizonDays, options) {
            const campaign = requireCampaign(options?.basis);
            refuseEnded(campaign);
            const handed = handOff(campaign, options?.settings);
            if (handed.kept.length === 0)
                return runFrom(campaign, handed.campaign, horizonDays);
            publish({ status: "ready", campaign: handed.campaign, ...carriedStop() });
            return persist(handed.campaign, eventIdsBetween(campaign, handed.campaign));
        },
        async stepClockDay(options) {
            const campaign = requireCampaign();
            refuseEnded(campaign);
            const seated = seatFamilyCases(seatScenarioCases(campaign));
            const run = advanceUntilAttention(seated, { ...advanceOptions(seated), horizonDays: 1 });
            const result = { ...run, campaign: seatFamilyCases(run.campaign) };
            publish({
                status: "ready",
                campaign: result.campaign,
                stop: result.stop,
                stopReason: result.stopReason,
                ambient: result.ambientEvents,
                brief: stopBriefOf(campaign, result),
            });
            // A running tick asks not to save; the day still advanced in memory, and
            // the runner is responsible for the rare safety and exit saves.
            if (options?.persist === false)
                return { eventIds: [], persisted: true };
            return persist(result.campaign, []);
        },
        async saveCampaign() {
            const campaign = requireCampaign();
            return persist(campaign, []);
        },
        async abandon() {
            await saves.clear();
            // Deleting the active slot promotes whatever else is stored, so the shell
            // re-reads the vault rather than assuming it is now empty: abandoning one
            // campaign of several leaves the player in the next one, not in nothing.
            await restore();
        },
        async discard(id) {
            const { activeCampaignId } = await saves.list();
            await saves.delete(id);
            if (id === activeCampaignId)
                await restore();
        },
        saves,
    };
}
