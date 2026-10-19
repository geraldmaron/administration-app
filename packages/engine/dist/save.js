import { ERA_POLARIZATION } from "./polarization.js";
import { withCongressMembers } from "./congress-members.js";
import { repairCases } from "./case-defaults.js";
import { campaignFoundingDate } from "./clock.js";
import { deriveConfirmedRoles } from "./appointments.js";
import { withEconomyRecords, withPublicDebtRebase } from "./economy-records.js";
import { withTypedLocations } from "./commitment-locations.js";
import { withTieLedger } from "./tie-migration.js";
import { STATE_DEMOGRAPHICS } from "@admin/world";
import { foundingCircuitSeats } from "./lower-bench.js";
import { withSplitCasualties } from "./war-attrition.js";
import { withSubjectTaskingsRevalidated } from "./intel-authority.js";
/**
 * v51 retires every earlier save. A campaign founded before it took the oath on
 * a calendar this build no longer keeps, and re-dating one would mean moving
 * every stored date in it, which is a migration that can silently get one
 * wrong. So the readable window is v51 alone: an older save is refused, and the
 * library says why rather than opening a presidency on the wrong calendar.
 * Fields added after v51 are optional and filled here, so the window widens
 * from now on instead of closing again: v52 adds the economy's three kept
 * records, a filing date on feed items and the background mark on the ledger.
 * `docket` is optional on the same version. Absence is the old staging, and
 * this function does not create one — the version bump that pairs it with a
 * new week record is still unmarked against the week the office-day cut ships.
 * `cases` is optional on the same version. A damaged entry is dropped on load.
 * That drop is not recorded as a decline.
 *
 * v53 adds the stored halves of the presidency's next layer, every one of them
 * optional and absent on every earlier save, because absence is the correct
 * reading of one: no tie was broken, no scandal was answered, no acting sits, no
 * governor's term end is on file, and no week of economic history was recorded.
 * `economyHistory` and `feedDigest` read as empty rather than absent, because a
 * reader of either is asking for a series and an empty series is the honest one.
 * `Campaign.rules` and `CausalProvenance.decision` ride the same bump: a campaign
 * that has changed no rule carries no rules block, and a packet that decided
 * nothing stamps no decision. A legacy `godMode` flag is the one field that is
 * not read as absent — it is read as both world rules set, because taking
 * omniscience and immunity away from a campaign that had them on the first load
 * after the update would be a silent loss rather than an honest reading.
 * v53 also drops the pressure regime, which was a stored composite nothing read:
 * a save that carries one loads without it and round-trips without it.
 *
 * v54 adds the stored halves of a world that moves on its own — markets,
 * munitions, foreign seats and coverage, engagement, the opponent, releases,
 * a nation's runtime memberships, and three fields on a war and one on a
 * commitment — every one optional and left absent here, because absence is
 * what an earlier save means by each: nothing has moved from its founding
 * level, no stock has been drawn, every capital keeps its table incumbent, and
 * no war was carried into the oath. A loaded campaign keeps the world it was
 * founded in; a v53 save gains no carried war on the way in.
 *
 * v55 adds the weekly record of state approval. It opens empty on an older
 * save, like `economyHistory`, because the save kept no such weeks and a
 * reconstructed past would be invented; it records from the next closed week.
 *
 * The race, sex, nativity, disability and veteran cohort axes ride v56 as optional:
 * `withDemographics` fills them from the authored table on an older save.
 *
 * v56 types where forces stand. A commitment's theater is a zone now, so the
 * two free-text theaters earlier builds wrote read through the world's zone
 * table; a base saved under a composite label is split into the installations
 * it named, the stored commitment keeping its id; and a deployment saved with
 * no location gains the one it would be given if committed today. Nothing is
 * refused: every v51 to v55 save still reads.
 *
 * v57 adds the departments' case work, `services`. It is optional and left
 * absent here: an earlier save kept no service weeks, so none is written on
 * load. The service phase opens each on the save's next week, on the same
 * opening a new campaign takes, and stamps that week as where its record begins.
 *
 * v58 adds the departments' grant programs, `projects`, on the same terms:
 * optional, absent on an earlier save, opened by the project phase on the
 * save's next week with the pipeline a new campaign assumes.
 *
 * v59 adds two observed records, `opinionRecord` (the six judgments, every
 * cohort cell and the three coalitions) and `relationsRecord` (trust each way
 * and tension between the United States and every government). Both are
 * optional and left absent here: an earlier save never observed those weeks,
 * and a reading derived from today's state would not be what they were. Each
 * opens at the save's next close and stamps the turn it opened on, so a screen
 * can say the record starts at load rather than at the oath.
 *
 * v60 adds `cohortSensitivity`, each group's jittered geographic sensitivity
 * drawn at founding, and an optional `where` on a cohort strain, the states a
 * routed act reached. Both are optional and left absent here: an older save
 * reads the unjittered sourced estimates, and a strain it kept lands on its
 * group alike everywhere, which is what that save's routing recorded.
 *
 * v61 adds `cohortBaseline`, each group's partisan starting point drawn at
 * founding. Optional and left absent here: an older save reads the sourced
 * shares unjittered, so its groups start apart on the published figures rather
 * than on a draw it never made.
 *
 * v62 adds `forecasts`, the staff forecasts the President acted on. Optional
 * and left absent here: an older save filed none, and no forecast is invented
 * for a decision already taken.
 *
 * v63 moves a Hill member's warmth and a budget negotiation's promise onto the
 * person they belong to (`withTieLedger`): each figure's disposition becomes its
 * holder's rapport, unchanged, and each promise a favor the President owes the
 * member holding that post. A v62 or earlier save is migrated on load; from v63
 * neither old field is written.
 * v64 retains issued intelligence products as dated notes after a tasking
 * closes. Older products stay generic notes; loading does not manufacture
 * findings, confidence or a sharing history that the save never held.
 *
 * v65 keeps where at home a story happened: an optional `place` on a scenario
 * family run and an optional `flagPlaces` keyed by authored flag. Both are left
 * absent here. An earlier save recorded no place, so an arc it opened draws its
 * next scene's place the way it always did rather than being given one.
 *
 * v66 reads the country as five partisan blocs. `PublicMood.polarization` is
 * now a stock at the era's anchor plus what this administration added, not a
 * 0..1 figure that decayed toward zero, so an older save's figure means
 * nothing on the new scale and is rebased to the anchor: the division that
 * save carried is forgotten rather than misread. `electorateShares`,
 * `salienceMemory` and `RemovalArc.inability` are optional and left absent: an
 * older save reads an even country, every live story as newly broken, and no
 * inability watch. The other optional fields this version adds read as empty
 * when absent.
 *
 * v67 ties every American tariff to the statute it was imposed under. A tariff
 * measure gains an optional `statute`, and the trade state gains optional
 * `findings`, the investigations ordered and what each found. Both are left
 * absent: an older save's tariffs keep the authority they were signed under,
 * and no investigation was ever ordered.
 */
export const CURRENT_SCHEMA_VERSION = 67;
export const MIN_READABLE_SCHEMA_VERSION = 51;
export const SUPPORTED_SCHEMA_VERSIONS = [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67];
function isNormalized(campaign) {
    return (campaign.foundingDate !== undefined &&
        campaign.issuedActs !== undefined &&
        campaign.judiciary !== undefined &&
        campaign.pledges !== undefined &&
        campaign.founding.platform !== undefined &&
        campaign.founding.staff !== undefined &&
        campaign.macro !== undefined &&
        campaign.books !== undefined &&
        campaign.debtLimit !== undefined &&
        campaign.economyHistory !== undefined &&
        campaign.feedDigest !== undefined &&
        campaign.stateApprovalHistory !== undefined);
}
/**
 * Drop a stored pressure regime.
 *
 * The four-level reading was a composite recomputed every turn and read by
 * nothing — no rule, no screen, no benchmark — so it was deleted. This build
 * reads schema 51 upward and no version it reads has a regime worth keeping, so
 * the loader strips the key instead of letting a shape no type describes and no
 * writer maintains back onto the campaign.
 */
function withoutRegime(campaign) {
    if (!("regime" in campaign))
        return campaign;
    const { regime: _regime, ...rest } = campaign;
    return rest;
}
function withDefaults(campaign) {
    if (isNormalized(campaign))
        return campaign;
    return {
        ...campaign,
        founding: { ...campaign.founding, platform: campaign.founding.platform ?? [], staff: campaign.founding.staff ?? {} },
        foundingDate: campaign.foundingDate ?? campaignFoundingDate(campaign),
        issuedActs: campaign.issuedActs ?? {},
        judiciary: campaign.judiciary ?? { cases: [] },
        pledges: campaign.pledges ?? [],
        economyHistory: campaign.economyHistory ?? [],
        feedDigest: campaign.feedDigest ?? [],
        stateApprovalHistory: campaign.stateApprovalHistory ?? [],
    };
}
function withIntelligenceArchive(campaign) {
    const intelligence = campaign.security.intelligence;
    if (intelligence.archive !== undefined && intelligence.shares !== undefined)
        return campaign;
    return { ...campaign, security: { ...campaign.security, intelligence: {
                ...intelligence,
                archive: intelligence.archive ?? Object.values(intelligence.products),
                shares: intelligence.shares ?? [],
            } } };
}
/**
 * A campaign marked before the rules layer existed meant three things by one
 * flag: it could not be ranked, it saw everything, and it could not be removed.
 * Two of those are rules now, so a legacy save is read as having both of them
 * set — anything else would silently take omniscience and immunity away from a
 * campaign that had them, on the first load after the update.
 *
 * No suspension is written here. Whether this device has paid is a question
 * only the app shell can ask, and it asks it after the load.
 */
function withLegacyGodRules(campaign) {
    if (campaign.godMode?.enabled !== true || campaign.rules !== undefined)
        return campaign;
    const date = campaign.calendar;
    const log = [
        { kind: "set", rule: "information.omniscient", value: true, date },
        { kind: "set", rule: "removal.immune", value: true, date },
    ];
    const rules = { values: { "information.omniscient": true, "removal.immune": true }, log };
    return { ...campaign, rules };
}
/**
 * An earlier save carries a state's five hand-authored cohort axes and none of
 * the race, sex, nativity, disability or veteran ones. Those are composition, not
 * history, so they open from the authored Census-based table, unsampled: the
 * save's own five axes are left exactly as they were. A state that already has
 * them, sampled or not, is untouched, which makes this idempotent.
 */
function withDemographics(campaign) {
    let changed = false;
    const states = Object.fromEntries(Object.entries(campaign.states).map(([id, runtime]) => {
        const cohorts = runtime.base.character.cohorts;
        const authored = STATE_DEMOGRAPHICS[id];
        if (!authored || Object.keys(authored).every((axis) => cohorts[axis] !== undefined))
            return [id, runtime];
        changed = true;
        const filled = { ...authored, ...cohorts };
        return [id, { ...runtime, base: { ...runtime.base, character: { ...runtime.base.character, cohorts: filled } } }];
    }));
    return changed ? { ...campaign, states: states } : campaign;
}
/**
 * Absent fields are filled first and derived ones last, because a derivation
 * reads the campaign in the shape this build gives it.
 */
export function normalizeCampaign(campaign) {
    const normalized = withSubjectTaskingsRevalidated(withSplitCasualties(withCongressMembers(repairCases(deriveConfirmedRoles(withEconomyRecords(withTypedLocations(withLegacyGodRules(withDemographics(withDefaults(withIntelligenceArchive(withoutRegime(campaign))))))))))));
    const missing = Object.fromEntries(Object.entries(foundingCircuitSeats(normalized.seed, campaignFoundingDate(normalized).year))
        .filter(([id]) => !normalized.institutions[id]));
    return Object.keys(missing).length ? { ...normalized, institutions: { ...missing, ...normalized.institutions } } : normalized;
}
export function createSave(campaign) {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, campaign: normalizeCampaign(campaign) };
}
function isSaveShaped(raw) {
    return typeof raw === "object" && raw !== null && "schemaVersion" in raw && "campaign" in raw;
}
function withEraPolarization(campaign) {
    return { ...campaign, player: { ...campaign.player, opinion: { ...campaign.player.opinion, polarization: ERA_POLARIZATION } } };
}
export function loadSave(raw) {
    if (!isSaveShaped(raw)) {
        throw new Error("Save file is malformed: expected an object with schemaVersion and campaign fields");
    }
    if (raw.schemaVersion < MIN_READABLE_SCHEMA_VERSION || raw.schemaVersion > CURRENT_SCHEMA_VERSION) {
        throw new Error(`Save file is schema v${raw.schemaVersion}, this build reads v${MIN_READABLE_SCHEMA_VERSION}–v${CURRENT_SCHEMA_VERSION}. ` +
            "There is no migration path for incompatible saves — start a new campaign, or load this save with the matching game version.");
    }
    // Every v51 save was written while the United States' debt was kept gross;
    // v52 keeps debt held by the public, so a v51 stock is rescaled on the way in.
    const rebased = raw.schemaVersion === 51 ? withPublicDebtRebase(raw.campaign) : raw.campaign;
    const tied = raw.schemaVersion < 63 ? withTieLedger(rebased) : rebased;
    const campaign = raw.schemaVersion < 66 ? withEraPolarization(tied) : tied;
    return normalizeCampaign(campaign);
}
